export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// KDV oranı artık lot bazında (lot.kdvRate), varsayılan %20

/*
  MODEL 1 - ARACI MODEL (Satıcı Görünümü)
  ----------------------------------------
  - Satıcı → Alıcıya ürün faturası keser (satış fiyatı üzerinden)
  - Platform → Satıcıya komisyon (hizmet) faturası keser
  - Para akışı: Alıcı → Platform → Satıcıya (komisyon düşülür)
*/

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const user = session.user as any;
    if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const sellerProfile = await prisma.sellerProfile.findFirst({
      where: { userId: user.id },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, phone: true },
        },
        auctions: {
          include: {
            lots: {
              where: { status: 'SOLD' },
              include: {
                payments: true,
              },
            },
          },
        },
      },
    });

    if (!sellerProfile) {
      return NextResponse.json({ error: 'Satıcı profili bulunamadı' }, { status: 404 });
    }

    const sellerWithAuctions = sellerProfile as any;

    let totalSales = 0;
    let totalCommission = 0;
    let totalCommissionKDV = 0;
    let totalNetCommission = 0;
    let soldLotCount = 0;
    const transactions: any[] = [];

    sellerWithAuctions.auctions.forEach((auction: any) => {
      auction.lots.forEach((lot: any) => {
        if (lot.status === 'SOLD' && lot.soldPrice) {
          soldLotCount++;
          const salePrice = lot.soldPrice;
          const commissionRate = auction.commissionRate / 100;
          // Komisyon = satış fiyatı × oran (matrah), KDV ayrıca eklenir
          const commissionMatrah = salePrice * commissionRate;
          const lotKdvRate = (lot.kdvRate ?? 20) / 100;
          const commissionKDV = commissionMatrah * lotKdvRate;
          const grossCommission = commissionMatrah + commissionKDV;
          const netCommission = commissionMatrah;
          const sellerPayout = salePrice - grossCommission;

          totalSales += salePrice;
          totalCommission += grossCommission;
          totalCommissionKDV += commissionKDV;
          totalNetCommission += netCommission;

          transactions.push({
            lotId: lot.id,
            lotTitle: lot.title,
            lotNumber: lot.lotNumber,
            auctionTitle: auction.title,
            auctionId: auction.id,
            salePrice,
            commissionRate: auction.commissionRate,
            grossCommission: Math.round(grossCommission * 100) / 100,
            netCommission: Math.round(netCommission * 100) / 100,
            commissionKDV: Math.round(commissionKDV * 100) / 100,
            sellerPayout: Math.round(sellerPayout * 100) / 100,
            // Satıcının alıcıya keseceği fatura tutarı
            sellerInvoiceAmount: salePrice,
            // Platformun satıcıya keseceği hizmet faturası
            platformInvoiceAmount: Math.round(grossCommission * 100) / 100,
            platformInvoiceMatrah: Math.round(netCommission * 100) / 100,
            platformInvoiceKDV: Math.round(commissionKDV * 100) / 100,
            buyerName: '',
            buyerEmail: '',
            paymentStatus: lot.payments?.[0]?.status ?? 'PENDING',
            sellerInvoiceIssued: lot.payments?.[0]?.sellerInvoiceIssued ?? false,
            platformInvoiceIssued: lot.payments?.[0]?.platformInvoiceIssued ?? false,
            buyerPaymentReceived: lot.payments?.[0]?.buyerPaymentReceived ?? false,
            payoutCompleted: lot.payments?.[0]?.payoutCompleted ?? false,
            soldAt: lot.updatedAt,
          });
        }
      });
    });

    return NextResponse.json({
      seller: {
        companyName: sellerProfile.companyName,
        taxOffice: sellerProfile.taxOffice,
        taxNumber: sellerProfile.taxNumber,
        companyAddress: sellerProfile.companyAddress,
      },
      summary: {
        totalSales: Math.round(totalSales * 100) / 100,
        totalCommission: Math.round(totalCommission * 100) / 100,
        totalNetCommission: Math.round(totalNetCommission * 100) / 100,
        totalCommissionKDV: Math.round(totalCommissionKDV * 100) / 100,
        soldLotCount,
        sellerPayout: Math.round((totalSales - totalCommission) * 100) / 100,
      },
      transactions,
    });
  } catch (error: any) {
    console.error('Seller finance error:', error);
    return NextResponse.json({ error: 'Finans verileri yüklenemedi' }, { status: 500 });
  }
}
