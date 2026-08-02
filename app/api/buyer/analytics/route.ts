export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;

    // ====== 1) Güven puanı — teklif engelinde kullanılan aynı mantık (bkz. api/bids/route.ts) ======
    const [paidCount, pendingPayments, ps] = await Promise.all([
      prisma.payment.count({ where: { userId, status: 'PAID' } }),
      prisma.payment.findMany({ where: { userId, status: 'PENDING', buyerPaymentReceived: false }, select: { totalAmount: true } }),
      prisma.platformSettings.findFirst(),
    ]);
    const trusted = paidCount > 0;
    const outstandingCount = pendingPayments.length;
    const outstandingAmount = pendingPayments.reduce((s, p) => s + (p.totalAmount || 0), 0);
    const countLimit = trusted ? (ps?.trustedUserMaxUnpaidCount ?? 10) : (ps?.newUserMaxUnpaidCount ?? 3);
    const tlLimit = trusted ? (ps?.trustedUserOutstandingLimit ?? 500000) : (ps?.newUserOutstandingLimit ?? 50000);

    // ====== 2) Kazanma oranı + kaçırma farkı ======
    // Kullanıcının teklif verdiği her lot için kendi en yüksek teklifini bul.
    const myBids = await prisma.bid.groupBy({
      by: ['lotId'],
      where: { userId },
      _max: { amount: true },
    });
    const biddedLotIds = myBids.map((b) => b.lotId);
    const myMaxByLot = new Map(myBids.map((b) => [b.lotId, b._max.amount ?? 0]));

    const biddedLots = biddedLotIds.length > 0 ? await prisma.lot.findMany({
      where: { id: { in: biddedLotIds } },
      select: {
        id: true, lotNumber: true, title: true, status: true, soldPrice: true,
        estimatedPrice: true, winnerId: true,
        auction: { select: { title: true } },
      },
    }) : [];

    const finished = biddedLots.filter((l) => l.status === 'SOLD' || l.status === 'UNSOLD');
    const won = finished.filter((l) => l.status === 'SOLD' && l.winnerId === userId);
    const lost = finished.filter((l) => l.status === 'SOLD' && l.winnerId !== userId);
    const winRatePct = finished.length > 0 ? Math.round((won.length / finished.length) * 1000) / 10 : 0;

    const closeLosses = lost
      .map((l) => {
        const myMax = myMaxByLot.get(l.id) ?? 0;
        const missAmount = Math.max(0, (l.soldPrice ?? 0) - myMax);
        const missPct = l.soldPrice ? Math.round((missAmount / l.soldPrice) * 1000) / 10 : 0;
        return {
          lotNumber: l.lotNumber, title: l.title, auctionTitle: l.auction?.title ?? '',
          soldPrice: l.soldPrice ?? 0, yourMaxBid: myMax, missAmount: Math.round(missAmount * 100) / 100, missPct,
        };
      })
      .sort((a, b) => a.missAmount - b.missAmount)
      .slice(0, 5);

    // ====== 3) "İyi alışveriş mi yaptım" — kazanılan lotlar tahmini değere göre ======
    const wonDeals = won
      .filter((l) => l.estimatedPrice && l.estimatedPrice > 0)
      .map((l) => {
        const diffPct = Math.round(((l.estimatedPrice! - (l.soldPrice ?? 0)) / l.estimatedPrice!) * 1000) / 10;
        return {
          lotNumber: l.lotNumber, title: l.title, auctionTitle: l.auction?.title ?? '',
          soldPrice: l.soldPrice ?? 0, estimatedPrice: l.estimatedPrice, diffPct,
        };
      })
      .sort((a, b) => b.diffPct - a.diffPct);
    const avgDiffPct = wonDeals.length > 0
      ? Math.round((wonDeals.reduce((s, d) => s + d.diffPct, 0) / wonDeals.length) * 10) / 10
      : null;

    // ====== 4) Favorileyip hiç teklif vermediği, süresi yaklaşan lotlar ======
    const watchlist = await prisma.watchlist.findMany({
      where: { userId },
      select: {
        lotId: true,
        lot: {
          select: {
            id: true, lotNumber: true, title: true, status: true,
            images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { imageUrl: true } },
            auction: { select: { title: true, status: true, endDate: true, liveStartDate: true, liveOnly: true } },
          },
        },
      },
    });
    const now = new Date();
    const forgottenFavorites = watchlist
      .filter((w) => !biddedLotIds.includes(w.lotId))
      .filter((w) => w.lot.status === 'PENDING' || w.lot.status === 'ACTIVE')
      .filter((w) => ['ACTIVE', 'SCHEDULED', 'LIVE'].includes(w.lot.auction?.status ?? ''))
      .map((w) => {
        const endsAt = w.lot.auction?.liveOnly ? w.lot.auction?.liveStartDate : (w.lot.auction?.endDate ?? w.lot.auction?.liveStartDate);
        return {
          lotId: w.lot.id, lotNumber: w.lot.lotNumber, title: w.lot.title,
          auctionTitle: w.lot.auction?.title ?? '', imageUrl: w.lot.images?.[0]?.imageUrl ?? null,
          endsAt,
        };
      })
      .filter((w) => w.endsAt && new Date(w.endsAt) > now)
      .sort((a, b) => new Date(a.endsAt!).getTime() - new Date(b.endsAt!).getTime())
      .slice(0, 8);

    return NextResponse.json({
      trust: { paidCount, trusted, outstandingCount, outstandingAmount, countLimit, tlLimit },
      bidStats: { totalFinished: finished.length, wonCount: won.length, lostCount: lost.length, winRatePct, closeLosses },
      wonDeals: { list: wonDeals.slice(0, 8), avgDiffPct },
      forgottenFavorites,
    });
  } catch (error: any) {
    console.error('Buyer analytics error:', error);
    return NextResponse.json({ error: 'Analitik yüklenemedi' }, { status: 500 });
  }
}
