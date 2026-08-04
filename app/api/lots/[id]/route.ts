export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lot = await prisma.lot.findUnique({
      where: { id: id },
      include: {
        auction: {
          include: {
            seller: { select: { companyName: true, logoUrl: true } },
          },
        },
        category: true,
        lotCategories: { include: { category: true }, orderBy: { createdAt: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
        bids: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { user: { select: { fullName: true } } },
        },
        _count: { select: { bids: true, watchlist: true } },
      },
    });

    if (!lot) {
      return NextResponse.json({ error: 'Lot bulunamadı' }, { status: 404 });
    }

    await prisma.lot.update({
      where: { id: id },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({ lot });
  } catch (error: any) {
    console.error('Lot detail error:', error);
    return NextResponse.json({ error: 'Lot yüklenemedi' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const lot = await prisma.lot.findUnique({
      where: { id: id },
      include: { auction: { include: { seller: true } } },
    });
    if (!lot) return NextResponse.json({ error: 'Lot bulunamadı' }, { status: 404 });

    // Only lot owner (seller) or admin can edit
    if (userRole !== 'ADMIN' && lot.auction.seller.userId !== userId) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const body = await request.json();

    // Satıcı için: müzayede DRAFT değilse lot düzenleme engelle (sadece status değişikliği admin yapabilir)
    if (userRole !== 'ADMIN' && lot.auction.status !== 'DRAFT') {
      // Sadece status değişikliği ise izin ver (admin tarafından tetiklenecek)
      return NextResponse.json({ error: 'Lotlar sadece müzayede taslak durumundayken düzenlenebilir.' }, { status: 400 });
    }
    const { title, description, notes, condition, provenance, categoryId, categoryIds, startingPrice, estimatedPrice, reservePrice, customBidIncrement, status, imageUrl, images, videoUrl, restorationNote, certificateUrl, shippingType, estimatedShipping, kdvRate } = body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description || null;
    if (notes !== undefined) updateData.notes = notes || null;
    if (condition !== undefined) updateData.condition = condition?.trim() || null;
    if (provenance !== undefined) updateData.provenance = provenance?.trim() || null;
    // Eski uyumluluk
    if (categoryId) updateData.categoryId = categoryId;
    if (startingPrice !== undefined) {
      updateData.startingPrice = parseFloat(startingPrice);
      // Only update currentPrice if no bids yet
      if (lot.bidCount === 0) updateData.currentPrice = parseFloat(startingPrice);
    }
    if (estimatedPrice !== undefined) updateData.estimatedPrice = estimatedPrice ? parseFloat(estimatedPrice) : null;
    if (reservePrice !== undefined) updateData.reservePrice = reservePrice ? parseFloat(reservePrice) : null;
    if (customBidIncrement !== undefined) updateData.customBidIncrement = customBidIncrement ? parseFloat(customBidIncrement) : null;
    if (shippingType !== undefined) updateData.shippingType = shippingType === 'FREE_SELLER' ? 'FREE_SELLER' : 'BUYER_PAYS';
    if (estimatedShipping !== undefined) updateData.estimatedShipping = (shippingType === 'FREE_SELLER' || estimatedShipping == null || estimatedShipping === '') ? null : parseFloat(estimatedShipping);
    if (kdvRate !== undefined) updateData.kdvRate = [1, 10, 20].includes(Number(kdvRate)) ? Number(kdvRate) : 20;
    if (videoUrl !== undefined) updateData.videoUrl = (typeof videoUrl === 'string' && videoUrl.trim()) ? videoUrl.trim() : null;
    if (restorationNote !== undefined) updateData.restorationNote = (typeof restorationNote === 'string' && restorationNote.trim()) ? restorationNote.trim() : null;
    if (certificateUrl !== undefined) updateData.certificateUrl = (typeof certificateUrl === 'string' && certificateUrl.trim()) ? certificateUrl.trim() : null;
    if (status) updateData.status = status;

    const updatedLot = await prisma.lot.update({
      where: { id: id },
      data: updateData,
      include: { images: true, category: true, lotCategories: { include: { category: true } } },
    });

    // Çoklu kategori güncelleme
    if (categoryIds !== undefined) {
      // Mevcut kategori ilişkilerini sil ve yenilerini oluştur
      await prisma.lotCategory.deleteMany({ where: { lotId: id } });
      if (categoryIds.length > 0) {
        await prisma.lotCategory.createMany({
          data: categoryIds.map((catId: string) => ({ lotId: id, categoryId: catId })),
          skipDuplicates: true,
        });
      }
      // Eski alanları da güncelle (uyumluluk)
      await prisma.lot.update({
        where: { id: id },
        data: { categoryId: categoryIds[0] ?? null, secondaryCategoryId: categoryIds[1] ?? null },
      });
    }

    // Görseller — ÇOKLU (yeni): images dizisi verilirse mevcut görselleri bununla DEĞİŞTİR
    // (sıra = sortOrder, ilk görsel kapak). Ekleme formuyla aynı davranış.
    if (Array.isArray(images)) {
      const clean = images
        .map((im: any) => (typeof im === 'string' ? im : (im?.imageUrl ?? im?.url ?? '')))
        .filter((u: string) => typeof u === 'string' && u.trim());
      await prisma.lotImage.deleteMany({ where: { lotId: id } });
      if (clean.length > 0) {
        await prisma.lotImage.createMany({
          data: clean.map((u: string, idx: number) => ({ lotId: id, imageUrl: u, isPublic: true, sortOrder: idx })),
        });
      }
    } else if (imageUrl !== undefined) {
      // Eski uyumluluk: tek imageUrl (yalnızca images dizisi gelmediğinde)
      const existingImages = await prisma.lotImage.findMany({ where: { lotId: id } });
      if (existingImages.length > 0) {
        await prisma.lotImage.update({
          where: { id: existingImages[0].id },
          data: { imageUrl },
        });
      } else if (imageUrl) {
        await prisma.lotImage.create({
          data: { lotId: id, imageUrl, isPublic: true, sortOrder: 0 },
        });
      }
    }

    return NextResponse.json({ success: true, lot: updatedLot });
  } catch (error: any) {
    console.error('Update lot error:', error);
    return NextResponse.json({ error: 'Lot güncellenemedi' }, { status: 500 });
  }
}
