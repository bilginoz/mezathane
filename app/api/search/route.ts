export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ lots: [], auctions: [], categories: [] });
    }

    const [lots, auctions, categories] = await Promise.all([
      prisma.lot.findMany({
        where: {
          title: { contains: q, mode: 'insensitive' },
          status: { in: ['PENDING', 'ACTIVE'] },
          auction: { status: { in: ['ACTIVE', 'LIVE', 'SCHEDULED'] }, seller: { status: 'APPROVED' } },
        },
        select: {
          id: true,
          title: true,
          currentPrice: true,
          startingPrice: true,
          images: { take: 1, select: { imageUrl: true } },
          auction: { select: { title: true } },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auction.findMany({
        where: {
          title: { contains: q, mode: 'insensitive' },
          status: { in: ['ACTIVE', 'LIVE', 'SCHEDULED'] },
          seller: { status: 'APPROVED' },
        },
        select: {
          id: true,
          title: true,
          status: true,
          startDate: true,
          seller: { select: { companyName: true, logoUrl: true, isVerified: true } },
          lots: { take: 4, orderBy: { sortOrder: 'asc' }, select: { images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { imageUrl: true } } } },
          _count: { select: { lots: true } },
        },
        take: 3,
        orderBy: { startDate: 'desc' },
      }),
      prisma.category.findMany({
        where: {
          name: { contains: q, mode: 'insensitive' },
        },
        select: { id: true, name: true, slug: true, imageUrl: true },
        take: 3,
      }),
    ]);

    return NextResponse.json({ lots, auctions, categories });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json({ lots: [], auctions: [], categories: [] });
  }
}
