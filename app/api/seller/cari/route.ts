export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { getDirectRevenueModel } from '@/lib/revenue-model';

// Satıcı CARİ & İşletme özeti (DIRECT/V2). Sipariş bazlı ödeme takibi:
// her alıcı bir "cari"; borç = siparişin alıcıya toplam tutarı; ödendi = satıcı "ödemeyi aldım" onayı;
// bakiye = onaylanmamış siparişlerin toplamı. Kısmi ödeme yok (karar: sipariş bazlı).
// e-Fatura ileride eklenebilir; kasa/banka ve gider yönetimi kapsam dışı.

const isPaid = (p: any) => !!p.sellerPaymentConfirmedAt || p.status === 'PAID';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const user = session.user as any;
    if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    const sellerProfile = await prisma.sellerProfile.findFirst({ where: { userId: user.id } });
    if (!sellerProfile) return NextResponse.json({ error: 'Satıcı profili yok' }, { status: 404 });

    // Yalnızca satılmış lotların ödeme kayıtları (gerçek satışlar).
    const payments = await prisma.payment.findMany({
      where: { lot: { auction: { sellerId: sellerProfile.id }, status: 'SOLD' } },
      include: {
        lot: { select: { lotNumber: true, title: true, auction: { select: { title: true } } } },
        user: { select: { id: true, fullName: true, email: true, phone: true, isCompany: true, companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Alıcıya göre grupla (cari)
    const map = new Map<string, any>();
    for (const p of payments as any[]) {
      const b = p.user;
      const key = b?.id ?? 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          buyerId: key,
          name: b?.companyName || b?.fullName || 'Bilinmeyen',
          email: b?.email ?? '',
          phone: b?.phone ?? '',
          orderCount: 0,
          totalDebit: 0,   // toplam borç (alıcının ödemesi gereken)
          totalPaid: 0,    // ödenen
          balance: 0,      // kalan bakiye (alacak)
          lastDate: p.createdAt,
          orders: [] as any[],
        });
      }
      const c = map.get(key);
      const debit = p.totalAmount ?? 0;
      const paid = isPaid(p);
      c.orderCount += 1;
      c.totalDebit += debit;
      if (paid) c.totalPaid += debit; else c.balance += debit;
      if (new Date(p.createdAt) > new Date(c.lastDate)) c.lastDate = p.createdAt;
      c.orders.push({
        paymentId: p.id,
        lotNumber: p.lot?.lotNumber ?? null,
        lotTitle: p.lot?.title ?? '-',
        auctionTitle: p.lot?.auction?.title ?? '-',
        hammer: p.amount ?? 0,
        premium: p.buyerPremiumAmount ?? 0,
        kdv: p.buyerPremiumKDV ?? 0,
        total: debit,
        paid,
        paidAt: p.sellerPaymentConfirmedAt ?? p.paidAt ?? null,
        buyerReportedPaidAt: p.buyerReportedPaidAt ?? null,
        shippingStatus: p.shippingStatus ?? null,
        createdAt: p.createdAt,
      });
    }
    const cariler = Array.from(map.values()).sort((a, b) => b.balance - a.balance || b.totalDebit - a.totalDebit);

    // Genel özet
    const totalCiro = payments.reduce((s: number, p: any) => s + (p.totalAmount ?? 0), 0);
    const totalPaid = cariler.reduce((s, c) => s + c.totalPaid, 0);
    const totalBalance = cariler.reduce((s, c) => s + c.balance, 0);

    // İşletme özeti: komisyon geliri (satıcının aldığı), tahsil edilen KDV, Müzayede Hakkı gideri
    const commissionIncome = payments.reduce((s: number, p: any) => s + (p.buyerPremiumAmount ?? 0), 0);
    const kdvCollected = payments.reduce((s: number, p: any) => s + (p.buyerPremiumKDV ?? 0), 0);
    const rightsExpenseAgg = await prisma.auctionRightPurchase.aggregate({
      where: { sellerId: sellerProfile.id, status: 'APPROVED' },
      _sum: { totalAmount: true },
    });
    const rightsExpense = rightsExpenseAgg._sum.totalAmount ?? 0;

    const round2 = (n: number) => Math.round(n * 100) / 100;

    // AŞAMA 3c (2026-08-06): HİZMET_BEDELİ modelinde satıcının platforma borcu.
    // KONTOR'da (varsayılan) tüm satışların serviceFeeAmount'ı null'dır, bu blok sıfır döner.
    const revenueModel = await getDirectRevenueModel();
    let owed = 0, reported = 0, paidToPlatform = 0, nextDueDate: Date | null = null;
    for (const p of payments as any[]) {
      if (p.serviceFeeAmount == null) continue;
      const feeTotal = (p.serviceFeeAmount ?? 0) + (p.serviceFeeKDV ?? 0);
      if (p.serviceFeePaidAt) {
        paidToPlatform += feeTotal;
      } else if (p.serviceFeeSellerReportedAt) {
        reported += feeTotal; // "Ödedim" dedi, admin onayı bekliyor
      } else {
        owed += feeTotal; // henüz bildirilmedi
        if (p.serviceFeeDueDate && (!nextDueDate || new Date(p.serviceFeeDueDate) < nextDueDate)) {
          nextDueDate = p.serviceFeeDueDate;
        }
      }
    }

    return NextResponse.json({
      summary: {
        totalCiro: round2(totalCiro),
        totalPaid: round2(totalPaid),
        totalBalance: round2(totalBalance),
        customerCount: cariler.length,
        orderCount: payments.length,
      },
      business: {
        commissionIncome: round2(commissionIncome),
        kdvCollected: round2(kdvCollected),
        rightsExpense: round2(rightsExpense),
      },
      serviceFee: {
        model: revenueModel,
        owed: round2(owed),          // hiç bildirilmemiş, admin onayı da yok
        reported: round2(reported),  // satıcı "ödedim" dedi, admin onayı bekliyor
        paid: round2(paidToPlatform),
        nextDueDate,
      },
      cariler: cariler.map((c) => ({ ...c, totalDebit: round2(c.totalDebit), totalPaid: round2(c.totalPaid), balance: round2(c.balance) })),
    });
  } catch (error: any) {
    console.error('Seller cari error:', error);
    return NextResponse.json({ error: 'Cari yüklenemedi' }, { status: 500 });
  }
}
