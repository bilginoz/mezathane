export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { getPaymentMode } from '@/lib/payment-mode';

function round(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/*
  Kâr/zarar özeti: bir dönemdeki platform GELİRİ ile GİDERİ karşılaştırır. Gelir kaynağı MODA göre
  tamamen farklıdır (bu yüzden ESCROW hesabı olduğu gibi korunur, DIRECT ayrı dallanır):
  - ESCROW (V1): Gelir = satılan lotlardan alıcı hizmet bedeli + satıcı komisyonu (KDV dahil).
    Platform ürün bedelini tahsil eder, komisyon keser.
  - DIRECT (V2): Platform ürün bedelinden hiç pay almaz; TEK geliri satıcıların satın aldığı
    "Müzayede Hakkı"dır. Gelir = dönem içinde ONAYLANAN hak satın almalarının toplamı.
  Gider (Expense kayıtları) her iki modda da aynı şekilde platformun gerçek işletme gideridir.
  ?from=YYYY-MM-DD&to=YYYY-MM-DD — verilmezse içinde bulunulan ay.
*/
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const from = searchParams.get('from')
      ? new Date(searchParams.get('from')!)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date();
    to.setHours(23, 59, 59, 999);

    const mode = await getPaymentMode();

    // --- GELİR ---
    // Her iki modda da bilgi amaçlı satış hacmi/adedi hesaplanır (DIRECT'te bu platform GELİRİ
    // değildir, sadece platformdaki toplam ticaret hacmini göstermek içindir).
    const soldLots = await prisma.lot.findMany({
      where: { status: 'SOLD', updatedAt: { gte: from, lte: to } },
      select: {
        soldPrice: true,
        auction: { select: { commissionRate: true } },
        payments: {
          select: {
            buyerPremiumAmount: true, buyerPremiumKDV: true,
            buyerPaymentReceived: true, status: true,
          },
        },
      },
    });

    let buyerPremium = 0, sellerCommission = 0, collected = 0, pending = 0, salesVolume = 0;
    for (const lot of soldLots) {
      if (!lot.soldPrice) continue;
      salesVolume = round(salesVolume + lot.soldPrice);
      const p = lot.payments?.[0];
      const prem = round((p?.buyerPremiumAmount ?? 0) + (p?.buyerPremiumKDV ?? 0));
      const rate = (lot.auction?.commissionRate ?? 0) / 100;
      const matrah = lot.soldPrice * rate;
      const comm = round(matrah + matrah * 0.20);
      buyerPremium = round(buyerPremium + prem);
      sellerCommission = round(sellerCommission + comm);
      const isPaid = p?.buyerPaymentReceived || p?.status === 'PAID';
      if (isPaid) collected = round(collected + prem + comm);
      else pending = round(pending + prem + comm);
    }

    let totalIncome: number, incomeCollected: number, incomePending: number;
    let rightsInfo: { approvedRevenue: number; approvedCount: number; pendingRevenue: number; pendingCount: number } | null = null;

    if (mode === 'DIRECT') {
      // DIRECT: platform ürün satışından pay almaz. Tek gelir = dönemde ONAYLANAN Müzayede Hakkı alımları.
      const [approvedRights, pendingRights] = await Promise.all([
        prisma.auctionRightPurchase.findMany({
          where: { status: 'APPROVED', approvedAt: { gte: from, lte: to } },
          select: { totalAmount: true },
        }),
        prisma.auctionRightPurchase.findMany({
          where: { status: 'PENDING', createdAt: { gte: from, lte: to } },
          select: { totalAmount: true },
        }),
      ]);
      const approvedRevenue = round(approvedRights.reduce((s, r) => s + r.totalAmount, 0));
      const pendingRevenue = round(pendingRights.reduce((s, r) => s + r.totalAmount, 0));
      rightsInfo = { approvedRevenue, approvedCount: approvedRights.length, pendingRevenue, pendingCount: pendingRights.length };
      totalIncome = approvedRevenue;
      incomeCollected = approvedRevenue; // onaylı = admin ödemeyi teyit etmiş demektir, tahsil edilmiştir
      incomePending = pendingRevenue; // henüz onaylanmamış (dolayısıyla henüz kesin gelir sayılmayan) talepler
    } else {
      totalIncome = round(buyerPremium + sellerCommission);
      incomeCollected = collected;
      incomePending = pending;
    }

    // --- GİDER ---
    const expenses = await prisma.expense.findMany({
      where: { expenseDate: { gte: from, lte: to } },
      select: { category: true, totalAmount: true, kdvAmount: true },
    });
    const totalExpense = round(expenses.reduce((s, e) => s + e.totalAmount, 0));
    const expenseKdv = round(expenses.reduce((s, e) => s + e.kdvAmount, 0));
    const expenseByCategory: Record<string, number> = {};
    for (const e of expenses) {
      expenseByCategory[e.category] = round((expenseByCategory[e.category] ?? 0) + e.totalAmount);
    }

    return NextResponse.json({
      mode,
      period: { from: from.toISOString(), to: to.toISOString() },
      income: {
        buyerPremium, sellerCommission, total: totalIncome,
        collected: incomeCollected, pending: incomePending, salesVolume, soldCount: soldLots.length,
        rights: rightsInfo, // DIRECT'te dolu; ESCROW'da null
      },
      expense: { total: totalExpense, kdv: expenseKdv, count: expenses.length, byCategory: expenseByCategory },
      // Tahakkuk esaslı net (tahsil edilmemiş gelir dahil)
      netProfit: round(totalIncome - totalExpense),
      // Nakit esaslı net (yalnızca tahsil edilen gelir)
      netProfitCollected: round(incomeCollected - totalExpense),
    });
  } catch (error) {
    console.error('Profit-loss error:', error);
    return NextResponse.json({ error: 'Kâr/zarar hesaplanamadı' }, { status: 500 });
  }
}
