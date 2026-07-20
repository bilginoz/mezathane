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
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) return NextResponse.json({ error: 'Satıcı profili yok' }, { status: 403 });

    const sellerId = seller.id;

    // Genel istatistikler
    const [totalAuctions, totalLots, totalBids, totalViews] = await Promise.all([
      prisma.auction.count({ where: { sellerId } }),
      prisma.lot.count({ where: { auction: { sellerId } } }),
      prisma.bid.count({ where: { lot: { auction: { sellerId } } } }),
      prisma.lot.aggregate({ where: { auction: { sellerId } }, _sum: { viewCount: true } }),
    ]);

    // Satış istatistikleri
    const soldLots = await prisma.lot.findMany({
      where: { auction: { sellerId }, status: 'SOLD' },
      select: { soldPrice: true, startingPrice: true, bidCount: true },
    });
    const totalRevenue = soldLots.reduce((s, l) => s + (l.soldPrice ?? 0), 0);
    const avgSalePrice = soldLots.length > 0 ? totalRevenue / soldLots.length : 0;
    const totalStartingValue = soldLots.reduce((s, l) => s + l.startingPrice, 0);
    const priceIncrease = totalStartingValue > 0 ? ((totalRevenue - totalStartingValue) / totalStartingValue) * 100 : 0;
    const avgBidsPerLot = soldLots.length > 0 ? soldLots.reduce((s, l) => s + l.bidCount, 0) / soldLots.length : 0;

    // Unsold count
    const unsoldLots = await prisma.lot.count({
      where: { auction: { sellerId }, status: 'UNSOLD' },
    });
    const saleRate = (totalLots > 0 && (soldLots.length + unsoldLots) > 0)
      ? (soldLots.length / (soldLots.length + unsoldLots)) * 100
      : 0;

    // Watchlist count
    const watchlistCount = await prisma.watchlist.count({
      where: { lot: { auction: { sellerId } } },
    });

    // Müzayede bazında performans (son 10)
    const auctionPerformance = await prisma.auction.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        viewCount: true,
        _count: { select: { lots: true } },
        lots: {
          select: {
            status: true,
            soldPrice: true,
            startingPrice: true,
            bidCount: true,
            viewCount: true,
          },
        },
      },
    });

    const auctionStats = auctionPerformance.map(a => {
      const sold = a.lots.filter(l => l.status === 'SOLD');
      const revenue = sold.reduce((s, l) => s + (l.soldPrice ?? 0), 0);
      const bids = a.lots.reduce((s, l) => s + l.bidCount, 0);
      const views = a.lots.reduce((s, l) => s + l.viewCount, 0);
      return {
        id: a.id,
        title: a.title,
        status: a.status,
        startDate: a.startDate,
        lotCount: a._count.lots,
        soldCount: sold.length,
        revenue,
        bids,
        views: views + a.viewCount,
      };
    });

    // Kategori bazında satış dağılımı
    const categoryBreakdown = await prisma.lot.groupBy({
      by: ['categoryId'],
      where: { auction: { sellerId }, status: 'SOLD' },
      _count: true,
      _sum: { soldPrice: true },
    });
    const categoryIds = categoryBreakdown.map(c => c.categoryId).filter((id): id is string => id !== null);
    const categoriesData = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = new Map(categoriesData.map(c => [c.id, c.name]));
    const categorySales = categoryBreakdown.map(c => ({
      name: categoryMap.get(c.categoryId ?? '') ?? 'Bilinmeyen',
      count: c._count,
      revenue: c._sum.soldPrice ?? 0,
    })).sort((a, b) => b.revenue - a.revenue);

    // Son 30 gün teklif trendi (günlük)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentBids = await prisma.bid.findMany({
      where: {
        lot: { auction: { sellerId } },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true, amount: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const bidTrend: { date: string; count: number; total: number }[] = [];
    const dayMap = new Map<string, { count: number; total: number }>();
    recentBids.forEach(b => {
      const day = b.createdAt.toISOString().slice(0, 10);
      const existing = dayMap.get(day) ?? { count: 0, total: 0 };
      existing.count++;
      existing.total += b.amount;
      dayMap.set(day, existing);
    });
    dayMap.forEach((v, k) => bidTrend.push({ date: k, ...v }));

    return NextResponse.json({
      overview: {
        totalAuctions,
        totalLots,
        soldLots: soldLots.length,
        unsoldLots,
        saleRate: Math.round(saleRate * 10) / 10,
        totalBids,
        totalViews: totalViews._sum.viewCount ?? 0,
        totalRevenue,
        avgSalePrice: Math.round(avgSalePrice),
        priceIncrease: Math.round(priceIncrease * 10) / 10,
        avgBidsPerLot: Math.round(avgBidsPerLot * 10) / 10,
        watchlistCount,
        commissionRate: seller.commissionRate,
      },
      auctionStats,
      categorySales,
      bidTrend,
    });
  } catch (error: any) {
    console.error('Seller analytics error:', error);
    return NextResponse.json({ error: 'Analitik yüklenemedi' }, { status: 500 });
  }
}
