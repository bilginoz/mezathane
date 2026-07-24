export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

function round(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/*
  Kâr/zarar özeti: bir dönemdeki platform GELİRİ ile GİDERİ karşılaştırır.
  Gelir = satılan lotlardan alıcı hizmet bedeli + satıcı komisyonu (ikisi de KDV dahil).
  Gider = Expense kayıtları (KDV dahil ödenen).
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

    // --- GELİR ---
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
    const totalIncome = round(buyerPremium + sellerCommission);

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
      period: { from: from.toISOString(), to: to.toISOString() },
      income: {
        buyerPremium, sellerCommission, total: totalIncome,
        collected, pending, salesVolume, soldCount: soldLots.length,
      },
      expense: { total: totalExpense, kdv: expenseKdv, count: expenses.length, byCategory: expenseByCategory },
      // Tahakkuk esaslı net (tahsil edilmemiş gelir dahil)
      netProfit: round(totalIncome - totalExpense),
      // Nakit esaslı net (yalnızca tahsil edilen gelir)
      netProfitCollected: round(collected - totalExpense),
    });
  } catch (error) {
    console.error('Profit-loss error:', error);
    return NextResponse.json({ error: 'Kâr/zarar hesaplanamadı' }, { status: 500 });
  }
}
