export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const seller = await prisma.sellerProfile.findUnique({
      where: { id: params.id, status: 'APPROVED' },
      select: {
        id: true,
        companyName: true,
        companyAddress: true,
        description: true,
        logoUrl: true,
        commissionRate: true,
        createdAt: true,
        auctions: {
          where: { isPublic: true, status: { in: ['SCHEDULED', 'ACTIVE', 'LIVE', 'COMPLETED'] } },
          include: {
            _count: { select: { lots: true } },
            lots: {
              take: 4,
              orderBy: { sortOrder: 'asc' },
              select: { images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { imageUrl: true } } },
            },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (!seller) {
      return NextResponse.json({ error: 'Müzayede evi bulunamadı' }, { status: 404 });
    }

    // Toplam lot ve teklif sayısı
    const stats = await prisma.auction.aggregate({
      where: { sellerId: seller.id, isPublic: true },
      _count: true,
    });

    const totalLots = await prisma.lot.count({
      where: { auction: { sellerId: seller.id, isPublic: true } },
    });

    const totalBids = await prisma.bid.count({
      where: { lot: { auction: { sellerId: seller.id } } },
    });

    return NextResponse.json({
      seller,
      stats: {
        totalAuctions: stats._count,
        totalLots,
        totalBids,
      },
    });
  } catch (error: any) {
    console.error('Seller profile error:', error);
    return NextResponse.json({ error: 'Profil yüklenemedi' }, { status: 500 });
  }
}
