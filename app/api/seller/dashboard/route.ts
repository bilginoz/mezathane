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
    const seller = await prisma.sellerProfile.findUnique({
      where: { userId },
      include: { additionalDocs: { orderBy: { createdAt: 'desc' }, select: { id: true, label: true, fileName: true, createdAt: true } } },
    });
    if (!seller) return NextResponse.json({ error: 'Satıcı profili yok' }, { status: 403 });

    const [auctions, totalLots, totalBids, recentAuctions] = await Promise.all([
      prisma.auction.count({ where: { sellerId: seller.id } }),
      prisma.lot.count({ where: { auction: { sellerId: seller.id } } }),
      prisma.bid.count({ where: { lot: { auction: { sellerId: seller.id } } } }),
      prisma.auction.findMany({
        where: { sellerId: seller.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { _count: { select: { lots: true } } },
      }),
    ]);

    const soldLots = await prisma.lot.findMany({
      where: { auction: { sellerId: seller.id }, status: 'SOLD' },
      select: { soldPrice: true },
    });
    const totalRevenue = soldLots.reduce((sum: number, l: any) => sum + (l.soldPrice ?? 0), 0);

    return NextResponse.json({
      stats: { auctions, totalLots, totalBids, totalRevenue },
      recentAuctions,
      seller,
    });
  } catch (error: any) {
    console.error('Seller dashboard error:', error);
    return NextResponse.json({ error: 'Dashboard yüklenemedi' }, { status: 500 });
  }
}
