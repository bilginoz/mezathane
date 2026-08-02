export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { createInAppNotification } from '@/lib/notifications';
import { AUCTION_RIGHT_VALIDITY_DAYS, AUCTION_RIGHT_UNLIMITED_DAYS } from '@/lib/auction-rights';

// Admin: müzayede hakkı satın alma taleplerini listeler (varsayılan: bekleyenler önce).
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // PENDING | APPROVED | REJECTED | (hepsi)
    const where: any = {};
    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)) where.status = status;

    const purchases = await prisma.auctionRightPurchase.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      include: {
        seller: { select: { id: true, companyName: true, user: { select: { fullName: true, email: true } } } },
      },
    });
    const pendingCount = await prisma.auctionRightPurchase.count({ where: { status: 'PENDING' } });
    return NextResponse.json({ purchases, pendingCount });
  } catch (e) {
    console.error('admin auction-rights GET error', e);
    return NextResponse.json({ error: 'Yüklenemedi' }, { status: 500 });
  }
}

// Admin: bir talebi onaylar (hakları yükler, 60 gün geçerli) veya reddeder.
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }
  const adminId = (session.user as any).id as string;
  try {
    const body = await request.json();
    const { id, action, adminNote } = body as { id: string; action: 'approve' | 'reject'; adminNote?: string };
    if (!id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    }

    const purchase = await prisma.auctionRightPurchase.findUnique({
      where: { id },
      include: { seller: { select: { userId: true } } },
    });
    if (!purchase) return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 });
    if (purchase.status !== 'PENDING') {
      return NextResponse.json({ error: 'Bu talep zaten sonuçlandırılmış' }, { status: 400 });
    }

    if (action === 'approve') {
      const isUnlimited = (purchase as any).planType === 'UNLIMITED_MONTHLY';
      const validityDays = isUnlimited ? AUCTION_RIGHT_UNLIMITED_DAYS : AUCTION_RIGHT_VALIDITY_DAYS;
      const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);
      await prisma.auctionRightPurchase.update({
        where: { id },
        data: {
          status: 'APPROVED',
          remaining: purchase.quantity,
          expiresAt,
          approvedAt: new Date(),
          approvedById: adminId,
          adminNote: adminNote?.slice(0, 500) ?? null,
        },
      });
      await createInAppNotification({
        userId: purchase.seller.userId,
        title: isUnlimited ? 'Aylık Sınırsız Paketiniz onaylandı' : 'Müzayede haklarınız onaylandı',
        message: isUnlimited
          ? `Sınırsız müzayede açma hakkınız ${validityDays} gün süreyle aktif edildi.`
          : `${purchase.quantity} müzayede hakkı hesabınıza tanımlandı. ${validityDays} gün geçerlidir.`,
        type: 'AUCTION_RIGHT',
        link: '/satici/haklarim',
      });
    } else {
      await prisma.auctionRightPurchase.update({
        where: { id },
        data: { status: 'REJECTED', adminNote: adminNote?.slice(0, 500) ?? null },
      });
      await createInAppNotification({
        userId: purchase.seller.userId,
        title: 'Müzayede hakkı talebiniz reddedildi',
        message: adminNote ? `Sebep: ${adminNote}` : 'Talebiniz reddedildi. Detay için bizimle iletişime geçebilirsiniz.',
        type: 'AUCTION_RIGHT',
        link: '/satici/haklarim',
      });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('admin auction-rights PATCH error', e);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
