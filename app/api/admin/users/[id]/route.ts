export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// Admin: Bir alıcının/kullanıcının detayı — kazandığı lotlar, ödeme durumları, teklif geçmişi
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, fullName: true, phone: true, role: true,
        isActive: true, createdAt: true, memberNumber: true, city: true, district: true,
        shippingAddress: true, address: true,
        isCompany: true, companyName: true,
        sellerProfile: { select: { companyName: true, status: true } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // Kazanılan / satın alınan lotlar (winnerId = bu kullanıcı)
    const wonLots = await prisma.lot.findMany({
      where: { winnerId: userId },
      select: {
        id: true, lotNumber: true, title: true, status: true,
        soldPrice: true, currentPrice: true, updatedAt: true,
        auction: { select: { id: true, title: true, paymentDays: true } },
        images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { imageUrl: true } },
        payments: {
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true, status: true, amount: true, dueDate: true, paidAt: true,
            buyerPaymentReceived: true, adminNotes: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const purchases = wonLots.map((lot) => {
      const payment = lot.payments?.[0] ?? null;
      const salePrice = lot.soldPrice ?? lot.currentPrice ?? 0;
      const isPaid = payment?.buyerPaymentReceived || payment?.status === 'PAID';
      return {
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        title: lot.title,
        image: lot.images?.[0]?.imageUrl ?? null,
        auctionId: lot.auction?.id ?? null,
        auctionTitle: lot.auction?.title ?? '-',
        lotStatus: lot.status,
        salePrice,
        paymentId: payment?.id ?? null,
        paymentStatus: payment?.status ?? 'PENDING',
        isPaid,
        dueDate: payment?.dueDate ?? null,
        paidAt: payment?.paidAt ?? null,
        soldAt: lot.updatedAt,
        adminNotes: payment?.adminNotes ?? null,
      };
    });

    // Özet istatistikler
    const totalBids = await prisma.bid.count({ where: { userId } });
    const wonCount = wonLots.filter((l) => l.status === 'SOLD').length;
    const unpaidCount = purchases.filter((p) => p.lotStatus === 'SOLD' && !p.isPaid).length;
    const totalSpent = purchases
      .filter((p) => p.isPaid)
      .reduce((s, p) => s + (p.salePrice || 0), 0);

    // Alıcı cari hesabı — kazanılan (SOLD) lotlar üzerinden
    const soldPurchases = purchases.filter((p) => p.lotStatus === 'SOLD');
    const now = new Date();
    const totalPurchased = soldPurchases.reduce((s, p) => s + (p.salePrice || 0), 0);
    const totalPaid = soldPurchases.filter((p) => p.isPaid).reduce((s, p) => s + (p.salePrice || 0), 0);
    const pendingDebt = soldPurchases.filter((p) => !p.isPaid).reduce((s, p) => s + (p.salePrice || 0), 0);
    const overduePurchases = soldPurchases.filter(
      (p) => !p.isPaid && p.dueDate && new Date(p.dueDate) < now
    );
    const overdueAmount = overduePurchases.reduce((s, p) => s + (p.salePrice || 0), 0);
    const cari = {
      soldCount: soldPurchases.length,
      totalPurchased,
      totalPaid,
      pendingDebt,
      overdueAmount,
      overdueCount: overduePurchases.length,
    };

    // Son teklifler
    const recentBids = await prisma.bid.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        id: true, amount: true, isWinning: true, createdAt: true,
        lot: {
          select: {
            id: true, lotNumber: true, title: true, status: true,
            auction: { select: { title: true } },
          },
        },
      },
    });

    return NextResponse.json({
      user,
      stats: { totalBids, wonCount, unpaidCount, totalSpent },
      cari,
      purchases,
      recentBids: recentBids.map((b) => ({
        id: b.id,
        amount: b.amount,
        isWinning: b.isWinning,
        createdAt: b.createdAt,
        lotId: b.lot?.id ?? null,
        lotNumber: b.lot?.lotNumber ?? null,
        lotTitle: b.lot?.title ?? '-',
        lotStatus: b.lot?.status ?? null,
        auctionTitle: b.lot?.auction?.title ?? '-',
      })),
    });
  } catch (error: any) {
    console.error('Admin user detail error:', error);
    return NextResponse.json({ error: 'Kullanıcı detayı yüklenemedi' }, { status: 500 });
  }
}
