export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { nextLotCode } from '@/lib/lot-code';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller || seller.status !== 'APPROVED') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

    const body = await request.json();
    const { auctionId, title, description, notes, condition, provenance, categoryId, secondaryCategoryId, categoryIds, startingPrice, estimatedPrice, reservePrice, customBidIncrement, images, videoUrl, restorationNote, certificateUrl, shippingType, estimatedShipping, kdvRate } = body;
    // categoryIds: yeni çoklu kategori sistemi, categoryId/secondaryCategoryId: eski uyumluluk
    const resolvedCategoryIds: string[] = categoryIds?.length ? categoryIds : [categoryId, secondaryCategoryId].filter(Boolean);

    // Müzayede durumu kontrolü — sadece DRAFT'ta lot eklemeye izin ver
    const auctionCheck = await prisma.auction.findUnique({ where: { id: auctionId }, select: { status: true, sellerId: true } });
    if (!auctionCheck || auctionCheck.sellerId !== seller.id) {
      return NextResponse.json({ error: 'Müzayede bulunamadı' }, { status: 404 });
    }
    if (auctionCheck.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Lot ekleme sadece müzayede taslak durumundayken yapılabilir.' }, { status: 400 });
    }

    // Müzayedede max 100 lot kontrolü
    const lotCount = await prisma.lot.count({ where: { auctionId } });
    if (lotCount >= 100) {
      return NextResponse.json({ error: 'Bir müzayedede en fazla 100 ürün olabilir.' }, { status: 400 });
    }

    // Get next lot number
    const lastLot = await prisma.lot.findFirst({
      where: { auctionId },
      orderBy: { lotNumber: 'desc' },
    });

    const lotData: any = {
      lotNumber: (lastLot?.lotNumber ?? 0) + 1,
      title,
      description: description ?? null,
      notes: notes ?? null,
      condition: condition?.trim() ? condition.trim() : null,
      provenance: provenance?.trim() ? provenance.trim() : null,
      auctionId,
      categoryId: resolvedCategoryIds[0] ?? null,
      secondaryCategoryId: resolvedCategoryIds[1] ?? null,
      startingPrice: startingPrice ?? 0,
      estimatedPrice: estimatedPrice ?? null,
      reservePrice: reservePrice ?? null,
      customBidIncrement: customBidIncrement ?? null,
      shippingType: shippingType === 'FREE_SELLER' ? 'FREE_SELLER' : 'BUYER_PAYS',
      estimatedShipping: shippingType === 'FREE_SELLER' ? null : (estimatedShipping != null && estimatedShipping !== '' ? parseFloat(estimatedShipping) : null),
      kdvRate: [1, 10, 20].includes(Number(kdvRate)) ? Number(kdvRate) : 20,
      videoUrl: typeof videoUrl === 'string' && videoUrl.trim() ? videoUrl.trim() : null,
      restorationNote: typeof restorationNote === 'string' && restorationNote.trim() ? restorationNote.trim() : null,
      certificateUrl: typeof certificateUrl === 'string' && certificateUrl.trim() ? certificateUrl.trim() : null,
      currentPrice: startingPrice ?? 0,
      status: 'PENDING',
      sortOrder: (lastLot?.sortOrder ?? 0) + 1,
      images: images?.length ? {
        create: (images as any[]).map((img: any, idx: number) => ({
          imageUrl: img.imageUrl ?? img.url ?? '',
          cloudStoragePath: img.cloudStoragePath ?? null,
          isPublic: true,
          sortOrder: idx,
        })),
      } : undefined,
    };

    // Global tekil lot kodu (MZT+YY+6 hane) ata; nadir çakışmada @unique yakalar → yeniden dener.
    let lot: any;
    for (let attempt = 0; ; attempt++) {
      try {
        lot = await prisma.lot.create({
          data: { ...lotData, lotCode: await nextLotCode() },
          include: { images: true, category: true, lotCategories: { include: { category: true } } },
        });
        break;
      } catch (e: any) {
        if (e?.code === 'P2002' && String(e?.meta?.target ?? '').includes('lotCode') && attempt < 5) continue;
        throw e;
      }
    }

    // LotCategory join table'a kayıtları ekle
    if (resolvedCategoryIds.length > 0) {
      await prisma.lotCategory.createMany({
        data: resolvedCategoryIds.map((catId: string) => ({ lotId: lot.id, categoryId: catId })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ success: true, lot });
  } catch (error: any) {
    console.error('Create lot error:', error);
    return NextResponse.json({ error: 'Lot oluşturulamadı' }, { status: 500 });
  }
}
