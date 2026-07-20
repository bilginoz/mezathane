import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Admin tüm talepleri görür
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const requests = await prisma.fieldChangeRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, role: true, tcKimlikNo: true },
        },
      },
    });

    // SellerProfile bilgilerini ayrıca çek
    const sellerUserIds = requests.filter(r => r.modelName === 'SellerProfile').map(r => r.userId);
    const sellerProfiles = sellerUserIds.length > 0
      ? await prisma.sellerProfile.findMany({ where: { userId: { in: sellerUserIds } }, select: { userId: true, companyName: true } })
      : [];
    const sellerMap = Object.fromEntries(sellerProfiles.map(s => [s.userId, s]));

    const enriched = requests.map(r => ({
      ...r,
      sellerProfile: sellerMap[r.userId] || null,
    }));

    return NextResponse.json({ requests: enriched });
  } catch (error) {
    console.error('Admin FieldChangeRequest GET error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Admin onay/red
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const body = await req.json();
    const { requestId, action, adminNote } = body; // action: 'APPROVED' | 'REJECTED'

    if (!requestId || !['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz parametreler' }, { status: 400 });
    }

    const changeReq = await prisma.fieldChangeRequest.findUnique({ where: { id: requestId } });
    if (!changeReq) return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 });
    if (changeReq.status !== 'PENDING') return NextResponse.json({ error: 'Bu talep zaten işlenmiş' }, { status: 400 });

    // Onaylandıysa ilgili modelde güncelle
    if (action === 'APPROVED') {
      if (changeReq.modelName === 'SellerProfile') {
        const profile = await prisma.sellerProfile.findUnique({ where: { userId: changeReq.userId } });
        if (profile) {
          const updateData: any = {};
          updateData[changeReq.fieldName] = changeReq.requestedValue;
          await prisma.sellerProfile.update({ where: { id: profile.id }, data: updateData });
        }
      } else if (changeReq.modelName === 'User') {
        const updateData: any = {};
        updateData[changeReq.fieldName] = changeReq.requestedValue;
        await prisma.user.update({ where: { id: changeReq.userId }, data: updateData });
      }
    }

    // Talep durumunu güncelle
    const updated = await prisma.fieldChangeRequest.update({
      where: { id: requestId },
      data: {
        status: action,
        adminNote: adminNote || null,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });

    // Kullanıcıya bildirim gönder
    const statusText = action === 'APPROVED' ? 'onaylandı' : 'reddedildi';
    const fieldLabels: Record<string, string> = {
      companyName: 'Firma Unvanı', taxOffice: 'Vergi Dairesi', taxNumber: 'Vergi No',
      mersisNo: 'Mersis No', iban: 'IBAN', taxDocumentUrl: 'Vergi Levhası', tcKimlikNo: 'TC Kimlik No',
      fullName: 'Ad Soyad', phone: 'Telefon', address: 'Adres',
      shippingAddress: 'Gönderim Adresi', billingAddress: 'Fatura Adresi',
      city: 'İl', district: 'İlçe', postalCode: 'Posta Kodu', companyAddress: 'Firma Adresi',
    };
    const label = fieldLabels[changeReq.fieldName] || changeReq.fieldName;

    await prisma.notification.create({
      data: {
        userId: changeReq.userId,
        title: `Değişiklik Talebi ${action === 'APPROVED' ? 'Onaylandı' : 'Reddedildi'}`,
        message: `"${label}" alanı için değişiklik talebiniz ${statusText}.${adminNote ? ' Not: ' + adminNote : ''}`,
        type: 'SYSTEM',
        link: action === 'APPROVED' ? undefined : undefined,
      },
    });

    return NextResponse.json({ request: updated });
  } catch (error) {
    console.error('Admin FieldChangeRequest PATCH error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
