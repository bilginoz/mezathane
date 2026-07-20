export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '12');

    const where: any = { isPublic: true, seller: { status: 'APPROVED' } };
    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['SCHEDULED', 'ACTIVE', 'LIVE'] };
    }
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (category) {
      where.lots = { some: { category: { slug: category } } };
    }

    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
        where,
        include: {
          seller: { select: { companyName: true, logoUrl: true, isVerified: true } },
          lots: { take: 4, orderBy: { sortOrder: 'asc' }, select: { images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { imageUrl: true } } } },
          _count: { select: { lots: true } },
        },
        orderBy: { startDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auction.count({ where }),
    ]);

    return NextResponse.json({ auctions, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error: any) {
    console.error('Auctions fetch error:', error);
    return NextResponse.json({ error: 'Müzayedeler yüklenemedi' }, { status: 500 });
  }
}

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

    // Satıcının aktif müzayede sayısını kontrol et (max 3)
    const activeAuctionCount = await prisma.auction.count({
      where: {
        sellerId: seller.id,
        status: { in: ['DRAFT', 'SCHEDULED', 'ACTIVE', 'LIVE'] },
      },
    });
    if (activeAuctionCount >= 3) {
      return NextResponse.json({ error: 'En fazla 3 aktif müzayedeniz olabilir. Mevcut müzayedelerinizden birinin süresi dolmadan yeni müzayede açamazsınız.' }, { status: 400 });
    }

    const body = await request.json();
    const auction = await prisma.auction.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        bannerUrl: body.bannerUrl ?? null,
        sellerId: seller.id,
        status: body.status ?? 'DRAFT',
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        liveStartDate: body.liveStartDate ? new Date(body.liveStartDate) : null,
        liveOnly: body.liveOnly ?? false,
        liveDelayMinutes: Math.min(1440, Math.max(0, body.liveDelayMinutes ?? 30)),
        waitingTime: Math.min(120, Math.max(5, body.waitingTime ?? 20)),
        fairWaitingTime: Math.min(15, Math.max(5, body.fairWaitingTime ?? 5)),
        commissionRate: seller.commissionRate,
        paymentDays: Math.min(7, Math.max(2, body.paymentDays ?? 5)),
        isPublic: body.isPublic ?? true,
      },
    });
    return NextResponse.json({ auction });
  } catch (error: any) {
    console.error('Create auction error:', error);
    return NextResponse.json({ error: 'Müzayede oluşturulamadı' }, { status: 500 });
  }
}
