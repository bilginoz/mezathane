export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// Admin — belirli bir SATICININ carisi (DIRECT): bu satıcıdan kim hangi lotu aldı, komisyon,
// ödendi mi/bekliyor mu, alıcı bazlı bakiye. Sipariş bazlı ödeme takibi.
const isPaid = (p: any) => !!p.sellerPaymentConfirmedAt || p.status === 'PAID' || p.buyerPaymentReceived;
const round2 = (n: number) => Math.round(n * 100) / 100;
const daysBetween = (d: Date, now: Date) => Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }
  try {
    const { id: sellerId } = await params;
    const now = new Date();

    const seller = await prisma.sellerProfile.findUnique({
      where: { id: sellerId },
      select: { id: true, companyName: true, iban: true, buyerPremiumRate: true, user: { select: { email: true, phone: true } } },
    });
    if (!seller) return NextResponse.json({ error: 'Satıcı bulunamadı' }, { status: 404 });

    const payments = await prisma.payment.findMany({
      where: { lot: { auction: { sellerId }, status: 'SOLD' } },
      include: {
        lot: { select: { lotNumber: true, title: true, auction: { select: { title: true } } } },
        user: { select: { id: true, fullName: true, email: true, phone: true, companyName: true } },
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
          buyerId: key, name: b?.companyName || b?.fullName || 'Bilinmeyen',
          email: b?.email ?? '', phone: b?.phone ?? '',
          orderCount: 0, totalDebit: 0, totalPaid: 0, balance: 0, nearestDue: null as Date | null, overdue: false,
          orders: [] as any[],
        });
      }
      const c = map.get(key);
      const debit = p.totalAmount ?? 0;
      const paid = isPaid(p);
      c.orderCount += 1;
      c.totalDebit += debit;
      if (paid) c.totalPaid += debit;
      else {
        c.balance += debit;
        if (p.dueDate) { const due = new Date(p.dueDate); if (!c.nearestDue || due < c.nearestDue) c.nearestDue = due; if (due < now) c.overdue = true; }
      }
      c.orders.push({
        paymentId: p.id, lotNumber: p.lot?.lotNumber ?? null, lotTitle: p.lot?.title ?? '-',
        hammer: p.amount ?? 0, commission: p.buyerPremiumAmount ?? 0, kdv: p.buyerPremiumKDV ?? 0,
        commissionRate: p.buyerPremiumRate ?? 0, total: debit, paid,
        dueDate: p.dueDate, paidAt: p.sellerPaymentConfirmedAt ?? p.paidAt ?? null, createdAt: p.createdAt,
      });
    }
    const cariler = Array.from(map.values())
      .map((c) => ({ ...c, totalDebit: round2(c.totalDebit), totalPaid: round2(c.totalPaid), balance: round2(c.balance), daysLeft: c.nearestDue ? daysBetween(c.nearestDue, now) : null }))
      .sort((a, b) => b.balance - a.balance || b.totalDebit - a.totalDebit);

    const summary = {
      totalCiro: round2(payments.reduce((s: number, p: any) => s + (p.totalAmount ?? 0), 0)),
      totalPaid: round2(cariler.reduce((s, c) => s + c.totalPaid, 0)),
      totalBalance: round2(cariler.reduce((s, c) => s + c.balance, 0)),
      customerCount: cariler.length,
      orderCount: payments.length,
      commissionIncome: round2(payments.reduce((s: number, p: any) => s + (p.buyerPremiumAmount ?? 0), 0)),
      kdvCollected: round2(payments.reduce((s: number, p: any) => s + (p.buyerPremiumKDV ?? 0), 0)),
    };

    // Müzayede Hakkı özeti (aynı ekranda görünsün — başka ekrana gitmeye gerek kalmasın)
    const rightsRows = await prisma.auctionRightPurchase.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, planType: true, quantity: true, remaining: true, status: true, totalAmount: true, expiresAt: true, createdAt: true, paymentReportedAt: true },
    });
    let approvedQty = 0, remaining = 0, pendingCount = 0, usedQty = 0, nearestExpiry: Date | null = null;
    let unlimitedActive = false, unlimitedExpiresAt: Date | null = null;
    for (const r of rightsRows as any[]) {
      if (r.status === 'PENDING') pendingCount += 1;
      if (r.status === 'APPROVED' && r.planType === 'UNLIMITED_MONTHLY') {
        if (r.expiresAt && new Date(r.expiresAt) > now) { unlimitedActive = true; unlimitedExpiresAt = new Date(r.expiresAt); }
        continue; // sınırsız plan adet sayaçlarına dahil edilmez
      }
      if (r.status === 'APPROVED') {
        approvedQty += r.quantity ?? 0;
        remaining += r.remaining ?? 0;
        usedQty += Math.max(0, (r.quantity ?? 0) - (r.remaining ?? 0));
        if (r.expiresAt) { const exp = new Date(r.expiresAt); if (exp > now && (!nearestExpiry || exp < nearestExpiry)) nearestExpiry = exp; }
      }
    }
    const rights = {
      approvedQty, remaining, usedQty, pendingCount,
      unlimitedActive, unlimitedExpiresAt,
      nearestExpiry, expiryDaysLeft: nearestExpiry ? daysBetween(nearestExpiry, now) : null,
      history: rightsRows.map((r: any) => ({ ...r, expiryDaysLeft: r.expiresAt ? daysBetween(new Date(r.expiresAt), now) : null })),
    };

    return NextResponse.json({
      seller: { id: seller.id, name: seller.companyName, iban: seller.iban, buyerPremiumRate: seller.buyerPremiumRate, email: seller.user?.email, phone: seller.user?.phone },
      summary, cariler, rights,
    });
  } catch (e) {
    console.error('admin seller-cari error', e);
    return NextResponse.json({ error: 'Yüklenemedi' }, { status: 500 });
  }
}
