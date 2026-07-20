export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// GET reviews for a seller
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');
    if (!sellerId) return NextResponse.json({ error: 'sellerId gerekli' }, { status: 400 });

    const reviews = await prisma.sellerReview.findMany({
      where: { sellerId },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const seller = await prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      select: { averageRating: true, reviewCount: true },
    });

    return NextResponse.json({ reviews, averageRating: seller?.averageRating ?? 0, reviewCount: seller?.reviewCount ?? 0 });
  } catch (error: any) {
    console.error('Reviews GET error:', error);
    return NextResponse.json({ error: 'Yorumlar yüklenemedi' }, { status: 500 });
  }
}

// POST a new review
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const body = await request.json();
    const { sellerId, rating, comment } = body ?? {};

    if (!sellerId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Geçerli bir sellerId ve 1-5 arası puan gerekli' }, { status: 400 });
    }

    // Kendi kendini değerlendirme kontrolü
    const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
    if (!seller) return NextResponse.json({ error: 'Satıcı bulunamadı' }, { status: 404 });
    if (seller.userId === userId) {
      return NextResponse.json({ error: 'Kendi kendinizi değerlendiremezsiniz' }, { status: 400 });
    }

    // Daha önce değerlendirme yaptı mı kontrolü
    const existing = await prisma.sellerReview.findUnique({
      where: { userId_sellerId: { userId, sellerId } },
    });

    let review;
    if (existing) {
      review = await prisma.sellerReview.update({
        where: { id: existing.id },
        data: { rating, comment: comment ?? null },
      });
    } else {
      review = await prisma.sellerReview.create({
        data: { rating, comment: comment ?? null, userId, sellerId },
      });
    }

    // Ortalama puanı güncelle
    const agg = await prisma.sellerReview.aggregate({
      where: { sellerId },
      _avg: { rating: true },
      _count: true,
    });

    await prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        averageRating: agg._avg.rating ?? 0,
        reviewCount: agg._count,
      },
    });

    return NextResponse.json({ review });
  } catch (error: any) {
    console.error('Review POST error:', error);
    return NextResponse.json({ error: 'Değerlendirme gönderilemedi' }, { status: 500 });
  }
}
