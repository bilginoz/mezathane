export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

/**
 * KVKK Madde 7 — Unutulma Hakkı
 * Kullanıcının kişisel verilerini anonimleştirir.
 * 
 * Güvenlik kontrolleri:
 * 1) Şifre doğrulama
 * 2) Admin hesabı silinemez
 * 3) Aktif müzayedede teklif varsa red
 * 4) Ödenmemiş borç varsa red
 * 5) Açık anlaşmazlık varsa red
 * 
 * Yasal saklama:
 * - TC Kimlik No şifreli olarak 10 yıl saklanır (TTK m.82)
 * - Teklif, ödeme, cari ekstre kayıtları korunur
 * - Kişisel tanımlayıcı bilgiler (ad, adres, telefon) anonimleştirilir
 * - deletedAt + dataRetentionUntil tarihleri kaydedilir
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    const userId = session.user.id;

    let body: any = {};
    try { body = await request.json(); } catch {}
    const { confirmPassword } = body ?? {};

    if (!confirmPassword) {
      return NextResponse.json({ error: 'Onay için şifrenizi girmelisiniz' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // Şifre doğrulama
    const bcrypt = await import('bcryptjs');
    const passwordMatch = await bcrypt.compare(confirmPassword, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Şifre hatalı' }, { status: 403 });
    }

    // Admin hesabı silinemez
    if (user.role === 'ADMIN') {
      return NextResponse.json({ error: 'Admin hesabı silinemez' }, { status: 403 });
    }

    // Aktif müzayedede teklifi var mı?
    const activeBids = await prisma.bid.count({
      where: {
        userId,
        lot: {
          auction: {
            status: { in: ['ACTIVE', 'LIVE'] }
          }
        }
      }
    });
    if (activeBids > 0) {
      return NextResponse.json(
        { error: 'Aktif müzayedede teklifiniz bulunmaktadır. Müzayede tamamlandıktan sonra hesabınızı silebilirsiniz.' },
        { status: 400 }
      );
    }

    // Ödenmemiş borcu var mı?
    const unpaidPayments = await prisma.payment.count({
      where: {
        userId,
        status: 'PENDING'
      }
    });
    if (unpaidPayments > 0) {
      return NextResponse.json(
        { error: 'Ödenmemiş borcunuz bulunmaktadır. Borçlarınızı ödedikten sonra hesabınızı silebilirsiniz.' },
        { status: 400 }
      );
    }

    // Açık anlaşmazlığı var mı? (KVKK + mahkeme güvenliği)
    const openDisputes = await prisma.dispute.count({
      where: {
        OR: [
          { reporterId: userId },
          { againstId: userId }
        ],
        status: { in: ['OPEN', 'IN_REVIEW'] }
      }
    });
    if (openDisputes > 0) {
      return NextResponse.json(
        { error: 'Açık veya devam eden anlaşmazlığınız bulunmaktadır. Anlaşmazlık çözüldükten sonra hesabınızı silebilirsiniz.' },
        { status: 400 }
      );
    }

    // Yasal saklama süresi: 10 yıl (TTK m.82 — ticari defterler)
    const now = new Date();
    const retentionDate = new Date(now);
    retentionDate.setFullYear(retentionDate.getFullYear() + 10);

    // Anonimleştirme işlemi
    const anonymizedEmail = `deleted_${userId.slice(-8)}@anon.mezathane.tr`;
    const anonymizedName = 'Silinmiş Kullanıcı';

    await prisma.$transaction(async (tx) => {
      // 1) Oturumları sil
      await tx.session.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });

      // 2) Watchlist & bildirim tercihleri sil (kişisel tercih, yasal değil)
      await tx.watchlist.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.notificationPreference.deleteMany({ where: { userId } });

      // 3) Proxy bid'leri sil (aktif teklif yok zaten)
      await tx.proxyBid.deleteMany({ where: { userId } });

      // 4) Kullanıcı verisini anonimleştir (soft delete)
      // NOT: tcKimlikNo ŞİFRELİ OLARAK KORUNUYOR — TTK m.82 gereği 10 yıl
      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          fullName: anonymizedName,
          phone: null,
          // tcKimlikNo KORUNUYOR — şifreli, mahkeme/vergi için gerekli
          address: null,
          shippingAddress: null,
          billingAddress: null,
          city: null,
          district: null,
          postalCode: null,
          companyName: null,
          taxOffice: null,
          taxNumber: null,
          avatarUrl: null,
          resetToken: null,
          resetTokenExpiry: null,
          emailVerifyCode: null,
          emailVerifyExpiry: null,
          password: 'DELETED',
          isActive: false,
          isEmailVerified: false,
          isPhoneVerified: false,
          deletedAt: now,
          dataRetentionUntil: retentionDate,
        }
      });

      // 5) Satıcı profili varsa anonimleştir
      const sellerProfile = await tx.sellerProfile.findUnique({ where: { userId } });
      if (sellerProfile) {
        await tx.sellerProfile.update({
          where: { userId },
          data: {
            companyName: 'Silinmiş Satıcı',
            companyAddress: null,
            // taxOffice, taxNumber KORUNUYOR — vergi kaydı
            mersisNo: null,
            iban: null,
            taxDocumentUrl: null,
            taxDocumentPath: null,
            logoUrl: null,
            description: null,
            status: 'REJECTED',
          }
        });
      }
    });

    console.log(`[KVKK] User ${userId} account anonymized at ${now.toISOString()}. Data retention until ${retentionDate.toISOString()} (TTK m.82).`);

    return NextResponse.json({
      success: true,
      message: 'Hesabınız başarıyla silindi. Kişisel verileriniz KVKK kapsamında anonimleştirilmiştir. Yasal yükümlülükler gereği bazı ticari kayıtlar (fatura, ödeme) yasal saklama süresi boyunca korunacaktır.'
    });
  } catch (error: any) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { error: 'Hesap silme işlemi sırasında bir hata oluştu' },
      { status: 500 }
    );
  }
}
