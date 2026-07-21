export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auction = await prisma.auction.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, companyName: true, logoUrl: true, userId: true } },
        lots: {
          include: {
            category: true,
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            _count: { select: { bids: true, watchlist: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { lots: true } },
      },
    });

    if (!auction) {
      return NextResponse.json({ error: 'Müzayede bulunamadı' }, { status: 404 });
    }

    await prisma.auction.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({ auction });
  } catch (error: any) {
    console.error('Auction detail error:', error);
    return NextResponse.json({ error: 'Müzayede yüklenemedi' }, { status: 500 });
  }
}
