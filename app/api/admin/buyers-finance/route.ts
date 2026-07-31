export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// Admin — ALICI bazlı finans/ödeme takibi: her alıcı ne aldı, ne ödedi, ne bekliyor, vade/kaç gün kaldı.
const isPaid = (p: any) => !!p.sellerPaymentConfirmedAt || p.status === 'PAID' || p.buyerPaymentReceived;
const round2 = (n: number) => Math.round(n * 100) / 100;
const daysBetween = (d: Date, now: Date) => Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }
  try {
    const now = new Date();
    const payments = await prisma.payment.findMany({
      where: { lot: { status: 'SOLD' } },
      include: {
        lot: { select: { lotNumber: true, title: true, auction: { select: { seller: { select: { companyName: true } } } } } },
        user: { select: { id: true, fullName: true, email: true, phone: true, companyName: true, isActive: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const map = new Map<string, any>();
    for (const p of payments as any[]) {
      const b = p.user;
      const key = b?.id ?? 'unknown';
      if (!map.has(key)) {
        map.set(key, {
          buyerId: key,
          name: b?.companyName || b?.fullName || 'Bilinmeyen',
          email: b?.email ?? '', phone: b?.phone ?? '', isActive: b?.isActive ?? true,
          orderCount: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0,
          nearestDue: null as Date | null, overdue: false,
          orders: [] as any[],
        });
      }
      const c = map.get(key);
      const amt = p.totalAmount ?? 0;
      const paid = isPaid(p);
      c.orderCount += 1;
      c.totalAmount += amt;
      if (paid) c.paidAmount += amt;
      else {
        c.pendingAmount += amt;
        if (p.dueDate) {
          const due = new Date(p.dueDate);
          if (!c.nearestDue || due < c.nearestDue) c.nearestDue = due;
          if (due < now) c.overdue = true;
        }
      }
      c.orders.push({
        paymentId: p.id, lotNumber: p.lot?.lotNumber ?? null, lotTitle: p.lot?.title ?? '-',
        sellerName: p.lot?.auction?.seller?.companyName ?? '-',
        total: amt, paid, dueDate: p.dueDate, paidAt: p.sellerPaymentConfirmedAt ?? p.paidAt ?? null,
        createdAt: p.createdAt,
      });
    }

    const buyers = Array.from(map.values())
      .map((c) => ({
        ...c,
        totalAmount: round2(c.totalAmount), paidAmount: round2(c.paidAmount), pendingAmount: round2(c.pendingAmount),
        daysLeft: c.nearestDue ? daysBetween(c.nearestDue, now) : null,
      }))
      .sort((a, b) => (b.overdue ? 1 : 0) - (a.overdue ? 1 : 0) || b.pendingAmount - a.pendingAmount);

    const summary = {
      buyerCount: buyers.length,
      totalPending: round2(buyers.reduce((s, b) => s + b.pendingAmount, 0)),
      overdueCount: buyers.filter((b) => b.overdue).length,
    };
    return NextResponse.json({ buyers, summary });
  } catch (e) {
    console.error('admin buyers-finance error', e);
    return NextResponse.json({ error: 'Yüklenemedi' }, { status: 500 });
  }
}
