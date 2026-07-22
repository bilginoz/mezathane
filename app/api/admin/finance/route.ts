export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { logLotEvent } from '@/lib/lot-history';

// KDV oranı artık lot bazında (lot.kdvRate), varsayılan %20

/*
  MODEL 1 - ARACI MODEL
  ---------------------
  - Satıcı → Alıcıya ürün faturası keser (satış fiyatı üzerinden)
  - Platform → Satıcıya komisyon (hizmet) faturası keser
  - Para akışı: Alıcı → Platform → Satıcıya (komisyon düşülür)
*/

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const sellerId = searchParams.get('sellerId');

    const sellers = await prisma.sellerProfile.findMany({
      where: sellerId ? { id: sellerId } : undefined,
      include: {
        user: {
          select: { id: true, email: true, fullName: true, phone: true },
        },
        auctions: {
          include: {
            lots: {
              where: { status: 'SOLD' },
              include: {
                payments: {
                  include: {
                    user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { companyName: 'asc' },
    });

    const sellerFinance = sellers.map((seller) => {
      let totalSales = 0;
      let totalCommission = 0;
      let totalCommissionKDV = 0;
      let totalNetCommission = 0;
      let totalBuyerPremium = 0;
      let totalBuyerPremiumKDV = 0;
      let soldLotCount = 0;
      const transactions: any[] = [];

      seller.auctions.forEach((auction) => {
        auction.lots.forEach((lot) => {
          if (lot.status === 'SOLD' && lot.soldPrice) {
            soldLotCount++;
            const salePrice = lot.soldPrice;
            const commissionRate = auction.commissionRate / 100;
            // Komisyon = satış fiyatı × oran (matrah), KDV ayrıca eklenir
            const commissionMatrah = salePrice * commissionRate;
            const lotKdvRate = 0.20; // Aracılık komisyonu KDV'si sabit %20 (hizmet), ürün oranından bağımsız
            const commissionKDV = commissionMatrah * lotKdvRate;
            const grossCommission = commissionMatrah + commissionKDV;
            const netCommission = commissionMatrah;

            totalSales += salePrice;
            totalCommission += grossCommission;
            totalCommissionKDV += commissionKDV;
            totalNetCommission += netCommission;

            const payment = lot.payments?.[0];
            const buyerPremAmt = payment?.buyerPremiumAmount ?? 0;
            const buyerPremKDV = payment?.buyerPremiumKDV ?? 0;
            totalBuyerPremium += buyerPremAmt;
            totalBuyerPremiumKDV += buyerPremKDV;
            const buyer = payment?.user ?? null;
            const dueDate = payment?.dueDate ?? null;
            const isOverdue = !payment?.buyerPaymentReceived && payment?.status !== 'PAID' && dueDate != null && new Date(dueDate).getTime() < Date.now();
            const daysOverdue = isOverdue && dueDate != null ? Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000) : 0;

            transactions.push({
              lotId: lot.id,
              lotTitle: lot.title,
              lotNumber: lot.lotNumber,
              auctionTitle: auction.title,
              auctionId: auction.id,
              salePrice,
              buyerId: buyer?.id ?? null,
              buyerName: buyer?.fullName ?? null,
              buyerEmail: buyer?.email ?? null,
              buyerPhone: buyer?.phone ?? null,
              buyerActive: buyer?.isActive ?? true,
              dueDate,
              isOverdue,
              daysOverdue,
              commissionRate: auction.commissionRate,
              grossCommission: Math.round(grossCommission * 100) / 100,
              netCommission: Math.round(netCommission * 100) / 100,
              commissionKDV: Math.round(commissionKDV * 100) / 100,
              sellerPayout: Math.round((salePrice - grossCommission) * 100) / 100,
              sellerInvoiceAmount: salePrice,
              platformInvoiceAmount: Math.round(grossCommission * 100) / 100,
              platformInvoiceMatrah: Math.round(netCommission * 100) / 100,
              platformInvoiceKDV: Math.round(commissionKDV * 100) / 100,
              paymentId: payment?.id ?? null,
              paymentStatus: payment?.status ?? 'PENDING',
              sellerInvoiceIssued: payment?.sellerInvoiceIssued ?? false,
              platformInvoiceIssued: payment?.platformInvoiceIssued ?? false,
              buyerPaymentReceived: payment?.buyerPaymentReceived ?? false,
              payoutCompleted: payment?.payoutCompleted ?? false,
              adminNotes: payment?.adminNotes ?? null,
              soldAt: lot.updatedAt,
              // Kargo bilgileri
              shippingStatus: payment?.shippingStatus ?? 'PREPARING',
              trackingNumber: payment?.trackingNumber ?? null,
              trackingCompany: payment?.trackingCompany ?? null,
              shippedAt: payment?.shippedAt ?? null,
              deliveredAt: payment?.deliveredAt ?? null,
              paymentMethod: payment?.paymentMethod ?? null,
              paidAt: payment?.paidAt ?? null,
              sellerId: seller.id,
              // Alıcı komisyonu
              buyerPremiumRate: payment?.buyerPremiumRate ?? 0,
              buyerPremiumAmount: Math.round(buyerPremAmt * 100) / 100,
              buyerPremiumKDV: Math.round(buyerPremKDV * 100) / 100,
              buyerTotalAmount: Math.round((payment?.totalAmount ?? salePrice) * 100) / 100,
            });
          }
        });
      });

      return {
        sellerId: seller.id,
        companyName: seller.companyName,
        taxOffice: seller.taxOffice,
        taxNumber: seller.taxNumber,
        companyAddress: seller.companyAddress,
        user: seller.user,
        status: seller.status,
        summary: {
          totalSales: Math.round(totalSales * 100) / 100,
          totalCommission: Math.round(totalCommission * 100) / 100,
          totalNetCommission: Math.round(totalNetCommission * 100) / 100,
          totalCommissionKDV: Math.round(totalCommissionKDV * 100) / 100,
          soldLotCount,
          sellerPayout: Math.round((totalSales - totalCommission) * 100) / 100,
          totalBuyerPremium: Math.round(totalBuyerPremium * 100) / 100,
          totalBuyerPremiumKDV: Math.round(totalBuyerPremiumKDV * 100) / 100,
        },
        transactions,
      };
    });

    const platformTotals = {
      totalSales: sellerFinance.reduce((s, sf) => s + sf.summary.totalSales, 0),
      totalCommission: sellerFinance.reduce((s, sf) => s + sf.summary.totalCommission, 0),
      totalNetCommission: sellerFinance.reduce((s, sf) => s + sf.summary.totalNetCommission, 0),
      totalCommissionKDV: sellerFinance.reduce((s, sf) => s + sf.summary.totalCommissionKDV, 0),
      totalSoldLots: sellerFinance.reduce((s, sf) => s + sf.summary.soldLotCount, 0),
      totalBuyerPremium: sellerFinance.reduce((s, sf) => s + sf.summary.totalBuyerPremium, 0),
      totalBuyerPremiumKDV: sellerFinance.reduce((s, sf) => s + sf.summary.totalBuyerPremiumKDV, 0),
    };

    return NextResponse.json({ sellers: sellerFinance, platformTotals });
  } catch (error: any) {
    console.error('Admin finance error:', error);
    return NextResponse.json({ error: 'Finans verileri yüklenemedi' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const body = await request.json();
    const { paymentId, field, value, adminNotes, paymentDetails } = body;

    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID gerekli' }, { status: 400 });
    }

    const allowedFields = ['sellerInvoiceIssued', 'platformInvoiceIssued', 'buyerPaymentReceived', 'payoutCompleted'];

    const updateData: any = {};

    if (field && allowedFields.includes(field)) {
      updateData[field] = Boolean(value);
      // buyerPaymentReceived true olunca ödeme durumunu PAID yap
      if (field === 'buyerPaymentReceived' && Boolean(value)) {
        updateData.status = 'PAID';
        updateData.paidAt = paymentDetails?.paymentDate ? new Date(paymentDetails.paymentDate) : new Date();
        if (paymentDetails?.paymentMethod) updateData.paymentMethod = paymentDetails.paymentMethod;
      }
      // buyerPaymentReceived false yapılırsa PENDING'e geri döndür
      if (field === 'buyerPaymentReceived' && !Boolean(value)) {
        updateData.status = 'PENDING';
        updateData.paidAt = null;
      }
      // payoutCompleted true olunca ödeme yöntemi kaydet
      if (field === 'payoutCompleted' && Boolean(value)) {
        if (paymentDetails?.paymentMethod) updateData.paymentMethod = paymentDetails.paymentMethod;
      }
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan belirtilmedi' }, { status: 400 });
    }

    // Payment'ı ilişkili verilerle birlikte çek (LedgerEntry oluşturmak için gerekli)
    const existingPayment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        lot: {
          select: {
            id: true, title: true, lotNumber: true, soldPrice: true, kdvRate: true,
            auction: { select: { title: true, commissionRate: true, sellerId: true } },
          },
        },
      },
    });
    if (!existingPayment) {
      return NextResponse.json({ error: 'Ödeme kaydı bulunamadı' }, { status: 404 });
    }

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: updateData,
      include: { lot: { select: { id: true } } },
    });

    const adminId = (session.user as any).id;
    const lot = existingPayment.lot;
    const salePrice = lot?.soldPrice ?? existingPayment.amount ?? 0;
    const commissionRate = (lot?.auction?.commissionRate ?? 0) / 100;
    const commissionMatrah = salePrice * commissionRate;
    const lotKdvRatePatch = 0.20; // Aracılık komisyonu KDV'si sabit %20 (hizmet), ürün oranından bağımsız
    const commissionKDV = commissionMatrah * lotKdvRatePatch;
    const grossCommission = Math.round((commissionMatrah + commissionKDV) * 100) / 100;
    const sellerPayout = Math.round((salePrice - grossCommission) * 100) / 100;
    const lotDesc = `${lot?.title ?? 'Ürün'} — ${lot?.auction?.title ?? 'Müzayede'}`;

    // ===== ALICI ÖDEMESİ ALINDI → Otomatik LedgerEntry oluştur =====
    if (field === 'buyerPaymentReceived' && Boolean(value)) {
      const pMethod = paymentDetails?.paymentMethod || null;
      const pBank = paymentDetails?.bankName || null;
      const pDate = paymentDetails?.paymentDate ? new Date(paymentDetails.paymentDate) : new Date();
      const pNote = paymentDetails?.note || null;

      // Alıcı toplam ödeme = çekiç fiyatı + alıcı komisyonu + KDV
      const buyerPremAmt = existingPayment.buyerPremiumAmount ?? 0;
      const buyerPremKDVAmt = existingPayment.buyerPremiumKDV ?? 0;
      const buyerTotalPaid = salePrice + buyerPremAmt + buyerPremKDVAmt;

      // 1) Alıcı carisine CREDIT (tahsilat — toplam ödeme)
      await prisma.ledgerEntry.create({
        data: {
          accountType: 'BUYER',
          userId: existingPayment.userId,
          entryType: 'CREDIT',
          amount: buyerTotalPaid,
          description: `Ödeme alındı (Çekiç: ${salePrice.toLocaleString('tr-TR')}₺ + Komisyon+KDV: ${(buyerPremAmt + buyerPremKDVAmt).toLocaleString('tr-TR')}₺) — ${lotDesc}`,
          category: 'tahsilat',
          paymentMethod: pMethod,
          bankName: pBank,
          entryDate: pDate,
          relatedPaymentId: paymentId,
          relatedLotId: lot?.id || null,
          createdById: adminId,
        },
      });

      // 2) Platform carisine CREDIT (satıcı komisyonu + alıcı komisyonu)
      const totalPlatformRevenue = grossCommission + buyerPremAmt + buyerPremKDVAmt;
      await prisma.ledgerEntry.create({
        data: {
          accountType: 'PLATFORM',
          entryType: 'CREDIT',
          amount: totalPlatformRevenue,
          description: `Komisyon geliri (Satıcı: ${grossCommission.toLocaleString('tr-TR')}₺ + Alıcı: ${(buyerPremAmt + buyerPremKDVAmt).toLocaleString('tr-TR')}₺) — ${lotDesc}`,
          category: 'komisyon',
          paymentMethod: pMethod,
          entryDate: pDate,
          relatedPaymentId: paymentId,
          relatedLotId: lot?.id || null,
          createdById: adminId,
        },
      });

      // 3) Satıcı carisine CREDIT (hakediş — ödeme alındı, gönderim bekliyor)
      if (lot?.auction?.sellerId) {
        await prisma.ledgerEntry.create({
          data: {
            accountType: 'SELLER',
            sellerId: lot.auction.sellerId,
            entryType: 'CREDIT',
            amount: sellerPayout,
            description: `Hakediş doğdu — ${lotDesc}`,
            category: 'hakedis',
            entryDate: pDate,
            relatedPaymentId: paymentId,
            relatedLotId: lot.id,
            createdById: adminId,
          },
        });
      }

      if (pNote) {
        updateData.adminNotes = [existingPayment.adminNotes, pNote].filter(Boolean).join(' | ');
        await prisma.payment.update({ where: { id: paymentId }, data: { adminNotes: updateData.adminNotes } });
      }
    }

    // ===== ALICI ÖDEMESİ GERİ ALINDI → İlgili LedgerEntry'leri sil =====
    if (field === 'buyerPaymentReceived' && !Boolean(value)) {
      await prisma.ledgerEntry.deleteMany({
        where: { relatedPaymentId: paymentId, category: { in: ['tahsilat', 'komisyon', 'hakedis'] }, createdById: { not: null } },
      });
    }

    // ===== SATICIYA ÖDEME YAPILDI → Otomatik LedgerEntry oluştur =====
    if (field === 'payoutCompleted' && Boolean(value)) {
      const pMethod = paymentDetails?.paymentMethod || null;
      const pBank = paymentDetails?.bankName || null;
      const pDate = paymentDetails?.paymentDate ? new Date(paymentDetails.paymentDate) : new Date();
      const pNote = paymentDetails?.note || null;

      if (lot?.auction?.sellerId) {
        await prisma.ledgerEntry.create({
          data: {
            accountType: 'SELLER',
            sellerId: lot.auction.sellerId,
            entryType: 'DEBIT',
            amount: sellerPayout,
            description: `Satıcıya ödendi — ${lotDesc}`,
            category: 'odeme',
            paymentMethod: pMethod,
            bankName: pBank,
            entryDate: pDate,
            relatedPaymentId: paymentId,
            relatedLotId: lot.id,
            createdById: adminId,
          },
        });
      }

      if (pNote) {
        const currentNotes = (await prisma.payment.findUnique({ where: { id: paymentId }, select: { adminNotes: true } }))?.adminNotes;
        const combinedNotes = [currentNotes, pNote].filter(Boolean).join(' | ');
        await prisma.payment.update({ where: { id: paymentId }, data: { adminNotes: combinedNotes } });
      }
    }

    // ===== SATICI ÖDEMESİ GERİ ALINDI → İlgili LedgerEntry'leri sil =====
    if (field === 'payoutCompleted' && !Boolean(value)) {
      await prisma.ledgerEntry.deleteMany({
        where: { relatedPaymentId: paymentId, accountType: 'SELLER', category: 'odeme' },
      });
    }

    // Lot geçmişine ödeme durumu kaydı
    if ((updated as any).lot?.id) {
      const eventDesc = field === 'buyerPaymentReceived'
        ? (Boolean(value) ? 'Alıcı ödemesi alındı' : 'Alıcı ödemesi geri alındı')
        : field === 'payoutCompleted'
        ? (Boolean(value) ? 'Satıcıya ödeme yapıldı' : 'Satıcı ödemesi geri alındı')
        : `${field} güncellendi`;
      logLotEvent({ lotId: (updated as any).lot.id, event: 'PAYMENT', description: eventDesc, userId: adminId });
    }

    await logAudit({
      userId: adminId,
      userName: (session.user as any).fullName || (session.user as any).email,
      action: 'PAYMENT',
      entity: 'Payment',
      entityId: paymentId,
      details: { ...updateData, paymentDetails },
    });

    return NextResponse.json({ success: true, payment: updated });
  } catch (error: any) {
    console.error('Admin finance PATCH error:', error);
    return NextResponse.json({ error: 'İşlem güncellenemedi' }, { status: 500 });
  }
}
