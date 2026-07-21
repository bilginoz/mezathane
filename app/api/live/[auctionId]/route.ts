export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { triggerLiveUpdate } from '@/lib/pusher';

// KVKK: Teklif verenlerin isimlerini gizle ("Bilgin ÖZ" -> "B... Ö...")
function maskName(fullName?: string | null): string {
  if (!fullName) return 'Anonim';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Anonim';
  return parts.map((p) => p[0].toLocaleUpperCase('tr-TR') + '...').join(' ');
}

// Bir lotu satıldı olarak kapat + ödeme kaydı oluştur
async function closeSoldLot(lot: any, auction: any) {
  const highestBid = lot.bids?.[0];
  await prisma.lot.update({
    where: { id: lot.id },
    data: {
      status: 'SOLD',
      winnerId: highestBid.userId,
      soldPrice: highestBid.amount,
      currentPrice: highestBid.amount,
      liveEndTime: null,
    },
  });

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (auction.paymentDays ?? 5));
  const commAmt = highestBid.amount * ((auction.commissionRate ?? 15) / 100);
  // Alıcı komisyonu (buyer premium) hesapla
  const buyerPremiumRate = 10.0;
  const buyerPremiumAmount = highestBid.amount * (buyerPremiumRate / 100);
  const lotKdvRate = (lot.kdvRate ?? 20) / 100;
  const buyerPremiumKDV = Math.round(buyerPremiumAmount * lotKdvRate * 100) / 100;
  const buyerTotalAmount = highestBid.amount + buyerPremiumAmount + buyerPremiumKDV;
  const buyer = await prisma.user.findUnique({
    where: { id: highestBid.userId },
    select: { fullName: true, phone: true, shippingAddress: true },
  });
  await prisma.payment.create({
    data: {
      lotId: lot.id,
      userId: highestBid.userId,
      amount: highestBid.amount,
      commissionAmount: commAmt,
      buyerPremiumRate,
      buyerPremiumAmount,
      buyerPremiumKDV,
      totalAmount: buyerTotalAmount,
      status: 'PENDING',
      dueDate,
      shippingName: buyer?.fullName ?? null,
      shippingAddress: buyer?.shippingAddress ?? null,
      shippingPhone: buyer?.phone ?? null,
    },
  });
}

// Sıradaki satılabilir lotu bul (verilen lottan sonraki)
function findNextLot(allLots: any[], afterLotId: string) {
  const currentIndex = allLots.findIndex((l) => l.id === afterLotId);
  return allLots.find(
    (l, i) => i > currentIndex && l.status !== 'SOLD' && l.status !== 'UNSOLD'
  );
}

// Canlı müzayede durumunu sorgula ve gerekirse sonraki lota geç
export async function GET(
  request: Request,
  { params }: { params: Promise<{ auctionId: string }> }
) {
  try {
    const { auctionId } = await params;
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        lots: {
          orderBy: { sortOrder: 'asc' },
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            bids: { orderBy: { amount: 'desc' }, take: 3, include: { user: { select: { fullName: true } } } },
            _count: { select: { bids: true } },
          },
        },
        seller: { select: { companyName: true } },
      },
    });

    if (!auction) {
      return NextResponse.json({ error: 'Müzayede bulunamadı' }, { status: 404 });
    }

    // Müzayede LIVE değilse bilgi dön
    if (auction.status !== 'LIVE') {
      return NextResponse.json({
        auction: {
          id: auction.id,
          title: auction.title,
          status: auction.status,
          liveStartDate: auction.liveStartDate,
        },
        currentLot: null,
        nextLots: [],
        completedLots: [],
        isLive: false,
      });
    }

    const allLots = auction.lots ?? [];
    const now = Date.now();

    // SATILDI ara ekranı yardımcı: duraklamadaki lottan SATILDI kartı verisi üret
    const buildSoldLot = (lot: any) => {
      if (!lot) return null;
      const winnerBid = (lot.bids ?? []).find((b: any) => b.userId === lot.winnerId) ?? lot.bids?.[0];
      return {
        id: lot.id,
        lotNumber: lot.lotNumber,
        title: lot.title,
        soldPrice: lot.soldPrice ?? winnerBid?.amount ?? lot.currentPrice ?? 0,
        image: lot.images?.[0]?.imageUrl ?? null,
        winnerName: maskName(winnerBid?.user?.fullName),
      };
    };

    // ----- 1) Aktif bir SATILDI duraklaması var mı? -----
    if (auction.livePauseUntil) {
      const pauseEnd = new Date(auction.livePauseUntil).getTime();
      if (now < pauseEnd) {
        // Hala duraklamadayız: SATILDI ara ekranını herkese göster
        const pausedLot = allLots.find((l) => l.id === auction.livePausedLotId);
        return NextResponse.json({
          auction: {
            id: auction.id,
            title: auction.title,
            status: 'LIVE',
            liveTimePerLot: auction.liveTimePerLot ?? 30,
            totalLots: allLots.length,
          },
          currentLot: null,
          isPaused: true,
          soldLot: buildSoldLot(pausedLot),
          pauseUntil: auction.livePauseUntil,
          pauseSecondsLeft: Math.max(0, Math.ceil((pauseEnd - now) / 1000)),
          nextLots: allLots
            .filter((l) => l.id !== auction.livePausedLotId && l.status !== 'SOLD' && l.status !== 'UNSOLD')
            .map((l) => ({
              id: l.id, lotNumber: l.lotNumber, title: l.title, description: l.description,
              startingPrice: l.startingPrice, estimatedPrice: l.estimatedPrice,
              image: l.images?.[0]?.imageUrl,
              images: l.images?.map((img: any) => ({ imageUrl: img.imageUrl })),
            })),
          completedLots: allLots.filter((l) => l.status === 'SOLD' || l.status === 'UNSOLD').map((l) => ({
            id: l.id, lotNumber: l.lotNumber, title: l.title,
            status: l.status, soldPrice: l.soldPrice, currentPrice: l.currentPrice,
            image: l.images?.[0]?.imageUrl,
          })),
          isLive: true,
        });
      } else {
        // Duraklama bitti: sıradaki lota geç, duraklama alanlarını temizle
        const nextLot = auction.livePausedLotId ? findNextLot(allLots, auction.livePausedLotId) : allLots.find((l) => l.status !== 'SOLD' && l.status !== 'UNSOLD');
        if (nextLot) {
          const liveEndTime = new Date(now + (auction.liveTimePerLot ?? 30) * 1000);
          await prisma.lot.update({
            where: { id: nextLot.id },
            data: { status: 'ACTIVE', liveEndTime },
          });
          await prisma.auction.update({
            where: { id: auction.id },
            data: { currentLiveLotId: nextLot.id, livePauseUntil: null, livePausedLotId: null },
          });
          triggerLiveUpdate(auction.id).catch(() => {});
        } else {
          await prisma.auction.update({
            where: { id: auction.id },
            data: { status: 'COMPLETED', currentLiveLotId: null, livePauseUntil: null, livePausedLotId: null },
          });
          triggerLiveUpdate(auction.id).catch(() => {});
          return NextResponse.json({
            auction: { id: auction.id, title: auction.title, status: 'COMPLETED' },
            currentLot: null,
            nextLots: [],
            completedLots: allLots.map((l) => ({
              id: l.id, lotNumber: l.lotNumber, title: l.title,
              status: l.status, soldPrice: l.soldPrice, currentPrice: l.currentPrice,
              image: l.images?.[0]?.imageUrl,
            })),
            isLive: false,
            isCompleted: true,
          });
        }
      }
    } else {
      // ----- 2) Mevcut lotun süresi doldu mu? -----
      const currentLotId = auction.currentLiveLotId;
      const currentLot = currentLotId ? allLots.find((l) => l.id === currentLotId) : null;

      if (currentLot && currentLot.liveEndTime && new Date(currentLot.liveEndTime).getTime() - now <= 0) {
        const highestBid = currentLot.bids?.[0];
        const pauseSeconds = auction.livePauseSeconds ?? 4;
        const nextLot = findNextLot(allLots, currentLot.id);

        if (highestBid) {
          // Lot SATILDI
          await closeSoldLot(currentLot, auction);

          if (pauseSeconds > 0) {
            // SATILDI ara ekranı için duraklat (sonraki lot olmasa bile finali göster)
            await prisma.auction.update({
              where: { id: auction.id },
              data: {
                livePauseUntil: new Date(now + pauseSeconds * 1000),
                livePausedLotId: currentLot.id,
              },
            });
            triggerLiveUpdate(auction.id).catch(() => {});
            // Bu lotun güncel verisini çekip SATILDI kartını hemen döndür
            const soldLotFresh = await prisma.lot.findUnique({
              where: { id: currentLot.id },
              include: {
                images: { orderBy: { sortOrder: 'asc' } },
                bids: { orderBy: { amount: 'desc' }, take: 3, include: { user: { select: { fullName: true } } } },
              },
            });
            return NextResponse.json({
              auction: {
                id: auction.id, title: auction.title, status: 'LIVE',
                liveTimePerLot: auction.liveTimePerLot ?? 30, totalLots: allLots.length,
              },
              currentLot: null,
              isPaused: true,
              soldLot: buildSoldLot(soldLotFresh),
              pauseUntil: new Date(now + pauseSeconds * 1000).toISOString(),
              pauseSecondsLeft: pauseSeconds,
              nextLots: allLots
                .filter((l) => l.id !== currentLot.id && l.status !== 'SOLD' && l.status !== 'UNSOLD')
                .map((l) => ({
                  id: l.id, lotNumber: l.lotNumber, title: l.title, description: l.description,
                  startingPrice: l.startingPrice, estimatedPrice: l.estimatedPrice,
                  image: l.images?.[0]?.imageUrl,
                  images: l.images?.map((img: any) => ({ imageUrl: img.imageUrl })),
                })),
              completedLots: allLots.filter((l) => l.status === 'SOLD' || l.status === 'UNSOLD').map((l) => ({
                id: l.id, lotNumber: l.lotNumber, title: l.title,
                status: l.status, soldPrice: l.soldPrice, currentPrice: l.currentPrice,
                image: l.images?.[0]?.imageUrl,
              })),
              isLive: true,
            });
          } else {
            // Duraklama kapalı: doğrudan sonraki lota geç
            if (nextLot) {
              const liveEndTime = new Date(now + (auction.liveTimePerLot ?? 30) * 1000);
              await prisma.lot.update({ where: { id: nextLot.id }, data: { status: 'ACTIVE', liveEndTime } });
              await prisma.auction.update({ where: { id: auction.id }, data: { currentLiveLotId: nextLot.id } });
            } else {
              await prisma.auction.update({ where: { id: auction.id }, data: { status: 'COMPLETED', currentLiveLotId: null } });
            }
            triggerLiveUpdate(auction.id).catch(() => {});
          }
        } else {
          // Lot SATILMADI -> hiçbir şey gösterme, anında sonraki lota geç
          await prisma.lot.update({
            where: { id: currentLot.id },
            data: { status: 'UNSOLD', liveEndTime: null },
          });
          if (nextLot) {
            const liveEndTime = new Date(now + (auction.liveTimePerLot ?? 30) * 1000);
            await prisma.lot.update({ where: { id: nextLot.id }, data: { status: 'ACTIVE', liveEndTime } });
            await prisma.auction.update({ where: { id: auction.id }, data: { currentLiveLotId: nextLot.id } });
            triggerLiveUpdate(auction.id).catch(() => {});
          } else {
            await prisma.auction.update({ where: { id: auction.id }, data: { status: 'COMPLETED', currentLiveLotId: null } });
            triggerLiveUpdate(auction.id).catch(() => {});
            return NextResponse.json({
              auction: { id: auction.id, title: auction.title, status: 'COMPLETED' },
              currentLot: null,
              nextLots: [],
              completedLots: allLots.map((l) => ({
                id: l.id, lotNumber: l.lotNumber, title: l.title,
                status: l.status, soldPrice: l.soldPrice, currentPrice: l.currentPrice,
                image: l.images?.[0]?.imageUrl,
              })),
              isLive: false,
              isCompleted: true,
            });
          }
        }
      } else if (!currentLotId) {
        // Hiç aktif lot yok -> ilk lotu başlat
        const firstLot = allLots.find((l) => l.status !== 'SOLD' && l.status !== 'UNSOLD');
        if (firstLot) {
          const liveEndTime = new Date(now + (auction.liveTimePerLot ?? 30) * 1000);
          await prisma.lot.update({ where: { id: firstLot.id }, data: { status: 'ACTIVE', liveEndTime } });
          await prisma.auction.update({ where: { id: auction.id }, data: { currentLiveLotId: firstLot.id } });
          triggerLiveUpdate(auction.id).catch(() => {});
        }
      }
    }

    // ----- Güncel verileri tekrar çek ve döndür -----
    const updatedAuction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        lots: {
          orderBy: { sortOrder: 'asc' },
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            bids: { orderBy: { amount: 'desc' }, take: 5, include: { user: { select: { fullName: true } } } },
            _count: { select: { bids: true } },
          },
        },
      },
    });

    const updatedLots = updatedAuction?.lots ?? [];
    const activeLot = updatedLots.find((l) => l.id === updatedAuction?.currentLiveLotId);
    const completedLots = updatedLots.filter((l) => l.status === 'SOLD' || l.status === 'UNSOLD');
    const pendingLots = updatedLots.filter((l) => l.id !== activeLot?.id && l.status !== 'SOLD' && l.status !== 'UNSOLD');

    return NextResponse.json({
      auction: {
        id: auction.id,
        title: auction.title,
        status: updatedAuction?.status ?? 'LIVE',
        liveTimePerLot: auction.liveTimePerLot ?? 30,
        liveBidExtension: auction.liveBidExtension ?? 10,
        totalLots: updatedLots.length,
      },
      currentLot: activeLot ? {
        id: activeLot.id,
        lotNumber: activeLot.lotNumber,
        title: activeLot.title,
        description: activeLot.description,
        startingPrice: activeLot.startingPrice,
        currentPrice: activeLot.currentPrice,
        customBidIncrement: activeLot.customBidIncrement,
        liveEndTime: activeLot.liveEndTime,
        bidCount: activeLot._count?.bids ?? 0,
        image: activeLot.images?.[0]?.imageUrl,
        images: activeLot.images?.map((img) => ({ imageUrl: img.imageUrl })),
        topBids: (activeLot.bids ?? []).map((b) => ({
          amount: b.amount,
          userName: maskName(b.user?.fullName),
          isWinning: b.isWinning,
          createdAt: b.createdAt,
        })),
      } : null,
      isPaused: false,
      nextLots: pendingLots.map((l) => ({
        id: l.id, lotNumber: l.lotNumber, title: l.title, description: l.description,
        startingPrice: l.startingPrice, estimatedPrice: l.estimatedPrice,
        image: l.images?.[0]?.imageUrl,
        images: l.images?.map((img) => ({ imageUrl: img.imageUrl })),
      })),
      completedLots: completedLots.map((l) => ({
        id: l.id, lotNumber: l.lotNumber, title: l.title, description: l.description,
        status: l.status, soldPrice: l.soldPrice, currentPrice: l.currentPrice,
        image: l.images?.[0]?.imageUrl,
        images: l.images?.map((img) => ({ imageUrl: img.imageUrl })),
      })),
      isLive: true,
    });
  } catch (error: any) {
    console.error('Live auction error:', error);
    return NextResponse.json({ error: 'Canlı müzayede verisi alınamadı' }, { status: 500 });
  }
}
