export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const [totalUsers, totalSellers, pendingSellers, totalAuctions, activeAuctions, totalLots, totalBids, totalPayments] = await Promise.all([
      prisma.user.count(),
      prisma.sellerProfile.count(),
      prisma.sellerProfile.count({ where: { status: 'PENDING' } }),
      prisma.auction.count(),
      prisma.auction.count({ where: { status: { in: ['ACTIVE', 'LIVE'] } } }),
      prisma.lot.count(),
      prisma.bid.count(),
      prisma.payment.aggregate({ _sum: { totalAmount: true }, where: { status: 'PAID' } }),
    ]);

    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    });

    const pendingSellerApps = await prisma.sellerProfile.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { email: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalSellers,
        pendingSellers,
        totalAuctions,
        activeAuctions,
        totalLots,
        totalBids,
        totalRevenue: totalPayments._sum?.totalAmount ?? 0,
      },
      recentUsers,
      pendingSellerApps,
    });
  } catch (error: any) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Dashboard yüklenemedi' }, { status: 500 });
  }
}
