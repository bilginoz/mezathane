export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { getSellerRightBalance, AUCTION_RIGHT_UNIT_PRICE, AUCTION_RIGHT_VALIDITY_DAYS, AUCTION_RIGHT_MAX_QTY } from '@/lib/auction-rights';

async function getSeller(userId: string) {
  return prisma.sellerProfile.findUnique({
    where: { userId },
    select: { id: true, status: true, companyName: true, user: { select: { id: true, email: true, fullName: true } } },
  });
}

// Satıcının hak bakiyesi, geçmiş talepleri ve havale bilgileri.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const seller = await getSeller(userId);
  if (!seller) return NextResponse.json({ error: 'Satıcı profili yok' }, { status: 403 });

  try {
    const [{ balance, soonestExpiry }, purchases, settings] = await Promise.all([
      getSellerRightBalance(seller.id),
      prisma.auctionRightPurchase.findMany({
        where: { sellerId: seller.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.siteSettings.findUnique({
        where: { id: 'default' },
        select: { bankName: true, bankAccountHolder: true, bankIban: true },
      }),
    ]);

    return NextResponse.json({
      balance,
      soonestExpiry,
      purchases,
      unitPrice: AUCTION_RIGHT_UNIT_PRICE,
      validityDays: AUCTION_RIGHT_VALIDITY_DAYS,
      maxQty: AUCTION_RIGHT_MAX_QTY,
      bankInfo: settings ?? null,
    });
  } catch (e) {
    console.error('auction-rights GET error', e);
    return NextResponse.json({ error: 'Yüklenemedi' }, { status: 500 });
  }
}

// Yeni hak satın alma talebi oluşturur (PENDING). Ödeme havale ile yapılır, admin onaylar.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const seller = await getSeller(userId);
  if (!seller) return NextResponse.json({ error: 'Satıcı profili yok' }, { status: 403 });
  if (seller.status !== 'APPROVED') return NextResponse.json({ error: 'Onaylı satıcı olmalısınız' }, { status: 403 });

  try {
    const body = await request.json();
    const quantity = Math.floor(Number(body.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > AUCTION_RIGHT_MAX_QTY) {
      return NextResponse.json({ error: `Adet 1 ile ${AUCTION_RIGHT_MAX_QTY} arasında olmalı` }, { status: 400 });
    }
    const sellerNote = typeof body.sellerNote === 'string' ? body.sellerNote.slice(0, 500) : null;

    const total = quantity * AUCTION_RIGHT_UNIT_PRICE;
    const purchase = await prisma.auctionRightPurchase.create({
      data: {
        sellerId: seller.id,
        quantity,
        unitPrice: AUCTION_RIGHT_UNIT_PRICE,
        totalAmount: total,
        status: 'PENDING',
        remaining: 0,
        sellerNote,
      },
    });
    const ref = `MZH-${purchase.id.slice(-8).toUpperCase()}`;

    // Bildirimler (anlık) — admin başında beklemesin diye.
    try {
      const { createInAppNotification } = await import('@/lib/notifications');
      // 1) Tüm admin'lere uygulama içi bildirim
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
      await Promise.all(admins.map((a: any) => createInAppNotification({
        userId: a.id,
        title: '🎫 Yeni Müzayede Hakkı talebi',
        message: `${seller.companyName ?? 'Bir satıcı'} ${quantity} hak (${total.toLocaleString('tr-TR')} ₺) talep etti. Havale bekleniyor. Ref: ${ref}`,
        type: 'ADMIN',
        link: '/admin/muzayede-haklari',
      })));

      // 2) Satıcıya ödeme bilgisi e-postası (havale detayları + referans + link)
      const bank = await prisma.siteSettings.findUnique({
        where: { id: 'default' },
        select: { bankName: true, bankAccountHolder: true, bankIban: true },
      });
      const email = seller.user?.email;
      if (email) {
        const appUrl = process.env.NEXTAUTH_URL || 'https://mezathane.tr';
        const bankRows = bank?.bankIban
          ? `${bank.bankName ? `<tr><td style="padding:4px 10px;color:#9ca3af">Banka</td><td style="padding:4px 10px;color:#e5e7eb">${bank.bankName}</td></tr>` : ''}
             ${bank.bankAccountHolder ? `<tr><td style="padding:4px 10px;color:#9ca3af">Hesap Sahibi</td><td style="padding:4px 10px;color:#e5e7eb">${bank.bankAccountHolder}</td></tr>` : ''}
             <tr><td style="padding:4px 10px;color:#9ca3af">IBAN</td><td style="padding:4px 10px;color:#e5e7eb;font-family:monospace">${bank.bankIban}</td></tr>`
          : `<tr><td colspan="2" style="padding:4px 10px;color:#e5e7eb">Havale bilgileri panelinizde "Haklarım" sayfasında gösterilir.</td></tr>`;
        const { sendEmail } = await import('@/lib/mailer');
        await sendEmail({
          to: email,
          subject: `Müzayede Hakkı ödemesi — ${total.toLocaleString('tr-TR')} ₺ (Ref: ${ref})`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e7eb">
            <div style="background:linear-gradient(135deg,#1a1a2e,#0a0a0a);padding:24px;text-align:center;border-bottom:2px solid #d4af37">
              <h1 style="color:#d4af37;margin:0;font-size:20px">🎫 Müzayede Hakkı Talebiniz Alındı</h1>
            </div>
            <div style="padding:24px">
              <p>Merhaba ${seller.user?.fullName ?? ''},</p>
              <p><strong>${quantity} adet</strong> müzayede hakkı talebiniz oluşturuldu. Toplam tutar:
                 <strong style="color:#d4af37">${total.toLocaleString('tr-TR')} ₺</strong></p>
              <p>Aşağıdaki hesaba havale/EFT yaparken <strong>açıklama kısmına referans numaranızı</strong> yazın:</p>
              <div style="background:#1a1a2e;border:1px solid #d4af37;border-radius:8px;padding:8px;margin:16px 0">
                <table style="width:100%;border-collapse:collapse;font-size:14px">
                  ${bankRows}
                  <tr><td style="padding:4px 10px;color:#9ca3af">Tutar</td><td style="padding:4px 10px;color:#d4af37;font-weight:bold">${total.toLocaleString('tr-TR')} ₺</td></tr>
                  <tr><td style="padding:4px 10px;color:#9ca3af">Referans</td><td style="padding:4px 10px;color:#e5e7eb;font-family:monospace">${ref}</td></tr>
                </table>
              </div>
              <p style="color:#9ca3af;font-size:13px">Havaleyi yaptıktan sonra panelinizden <strong>"Ödemeyi Yaptım"</strong> butonuna basın; ekibimiz onaylayınca haklarınız hesabınıza tanımlanır.</p>
              <div style="text-align:center;margin:24px 0">
                <a href="${appUrl}/satici/haklarim" style="display:inline-block;background:#d4af37;color:#000;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Haklarım Sayfası</a>
              </div>
            </div>
          </div>`,
        });
      }
    } catch (notifyErr) {
      console.error('auction-rights POST notify error', notifyErr); // bildirim hatası talebi bozmasın
    }

    return NextResponse.json({ success: true, purchase });
  } catch (e) {
    console.error('auction-rights POST error', e);
    return NextResponse.json({ error: 'Talep oluşturulamadı' }, { status: 500 });
  }
}

// Satıcı "Ödemeyi Yaptım" der → admin'e anlık bildirim.
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const seller = await getSeller(userId);
  if (!seller) return NextResponse.json({ error: 'Satıcı profili yok' }, { status: 403 });

  try {
    const body = await request.json();
    if (body.action !== 'report_payment' || !body.purchaseId) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    }
    const purchase = await prisma.auctionRightPurchase.findFirst({
      where: { id: body.purchaseId, sellerId: seller.id },
    });
    if (!purchase) return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 });
    if (purchase.status !== 'PENDING') {
      return NextResponse.json({ error: 'Bu talep zaten sonuçlanmış' }, { status: 400 });
    }
    await prisma.auctionRightPurchase.update({
      where: { id: purchase.id },
      data: { paymentReportedAt: new Date() },
    });
    const ref = `MZH-${purchase.id.slice(-8).toUpperCase()}`;
    try {
      const { createInAppNotification } = await import('@/lib/notifications');
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
      await Promise.all(admins.map((a: any) => createInAppNotification({
        userId: a.id,
        title: '💳 Hak ödemesi bildirildi',
        message: `${seller.companyName ?? 'Bir satıcı'} "${ref}" için ödemeyi yaptığını bildirdi (${purchase.totalAmount.toLocaleString('tr-TR')} ₺). Hesabı kontrol edip onaylayın.`,
        type: 'ADMIN',
        link: '/admin/muzayede-haklari',
      })));
    } catch (e) {
      console.error('auction-rights report_payment notify error', e);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('auction-rights PATCH error', e);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
