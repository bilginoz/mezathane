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

    // En çok alışveriş yapan alıcılar (kim ne almış) — DIRECT'te "cari"nin özet/rapor versiyonu
    const soldPayments = await prisma.payment.findMany({
      where: { lot: { auction: { sellerId }, status: 'SOLD' } },
      select: {
        totalAmount: true,
        lot: { select: { title: true, lotNumber: true } },
        user: { select: { id: true, fullName: true, companyName: true } },
      },
    });
    const buyerMap = new Map<string, { name: string; orderCount: number; totalSpent: number; lots: string[] }>();
    for (const p of soldPayments) {
      const b = p.user;
      const key = b?.id ?? 'unknown';
      if (!buyerMap.has(key)) buyerMap.set(key, { name: b?.companyName || b?.fullName || 'Bilinmeyen', orderCount: 0, totalSpent: 0, lots: [] });
      const rec = buyerMap.get(key)!;
      rec.orderCount += 1;
      rec.totalSpent += p.totalAmount ?? 0;
      if (p.lot?.title) rec.lots.push(`#${p.lot.lotNumber} ${p.lot.title}`);
    }
    const topBuyers = Array.from(buyerMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 8)
      .map((b) => ({ ...b, totalSpent: Math.round(b.totalSpent * 100) / 100 }));

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

    // ====== 5) Son dakika rekabeti (lot bitiş anına yakın gelen kazanan teklifler) ======
    // Not: platformda hem canlı turda hem yazılı teklifte anti-sniping uzatması VAR
    // (son 60 sn içinde teklif gelirse süre uzuyor, bkz. api/bids/route.ts). Bu yüzden
    // "kaç lot son X saniyede bitti" oranı düşükse rekabet erken bitiyor demektir —
    // satıcı uzatma süresini (fairWaitingTime) artırmayı düşünebilir.
    const soldLotsDetailed = await prisma.lot.findMany({
      where: { auction: { sellerId }, status: 'SOLD' },
      select: {
        id: true, lotNumber: true, title: true, soldPrice: true, startingPrice: true,
        bidCount: true, viewCount: true, watchCount: true, provenance: true, restorationNote: true,
        liveEndTime: true, categoryId: true,
        auction: { select: { liveOnly: true, endDate: true } },
        _count: { select: { images: true } },
        bids: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
    });

    let lastMinuteCount = 0;
    let withEndTimeCount = 0;
    const LAST_MINUTE_THRESHOLD_SEC = 90;
    for (const l of soldLotsDetailed) {
      const effectiveEnd = l.liveEndTime ?? l.auction?.endDate;
      const lastBidAt = l.bids?.[0]?.createdAt;
      if (!effectiveEnd || !lastBidAt) continue;
      withEndTimeCount++;
      const diffSec = (new Date(effectiveEnd).getTime() - new Date(lastBidAt).getTime()) / 1000;
      if (diffSec >= 0 && diffSec <= LAST_MINUTE_THRESHOLD_SEC) lastMinuteCount++;
    }
    const lastMinuteRatio = withEndTimeCount > 0 ? Math.round((lastMinuteCount / withEndTimeCount) * 1000) / 10 : null;

    // ====== 6) Provenance/foto/restorasyon beyanı ↔ satış çarpanı korelasyonu ======
    // Küçük örneklemde yanıltıcı olmasın diye her grup en az 2 lot içermeli, aksi halde gösterilmez.
    function avgMultiplier(lots: typeof soldLotsDetailed): number | null {
      const valid = lots.filter((l) => l.startingPrice > 0 && l.soldPrice != null);
      if (valid.length < 2) return null;
      const sum = valid.reduce((s, l) => s + (l.soldPrice! / l.startingPrice), 0);
      return Math.round((sum / valid.length) * 100) / 100;
    }
    const withProvenance = soldLotsDetailed.filter((l) => l.provenance?.trim());
    const withoutProvenance = soldLotsDetailed.filter((l) => !l.provenance?.trim());
    const withRestoration = soldLotsDetailed.filter((l) => l.restorationNote?.trim());
    const withoutRestoration = soldLotsDetailed.filter((l) => !l.restorationNote?.trim());
    const withManyPhotos = soldLotsDetailed.filter((l) => l._count.images >= 3);
    const withFewPhotos = soldLotsDetailed.filter((l) => l._count.images < 3);

    const qualityCorrelation = {
      provenance: { with: avgMultiplier(withProvenance), without: avgMultiplier(withoutProvenance), withCount: withProvenance.length, withoutCount: withoutProvenance.length },
      restoration: { with: avgMultiplier(withRestoration), without: avgMultiplier(withoutRestoration), withCount: withRestoration.length, withoutCount: withoutRestoration.length },
      photos: { with: avgMultiplier(withManyPhotos), without: avgMultiplier(withFewPhotos), withCount: withManyPhotos.length, withoutCount: withFewPhotos.length },
    };

    // ====== 7) Standart vs Sadece-Canlı performans karşılaştırması ======
    const finishedLotsForFormat = await prisma.lot.findMany({
      where: { auction: { sellerId }, status: { in: ['SOLD', 'UNSOLD'] } },
      select: { status: true, soldPrice: true, startingPrice: true, bidCount: true, auction: { select: { liveOnly: true } } },
    });
    function formatStats(liveOnly: boolean) {
      const lots = finishedLotsForFormat.filter((l) => l.auction?.liveOnly === liveOnly);
      if (lots.length === 0) return null;
      const sold = lots.filter((l) => l.status === 'SOLD');
      const mult = avgMultiplier(sold as any);
      const avgBids = lots.reduce((s, l) => s + l.bidCount, 0) / lots.length;
      return {
        lotCount: lots.length, soldCount: sold.length,
        saleRatePct: Math.round((sold.length / lots.length) * 1000) / 10,
        avgMultiplier: mult, avgBidsPerLot: Math.round(avgBids * 10) / 10,
      };
    }
    const standardStats = formatStats(false);
    const liveOnlyStats = formatStats(true);
    const formatComparison = (standardStats && liveOnlyStats) ? { standard: standardStats, liveOnly: liveOnlyStats } : null;

    // ====== 8) Satılmayan lotların olası nedeni (kural tabanlı) ======
    const categoryBenchmark = new Map<string, { avgViews: number; avgStartingPrice: number; n: number }>();
    const catGroups = new Map<string, { views: number; price: number; n: number }>();
    for (const l of soldLotsDetailed) {
      if (!l.categoryId) continue;
      const g = catGroups.get(l.categoryId) ?? { views: 0, price: 0, n: 0 };
      g.views += l.viewCount; g.price += l.startingPrice; g.n++;
      catGroups.set(l.categoryId, g);
    }
    catGroups.forEach((g, catId) => categoryBenchmark.set(catId, { avgViews: g.views / g.n, avgStartingPrice: g.price / g.n, n: g.n }));

    const unsoldLotsDetailed = await prisma.lot.findMany({
      where: { auction: { sellerId }, status: 'UNSOLD' },
      select: { id: true, lotNumber: true, title: true, bidCount: true, viewCount: true, watchCount: true, startingPrice: true, categoryId: true },
      orderBy: { updatedAt: 'desc' },
      take: 15,
    });
    const unsoldReasons = unsoldLotsDetailed.map((l) => {
      const bench = l.categoryId ? categoryBenchmark.get(l.categoryId) : undefined;
      let reason: string;
      if (l.bidCount > 0) {
        reason = 'Teklif aldı ama satılamadı (rezerv fiyat karşılanmamış olabilir)';
      } else if (l.watchCount >= 3) {
        reason = `${l.watchCount} kişi favoriledi ama hiç teklif gelmedi — fiyat veya zamanlama uygun olmayabilir`;
      } else if (bench && bench.n >= 2 && l.viewCount < bench.avgViews * 0.5) {
        reason = 'Kategori ortalamasına göre az görüntülendi — foto/başlık/kategori keşfedilebilirliği zayıf olabilir';
      } else if (bench && bench.n >= 2 && l.startingPrice > bench.avgStartingPrice * 1.3) {
        reason = 'Başlangıç fiyatı, aynı kategorideki satılan lotların ortalamasının belirgin üstünde';
      } else {
        reason = 'Görüntülenme normal ama teklif gelmedi — net bir sebep tespit edilemedi';
      }
      return { lotId: l.id, lotNumber: l.lotNumber, title: l.title, viewCount: l.viewCount, watchCount: l.watchCount, reason };
    });

    // ====== 9) "Favoriledi ama hiç teklif vermedi" alıcı segmenti ======
    // UNSOLD listesi 15 ile sınırlı olduğu için segment sorgusunu ayrı, sınırsız çekiyoruz.
    const allFinishedLots = await prisma.lot.findMany({
      where: { auction: { sellerId }, status: { in: ['SOLD', 'UNSOLD'] } },
      select: { id: true, lotNumber: true, title: true },
    });
    const allFinishedIds = allFinishedLots.map((l) => l.id);
    const watchers = allFinishedIds.length > 0 ? await prisma.watchlist.findMany({
      where: { lotId: { in: allFinishedIds } },
      select: { userId: true, lotId: true, user: { select: { fullName: true, companyName: true } } },
    }) : [];
    const biddersByLot = new Map<string, Set<string>>();
    if (allFinishedIds.length > 0) {
      const allBidsOnLots = await prisma.bid.findMany({
        where: { lotId: { in: allFinishedIds } },
        select: { lotId: true, userId: true },
      });
      for (const b of allBidsOnLots) {
        if (!biddersByLot.has(b.lotId)) biddersByLot.set(b.lotId, new Set());
        biddersByLot.get(b.lotId)!.add(b.userId);
      }
    }
    const lotTitleMap = new Map(allFinishedLots.map((l) => [l.id, `#${l.lotNumber} ${l.title}`]));
    const interestedNonBiddersMap = new Map<string, { name: string; lots: string[] }>();
    for (const w of watchers) {
      const didBid = biddersByLot.get(w.lotId)?.has(w.userId);
      if (didBid) continue;
      const key = w.userId;
      if (!interestedNonBiddersMap.has(key)) {
        interestedNonBiddersMap.set(key, { name: w.user?.companyName || w.user?.fullName || 'Bilinmeyen', lots: [] });
      }
      interestedNonBiddersMap.get(key)!.lots.push(lotTitleMap.get(w.lotId) ?? w.lotId);
    }
    const interestedNonBidders = Array.from(interestedNonBiddersMap.values())
      .sort((a, b) => b.lots.length - a.lots.length)
      .slice(0, 10);

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
        buyerPremiumRate: (seller as any).buyerPremiumRate ?? 7, // DIRECT modda gösterilecek gerçek oran
      },
      auctionStats,
      categorySales,
      topBuyers,
      bidTrend,
      lastMinuteRatio,
      qualityCorrelation,
      formatComparison,
      unsoldReasons,
      interestedNonBidders,
    });
  } catch (error: any) {
    console.error('Seller analytics error:', error);
    return NextResponse.json({ error: 'Analitik yüklenemedi' }, { status: 500 });
  }
}
