export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// POST: Satılmayan lotları yeni müzayedeye aktar
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller || seller.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Onaylı satıcı profili gerekli' }, { status: 403 });
    }

    const body = await request.json();
    const { lotIds, sourceAuctionId } = body;

    if (!lotIds?.length || !sourceAuctionId) {
      return NextResponse.json({ error: 'Lot ve kaynak müzayede bilgisi gerekli' }, { status: 400 });
    }

    // Kaynak müzayedenin bu satıcıya ait ve COMPLETED olduğunu doğrula
    const sourceAuction = await prisma.auction.findFirst({
      where: { id: sourceAuctionId, sellerId: seller.id, status: 'COMPLETED' },
    });
    if (!sourceAuction) {
      return NextResponse.json({ error: 'Kaynak müzayede bulunamadı veya tamamlanmamış' }, { status: 404 });
    }

    // Aktif müzayede sayısı kontrolü (max 3)
    const activeAuctionCount = await prisma.auction.count({
      where: {
        sellerId: seller.id,
        status: { in: ['DRAFT', 'SCHEDULED', 'ACTIVE', 'LIVE'] },
      },
    });
    if (activeAuctionCount >= 3) {
      return NextResponse.json({ error: 'En fazla 3 aktif müzayedeniz olabilir.' }, { status: 400 });
    }

    // Seçilen lotları getir (sadece UNSOLD veya PENDING olanlar)
    const lots = await prisma.lot.findMany({
      where: {
        id: { in: lotIds },
        auctionId: sourceAuctionId,
        status: { in: ['UNSOLD', 'PENDING'] },
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        lotCategories: true,
      },
    });

    if (lots.length === 0) {
      return NextResponse.json({ error: 'Aktarılabilecek lot bulunamadı (sadece satılmamış lotlar aktarılabilir)' }, { status: 400 });
    }

    // Başlangıç tarihi: yarından itibaren (satıcı sonra düzenler)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0);

    // Yeni taslak müzayede oluştur
    const newAuction = await prisma.auction.create({
      data: {
        title: `${sourceAuction.title} — Tekrar`,
        description: sourceAuction.description,
        sellerId: seller.id,
        status: 'DRAFT',
        startDate: tomorrow,
        liveOnly: sourceAuction.liveOnly,
        liveDelayMinutes: sourceAuction.liveDelayMinutes,
        waitingTime: sourceAuction.waitingTime,
        fairWaitingTime: sourceAuction.fairWaitingTime,
        commissionRate: seller.commissionRate,
        paymentDays: sourceAuction.paymentDays,
        isPublic: true,
      },
    });

    // Lotları yeni müzayedeye kopyala (sıfırlanmış durumda)
    for (let i = 0; i < lots.length; i++) {
      const lot = lots[i];
      const newLot = await prisma.lot.create({
        data: {
          auctionId: newAuction.id,
          lotNumber: i + 1,
          title: lot.title,
          description: lot.description,
          notes: lot.notes,
          categoryId: lot.categoryId,
          secondaryCategoryId: lot.secondaryCategoryId,
          startingPrice: lot.startingPrice,
          estimatedPrice: lot.estimatedPrice,
          reservePrice: lot.reservePrice,
          customBidIncrement: lot.customBidIncrement,
          currentPrice: 0,
          status: 'PENDING',
          sortOrder: i,
          shippingType: lot.shippingType,
          estimatedShipping: lot.estimatedShipping,
          kdvRate: lot.kdvRate,
        },
      });

      // Görselleri kopyala
      if (lot.images.length > 0) {
        await prisma.lotImage.createMany({
          data: lot.images.map((img, idx) => ({
            lotId: newLot.id,
            imageUrl: img.imageUrl,
            cloudStoragePath: img.cloudStoragePath,
            sortOrder: idx,
            isPublic: img.isPublic,
          })),
        });
      }

      // Kategorileri kopyala
      if (lot.lotCategories.length > 0) {
        await prisma.lotCategory.createMany({
          data: lot.lotCategories.map(lc => ({
            lotId: newLot.id,
            categoryId: lc.categoryId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return NextResponse.json({
      auctionId: newAuction.id,
      lotCount: lots.length,
      message: `${lots.length} lot yeni müzayedeye aktarıldı`,
    });
  } catch (error: any) {
    console.error('Reauction error:', error);
    return NextResponse.json({ error: 'Lotlar aktarılamadı' }, { status: 500 });
  }
}
