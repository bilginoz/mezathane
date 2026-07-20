export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const auctions = await prisma.auction.findMany({
      where: { status: { in: ['SCHEDULED', 'ACTIVE', 'LIVE'] } },
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
        liveStartDate: true,
        seller: { select: { user: { select: { fullName: true } }, companyName: true } },
        _count: { select: { lots: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json(auctions);
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json({ error: 'Yüklenemedi' }, { status: 500 });
  }
}
