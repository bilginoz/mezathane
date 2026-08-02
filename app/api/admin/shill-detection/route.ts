export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// Şüpheli teklif (danışıklı/shill bidding) taraması — bir satıcının kendi ürününe (veya
// anlaştığı biriyle) sahte teklif verip fiyatı yapay yükseltmesi ihtimalini yakalar.
// BU BİR OTOMATİK ENGELLEME DEĞİL — sadece admin'e "şuna bak" diye işaretler. Yanlış pozitif
// riski var (ör. aynı evden iki kişi, düşük ihtimalli bir tesadüf), o yüzden karar hep admin'de.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const bids = await prisma.bid.findMany({
      where: { ipAddress: { not: null } },
      select: {
        id: true, userId: true, lotId: true, ipAddress: true, createdAt: true,
        lot: { select: { title: true, lotNumber: true, auctionId: true, auction: { select: { sellerId: true, seller: { select: { companyName: true } } } } } },
      },
    });

    const userIds = Array.from(new Set(bids.map((b) => b.userId)));
    const users = userIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, companyName: true },
    }) : [];
    const userNameMap = new Map(users.map((u) => [u.id, u.companyName || u.fullName]));

    // ====== Kural 1+2: Aynı IP'den birden fazla farklı hesap teklif vermiş ======
    // Lot bazında grupla; bir lotta aynı IP'yi paylaşan ≥2 farklı hesap varsa işaretle.
    // Aynı IP çifti BİRDEN FAZLA farklı lotta tekrar ediyorsa (sharedLotCount ≥ 2) çok daha güçlü sinyal.
    const byLotIp = new Map<string, Set<string>>(); // "lotId|ip" -> userIds
    for (const b of bids) {
      const key = `${b.lotId}|${b.ipAddress}`;
      if (!byLotIp.has(key)) byLotIp.set(key, new Set());
      byLotIp.get(key)!.add(b.userId);
    }
    // Kullanıcı çifti -> hangi lotlarda birlikte aynı IP'den görüldüğü
    const pairLots = new Map<string, { userIds: [string, string]; lots: Map<string, { title: string; lotNumber: number; sellerName: string }> }>();
    for (const [key, userSet] of byLotIp) {
      if (userSet.size < 2) continue;
      const [lotId] = key.split('|');
      const bidSample = bids.find((b) => b.lotId === lotId);
      if (!bidSample) continue;
      const ids = Array.from(userSet).sort();
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const pairKey = `${ids[i]}|${ids[j]}`;
          if (!pairLots.has(pairKey)) pairLots.set(pairKey, { userIds: [ids[i], ids[j]], lots: new Map() });
          pairLots.get(pairKey)!.lots.set(lotId, {
            title: bidSample.lot.title, lotNumber: bidSample.lot.lotNumber,
            sellerName: bidSample.lot.auction?.seller?.companyName ?? 'Bilinmeyen',
          });
        }
      }
    }
    const ipSharing = Array.from(pairLots.values())
      .map((p) => ({
        user1: userNameMap.get(p.userIds[0]) ?? 'Bilinmeyen',
        user2: userNameMap.get(p.userIds[1]) ?? 'Bilinmeyen',
        sharedLotCount: p.lots.size,
        lots: Array.from(p.lots.values()),
      }))
      .sort((a, b) => b.sharedLotCount - a.sharedLotCount)
      .slice(0, 20);

    // ====== Kural 3: Bir satıcıya yüksek konsantrasyonla teklif verip hiç kazanmayan alıcılar ======
    const totalBidsByUser = new Map<string, number>();
    const bidsByUserSeller = new Map<string, number>(); // "userId|sellerId"
    for (const b of bids) {
      const sellerId = b.lot.auction?.sellerId;
      if (!sellerId) continue;
      totalBidsByUser.set(b.userId, (totalBidsByUser.get(b.userId) ?? 0) + 1);
      const key = `${b.userId}|${sellerId}`;
      bidsByUserSeller.set(key, (bidsByUserSeller.get(key) ?? 0) + 1);
    }
    const soldLots = await prisma.lot.findMany({
      where: { status: 'SOLD' },
      select: { winnerId: true, auction: { select: { sellerId: true, seller: { select: { companyName: true } } } } },
    });
    const winsByUserSeller = new Map<string, number>();
    const sellerNameMap = new Map<string, string>();
    for (const l of soldLots) {
      const sellerId = l.auction?.sellerId;
      if (!sellerId || !l.winnerId) continue;
      if (l.auction?.seller?.companyName) sellerNameMap.set(sellerId, l.auction.seller.companyName);
      const key = `${l.winnerId}|${sellerId}`;
      winsByUserSeller.set(key, (winsByUserSeller.get(key) ?? 0) + 1);
    }
    // sellerName eksik kalanlar için bids'ten tamamla
    for (const b of bids) {
      const sellerId = b.lot.auction?.sellerId;
      if (sellerId && !sellerNameMap.has(sellerId) && b.lot.auction?.seller?.companyName) {
        sellerNameMap.set(sellerId, b.lot.auction.seller.companyName);
      }
    }

    const concentrationFlags: { buyerName: string; sellerName: string; bidsOnSeller: number; totalBids: number; concentrationPct: number; wonCount: number }[] = [];
    for (const [key, bidsOnSeller] of bidsByUserSeller) {
      if (bidsOnSeller < 3) continue; // küçük örneklem gürültüsü
      const [userId, sellerId] = key.split('|');
      const totalBids = totalBidsByUser.get(userId) ?? bidsOnSeller;
      const concentrationPct = Math.round((bidsOnSeller / totalBids) * 1000) / 10;
      const wonCount = winsByUserSeller.get(key) ?? 0;
      if (concentrationPct >= 70 && wonCount === 0) {
        concentrationFlags.push({
          buyerName: userNameMap.get(userId) ?? 'Bilinmeyen',
          sellerName: sellerNameMap.get(sellerId) ?? 'Bilinmeyen',
          bidsOnSeller, totalBids, concentrationPct, wonCount,
        });
      }
    }
    concentrationFlags.sort((a, b) => b.bidsOnSeller - a.bidsOnSeller);

    return NextResponse.json({ ipSharing, concentrationFlags: concentrationFlags.slice(0, 20) });
  } catch (error: any) {
    console.error('Shill detection error:', error);
    return NextResponse.json({ error: 'Tarama yüklenemedi' }, { status: 500 });
  }
}
