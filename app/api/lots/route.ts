export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sellerId = searchParams.get('sellerId');
    const sort = searchParams.get('sort'); // price_asc, price_desc, date_asc, date_desc, bids_desc
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '24');

    const where: any = {
      auction: { isPublic: true, seller: { status: 'APPROVED' } },
    };

    // Filter by lot/auction status
    if (status === 'ACTIVE') {
      where.status = { in: ['ACTIVE', 'PENDING'] };
      where.auction.status = { in: ['SCHEDULED', 'ACTIVE', 'LIVE'] };
    } else if (status === 'COMPLETED') {
      where.status = 'SOLD';
    } else {
      // Default: show active lots
      where.status = { in: ['ACTIVE', 'PENDING'] };
      where.auction.status = { in: ['SCHEDULED', 'ACTIVE', 'LIVE'] };
    }

    if (category) {
      where.category = { slug: category };
    }

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    // Price range filter (uses startingPrice)
    if (minPrice || maxPrice) {
      where.startingPrice = {};
      if (minPrice) where.startingPrice.gte = parseFloat(minPrice);
      if (maxPrice) where.startingPrice.lte = parseFloat(maxPrice);
    }

    // Seller filter
    if (sellerId) {
      where.auction.sellerId = sellerId;
    }

    // Sorting
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { startingPrice: 'asc' };
    else if (sort === 'price_desc') orderBy = { startingPrice: 'desc' };
    else if (sort === 'date_asc') orderBy = { createdAt: 'asc' };
    else if (sort === 'date_desc') orderBy = { createdAt: 'desc' };
    else if (sort === 'bids_desc') orderBy = { bidCount: 'desc' };

    const [lots, total] = await Promise.all([
      prisma.lot.findMany({
        where,
        include: {
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
          category: true,
          auction: { select: { id: true, title: true, status: true, startDate: true, seller: { select: { id: true, companyName: true } } } },
          _count: { select: { bids: true, watchlist: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lot.count({ where }),
    ]);

    return NextResponse.json({ lots, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error: any) {
    console.error('Lots fetch error:', error);
    return NextResponse.json({ error: 'Ürünler yüklenemedi' }, { status: 500 });
  }
}
