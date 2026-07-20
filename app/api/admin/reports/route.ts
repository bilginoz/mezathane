export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') ?? '30'; // days
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Günlük teklif sayıları
    const bids = await prisma.bid.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, amount: true },
      orderBy: { createdAt: 'asc' },
    });

    // Günlük kullanıcı kayıtları
    const users = await prisma.user.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Müzayede durumları
    const auctionStats = await prisma.auction.groupBy({
      by: ['status'],
      _count: true,
    });

    // Kategori bazlı lot sayıları
    const categoryStats = await prisma.lot.groupBy({
      by: ['categoryId'],
      _count: true,
    });
    const categoryIds = categoryStats.map(c => c.categoryId).filter(Boolean) as string[];
    const categoriesData = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    // Günlük verileri grupla
    const dailyBids: Record<string, { count: number; volume: number }> = {};
    const dailyUsers: Record<string, number> = {};

    for (const bid of bids) {
      const day = new Date(bid.createdAt).toISOString().split('T')[0];
      if (!dailyBids[day]) dailyBids[day] = { count: 0, volume: 0 };
      dailyBids[day].count++;
      dailyBids[day].volume += bid.amount;
    }

    for (const u of users) {
      const day = new Date(u.createdAt).toISOString().split('T')[0];
      dailyUsers[day] = (dailyUsers[day] ?? 0) + 1;
    }

    // Tüm günleri doldur
    const allDays: string[] = [];
    const current = new Date(startDate);
    while (current <= new Date()) {
      allDays.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    const bidChart = allDays.map(day => ({
      date: day,
      teklifler: dailyBids[day]?.count ?? 0,
      hacim: Math.round(dailyBids[day]?.volume ?? 0),
    }));

    const userChart = allDays.map(day => ({
      date: day,
      kayitlar: dailyUsers[day] ?? 0,
    }));

    const categoryChart = categoryStats.map(c => {
      const cat = categoriesData.find(cc => cc.id === c.categoryId);
      return { name: cat?.name ?? 'Kategorisiz', lotSayisi: c._count };
    });

    const auctionChart = auctionStats.map(a => ({
      name: a.status === 'ACTIVE' ? 'Aktif' :
            a.status === 'COMPLETED' ? 'Tamamlanan' :
            a.status === 'SCHEDULED' ? 'Planlanan' :
            a.status === 'DRAFT' ? 'Taslak' :
            a.status === 'LIVE' ? 'Canlı' :
            a.status === 'CANCELLED' ? 'İptal' : a.status,
      value: a._count,
    }));

    // Satış ve komisyon verileri
    const soldLots = await prisma.lot.findMany({
      where: {
        status: 'SOLD',
        updatedAt: { gte: startDate },
      },
      select: { soldPrice: true, id: true },
    });
    const soldLotIds = soldLots.map(l => l.id);
    const payments = soldLotIds.length > 0 ? await prisma.payment.findMany({
      where: { lotId: { in: soldLotIds } },
      select: { commissionAmount: true, status: true, totalAmount: true, buyerPremiumAmount: true, buyerPremiumKDV: true },
    }) : [];

    const totalSalesRevenue = soldLots.reduce((s, l) => s + (l.soldPrice ?? 0), 0);
    const totalCommission = payments.reduce((s, p) => s + (p.commissionAmount ?? 0), 0);
    const totalBuyerPremium = payments.reduce((s, p) => s + ((p as any).buyerPremiumAmount ?? 0) + ((p as any).buyerPremiumKDV ?? 0), 0);
    const paidPayments = payments.filter(p => p.status === 'PAID');
    const collectionRate = payments.length > 0 ? Math.round((paidPayments.length / payments.length) * 100) : 0;

    // Top satıcılar (dönem içinde satış yapan)
    const topSellers = await prisma.$queryRawUnsafe(`
      SELECT sp."companyName", COUNT(l.id)::int AS "soldCount",
             COALESCE(SUM(l."soldPrice"), 0)::float AS "totalSales"
      FROM "Lot" l
      JOIN "Auction" a ON l."auctionId" = a.id
      JOIN "SellerProfile" sp ON a."sellerId" = sp.id
      WHERE l.status = 'SOLD' AND l."updatedAt" >= $1
      GROUP BY sp."companyName"
      ORDER BY "totalSales" DESC
      LIMIT 5
    `, startDate) as any[];

    // Lot satılma oranı (dönem içinde tamamlanan müzayedelerde)
    const allLotsInPeriod = await prisma.lot.count({
      where: { auction: { status: 'COMPLETED', endDate: { gte: startDate } } },
    });
    const soldLotsInPeriod = await prisma.lot.count({
      where: { status: 'SOLD', auction: { status: 'COMPLETED', endDate: { gte: startDate } } },
    });
    const conversionRate = allLotsInPeriod > 0 ? Math.round((soldLotsInPeriod / allLotsInPeriod) * 100) : 0;

    // Özet istatistikler
    const totalBidsInPeriod = bids.length;
    const totalVolumeInPeriod = bids.reduce((sum, b) => sum + b.amount, 0);
    const totalNewUsers = users.length;
    const avgDailyBids = days > 0 ? Math.round(totalBidsInPeriod / days) : 0;

    return NextResponse.json({
      bidChart,
      userChart,
      categoryChart,
      auctionChart,
      topSellers: topSellers ?? [],
      summary: {
        totalBidsInPeriod,
        totalVolumeInPeriod,
        totalNewUsers,
        avgDailyBids,
        totalSalesRevenue,
        totalCommission,
        totalBuyerPremium,
        totalPlatformRevenue: totalCommission + totalBuyerPremium,
        collectionRate,
        soldLotsCount: soldLots.length,
        conversionRate,
      },
    });
  } catch (error: any) {
    console.error('Admin reports error:', error);
    return NextResponse.json({ error: 'Raporlar yüklenemedi' }, { status: 500 });
  }
}
