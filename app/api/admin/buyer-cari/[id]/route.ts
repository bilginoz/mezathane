export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// Admin — belirli bir ALICININ carisi (DIRECT): bu alıcı hangi satıcıdan ne aldı, ödedi mi,
// bekliyor mu, vade/kaç gün kaldı. Satıcı bazlı gruplu, sipariş bazlı ödeme takibi.
const isPaid = (p: any) => !!p.sellerPaymentConfirmedAt || p.status === 'PAID' || p.buyerPaymentReceived;
const round2 = (n: number) => Math.round(n * 100) / 100;
const daysBetween = (d: Date, now: Date) => Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }
  try {
    const { id: buyerId } = await params;
    const now = new Date();

    const buyer = await prisma.user.findUnique({
      where: { id: buyerId },
      select: { id: true, fullName: true, email: true, phone: true, isActive: true, companyName: true },
    });
    if (!buyer) return NextResponse.json({ error: 'Alıcı bulunamadı' }, { status: 404 });

    const payments = await prisma.payment.findMany({
      where: { userId: buyerId, lot: { status: 'SOLD' } },
      include: {
        lot: { select: { lotNumber: true, title: true, auction: { select: { title: true, sellerId: true, seller: { select: { companyName: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Satıcıya göre grupla (cari)
    const map = new Map<string, any>();
    for (const p of payments as any[]) {
      const sellerId = p.lot?.auction?.sellerId ?? 'unknown';
      if (!map.has(sellerId)) {
        map.set(sellerId, {
          sellerId, name: p.lot?.auction?.seller?.companyName ?? 'Bilinmeyen',
          orderCount: 0, totalDebit: 0, totalPaid: 0, balance: 0, nearestDue: null as Date | null, overdue: false,
          orders: [] as any[],
        });
      }
      const c = map.get(sellerId);
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
      totalSpent: round2(payments.reduce((s: number, p: any) => s + (p.totalAmount ?? 0), 0)),
      totalPaid: round2(cariler.reduce((s, c) => s + c.totalPaid, 0)),
      totalBalance: round2(cariler.reduce((s, c) => s + c.balance, 0)),
      sellerCount: cariler.length,
      orderCount: payments.length,
      overdueCount: cariler.filter((c) => c.overdue).length,
    };

    return NextResponse.json({
      buyer: { id: buyer.id, name: buyer.companyName || buyer.fullName, email: buyer.email, phone: buyer.phone, isActive: buyer.isActive },
      summary, cariler,
    });
  } catch (e) {
    console.error('admin buyer-cari error', e);
    return NextResponse.json({ error: 'Yüklenemedi' }, { status: 500 });
  }
}
