export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth()));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

    const auctions = await prisma.auction.findMany({
      where: {
        status: { in: ['SCHEDULED', 'ACTIVE', 'LIVE', 'COMPLETED'] },
        seller: { status: 'APPROVED' },
        OR: [
          { startDate: { gte: startOfMonth, lte: endOfMonth } },
          { endDate: { gte: startOfMonth, lte: endOfMonth } },
          { AND: [{ startDate: { lte: startOfMonth } }, { endDate: { gte: endOfMonth } }] },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
        bannerUrl: true,
        seller: { select: { companyName: true } },
        _count: { select: { lots: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json(auctions);
  } catch (error) {
    console.error('Public calendar API error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
