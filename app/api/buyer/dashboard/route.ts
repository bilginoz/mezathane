export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;

    const [activeBids, wonLots, watchlistCount, pendingPayments, recentBids] = await Promise.all([
      prisma.bid.count({ where: { userId, lot: { status: { in: ['ACTIVE', 'PENDING'] } } } }),
      prisma.lot.count({ where: { winnerId: userId } }),
      prisma.watchlist.count({ where: { userId } }),
      prisma.payment.count({ where: { userId, status: 'PENDING' } }),
      prisma.bid.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          lot: {
            include: {
              images: { take: 1, orderBy: { sortOrder: 'asc' } },
              auction: { select: { title: true, status: true } },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      stats: { activeBids, wonLots, watchlistCount, pendingPayments },
      recentBids,
    });
  } catch (error: any) {
    console.error('Buyer dashboard error:', error);
    return NextResponse.json({ error: 'Dashboard yüklenemedi' }, { status: 500 });
  }
}
