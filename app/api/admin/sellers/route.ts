export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter;
    }
    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { user: { fullName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const sellers = await prisma.sellerProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
        additionalDocs: {
          select: { id: true, label: true, fileName: true, filePath: true, createdAt: true },
          orderBy: { createdAt: 'desc' as const },
        },
        _count: {
          select: {
            auctions: true,
          },
        },
      },
    });

    // Get lot counts, bid counts and finance summary per seller
    const sellersWithStats = await Promise.all(
      sellers.map(async (seller) => {
        const lotCount = await prisma.lot.count({
          where: { auction: { sellerId: seller.id } },
        });
        const totalBids = await prisma.bid.count({
          where: { lot: { auction: { sellerId: seller.id } } },
        });

        // Finans özeti: satılan lotlar + ödemeleri
        const soldLots = await prisma.lot.findMany({
          where: { status: 'SOLD', soldPrice: { not: null }, auction: { sellerId: seller.id } },
          select: {
            soldPrice: true, kdvRate: true,
            auction: { select: { commissionRate: true } },
            payments: { select: { buyerPaymentReceived: true, payoutCompleted: true } },
          },
        });

        let totalSales = 0, totalCommission = 0, sellerPayout = 0;
        let collectedFromBuyers = 0, pendingFromBuyers = 0, pendingPayout = 0;
        soldLots.forEach((lot) => {
          const salePrice = lot.soldPrice ?? 0;
          const rate = (lot.auction?.commissionRate ?? 0) / 100;
          const matrah = salePrice * rate;
          const lotKdvRate = 0.20; // Aracılık komisyonu KDV'si sabit %20 (hizmet), ürün oranından bağımsız
          const gross = matrah + matrah * lotKdvRate;
          const payout = salePrice - gross;
          totalSales += salePrice;
          totalCommission += gross;
          sellerPayout += payout;
          const pmt = lot.payments?.[0];
          if (pmt?.buyerPaymentReceived) collectedFromBuyers += salePrice;
          else pendingFromBuyers += salePrice;
          if (!pmt?.payoutCompleted) pendingPayout += payout;
        });

        return {
          ...seller,
          _stats: {
            lotCount,
            totalBids,
            auctionCount: seller._count.auctions,
          },
          _finance: {
            soldLotCount: soldLots.length,
            totalSales: Math.round(totalSales * 100) / 100,
            totalCommission: Math.round(totalCommission * 100) / 100,
            sellerPayout: Math.round(sellerPayout * 100) / 100,
            collectedFromBuyers: Math.round(collectedFromBuyers * 100) / 100,
            pendingFromBuyers: Math.round(pendingFromBuyers * 100) / 100,
            pendingPayout: Math.round(pendingPayout * 100) / 100,
          },
        };
      })
    );

    return NextResponse.json({ sellers: sellersWithStats });
  } catch (error: any) {
    console.error('Admin sellers list error:', error);
    return NextResponse.json({ error: 'Satıcılar yüklenemedi' }, { status: 500 });
  }
}
