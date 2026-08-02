export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// Admin için satıcı "sağlık skoru" — tek tek satıcıyı incelemeye gitmeden riskli/düşen
// satıcıları erken bulup admin'in proaktif yönlendirme yapmasını sağlamak için.
// Bu bir "kim müzayede hakkı almadı" listesi DEĞİL — o tek boyut, burada bir bileşen.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const sellers = await prisma.sellerProfile.findMany({
      where: { status: 'APPROVED' },
      select: { id: true, companyName: true, createdAt: true },
    });
    const sellerIds = sellers.map((s) => s.id);
    if (sellerIds.length === 0) return NextResponse.json({ sellers: [] });

    const [lots, disputes, payments, rightPurchases] = await Promise.all([
      prisma.lot.findMany({
        where: { auction: { sellerId: { in: sellerIds } }, status: { in: ['SOLD', 'UNSOLD'] } },
        select: {
          status: true, bidCount: true, soldPrice: true, provenance: true, restorationNote: true,
          createdAt: true, auction: { select: { sellerId: true } },
        },
      }),
      prisma.dispute.findMany({
        where: { lot: { auction: { sellerId: { in: sellerIds } } } },
        select: { lot: { select: { auction: { select: { sellerId: true } } } } },
      }),
      prisma.payment.findMany({
        where: { lot: { auction: { sellerId: { in: sellerIds } } } },
        select: { lot: { select: { auction: { select: { sellerId: true } } } } },
      }),
      prisma.auctionRightPurchase.findMany({
        where: { sellerId: { in: sellerIds }, status: 'APPROVED' },
        select: { sellerId: true, totalAmount: true },
      }),
    ]);

    // Platform geneli "son dakika rekabeti" — satıcı bazında (bkz. api/seller/analytics/route.ts'teki
    // aynı mantığın agregat/çok-satıcılı hâli). Düşük olan satıcılara admin, uzatma süresini
    // artırmayı önerebilir.
    const soldLotsForSniping = await prisma.lot.findMany({
      where: { auction: { sellerId: { in: sellerIds } }, status: 'SOLD' },
      select: {
        liveEndTime: true, auction: { select: { sellerId: true, endDate: true } },
        bids: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
    });
    const snipingBySeller = new Map<string, { lastMinute: number; total: number }>();
    const LAST_MINUTE_THRESHOLD_SEC = 90;
    for (const l of soldLotsForSniping) {
      const sid = l.auction?.sellerId;
      if (!sid) continue;
      const effectiveEnd = l.liveEndTime ?? l.auction?.endDate;
      const lastBidAt = l.bids?.[0]?.createdAt;
      if (!effectiveEnd || !lastBidAt) continue;
      const rec = snipingBySeller.get(sid) ?? { lastMinute: 0, total: 0 };
      rec.total += 1;
      const diffSec = (new Date(effectiveEnd).getTime() - new Date(lastBidAt).getTime()) / 1000;
      if (diffSec >= 0 && diffSec <= LAST_MINUTE_THRESHOLD_SEC) rec.lastMinute += 1;
      snipingBySeller.set(sid, rec);
    }

    const bySeller = new Map<string, {
      totalLots: number; soldLots: number; totalBids: number;
      qualityLots: number; revenue: number; disputeCount: number; orderCount: number;
      spentOnRights: number; firstLotCreatedAt: Date | null;
    }>();
    const init = () => ({ totalLots: 0, soldLots: 0, totalBids: 0, qualityLots: 0, revenue: 0, disputeCount: 0, orderCount: 0, spentOnRights: 0, firstLotCreatedAt: null as Date | null });

    for (const l of lots) {
      const sid = l.auction?.sellerId;
      if (!sid) continue;
      const rec = bySeller.get(sid) ?? init();
      rec.totalLots += 1;
      rec.totalBids += l.bidCount;
      if (l.status === 'SOLD') {
        rec.soldLots += 1;
        rec.revenue += l.soldPrice ?? 0;
        if (l.provenance?.trim() || l.restorationNote?.trim()) rec.qualityLots += 1;
      }
      if (!rec.firstLotCreatedAt || l.createdAt < rec.firstLotCreatedAt) rec.firstLotCreatedAt = l.createdAt;
      bySeller.set(sid, rec);
    }
    for (const d of disputes) {
      const sid = d.lot?.auction?.sellerId;
      if (!sid) continue;
      const rec = bySeller.get(sid) ?? init();
      rec.disputeCount += 1;
      bySeller.set(sid, rec);
    }
    for (const p of payments) {
      const sid = p.lot?.auction?.sellerId;
      if (!sid) continue;
      const rec = bySeller.get(sid) ?? init();
      rec.orderCount += 1;
      bySeller.set(sid, rec);
    }
    for (const r of rightPurchases) {
      const rec = bySeller.get(r.sellerId) ?? init();
      rec.spentOnRights += r.totalAmount;
      bySeller.set(r.sellerId, rec);
    }

    const now = new Date();
    const result = sellers.map((s) => {
      const rec = bySeller.get(s.id) ?? init();
      const saleRatePct = rec.totalLots > 0 ? Math.round((rec.soldLots / rec.totalLots) * 1000) / 10 : null;
      const avgBidsPerLot = rec.totalLots > 0 ? Math.round((rec.totalBids / rec.totalLots) * 10) / 10 : 0;
      const disputeRatePct = rec.orderCount > 0 ? Math.round((rec.disputeCount / rec.orderCount) * 1000) / 10 : 0;
      const qualityUsagePct = rec.soldLots > 0 ? Math.round((rec.qualityLots / rec.soldLots) * 1000) / 10 : null;
      const roi = rec.spentOnRights > 0 ? Math.round((rec.revenue / rec.spentOnRights) * 10) / 10 : null;

      // Onboarding sağlığı: profil oluşturulalı ≤90 gün olmuş satıcılarda, ilk lot
      // oluşturmadan itibaren 30 gün içinde ilk satış yapılmış mı (yaklaşık — gerçek
      // "onay tarihi" ayrı tutulmuyor, profil oluşturma tarihi proxy olarak kullanılıyor).
      const profileAgeDays = Math.floor((now.getTime() - s.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const isNewSeller = profileAgeDays <= 90;
      const onboardingHealthy = !isNewSeller ? null : (rec.soldLots > 0);

      // Sağlık skoru (0-100): satış oranı %40, düşük anlaşmazlık %30, kalite bilgisi kullanımı %30.
      // Veri yoksa (hiç lot/sipariş yoksa) o bileşen nötr (50) kabul edilir, tek satılık satıcı
      // tek bir anlaşmazlıkla dibe vurmasın diye.
      const saleComp = saleRatePct ?? 50;
      const disputeComp = 100 - Math.min(100, disputeRatePct * 10);
      const qualityComp = qualityUsagePct ?? 50;
      const healthScore = rec.totalLots === 0 ? null : Math.round(saleComp * 0.4 + disputeComp * 0.3 + qualityComp * 0.3);

      const snipe = snipingBySeller.get(s.id);
      const lastMinuteRatioPct = snipe && snipe.total > 0 ? Math.round((snipe.lastMinute / snipe.total) * 1000) / 10 : null;

      return {
        sellerId: s.id, companyName: s.companyName,
        totalLots: rec.totalLots, soldLots: rec.soldLots, saleRatePct, avgBidsPerLot,
        disputeCount: rec.disputeCount, orderCount: rec.orderCount, disputeRatePct,
        qualityUsagePct, revenue: rec.revenue, spentOnRights: rec.spentOnRights, roi,
        isNewSeller, onboardingHealthy, healthScore, lastMinuteRatioPct,
      };
    }).sort((a, b) => (a.healthScore ?? 999) - (b.healthScore ?? 999));

    return NextResponse.json({ sellers: result });
  } catch (error: any) {
    console.error('Seller health error:', error);
    return NextResponse.json({ error: 'Rapor yüklenemedi' }, { status: 500 });
  }
}
