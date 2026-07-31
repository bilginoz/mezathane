export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// Admin — SATICI bazlı finans: ne sattı, ne tahsil etti, ne bekliyor + Müzayede Hakkı özeti.
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

    // Satışlar (satılmış lot ödemeleri) satıcıya göre
    const payments = await prisma.payment.findMany({
      where: { lot: { status: 'SOLD' } },
      include: { lot: { select: { auction: { select: { sellerId: true, seller: { select: { companyName: true } } } } } } },
    });

    // Onaylı satıcılar (satışı olmayanlar da listede görünsün diye)
    const sellers = await prisma.sellerProfile.findMany({
      where: { status: 'APPROVED' },
      select: { id: true, companyName: true },
    });

    // Müzayede Hakkı kayıtları
    const rights = await prisma.auctionRightPurchase.findMany({
      select: { sellerId: true, quantity: true, remaining: true, status: true, expiresAt: true },
    });

    const map = new Map<string, any>();
    const ensure = (id: string, name: string) => {
      if (!map.has(id)) {
        map.set(id, {
          sellerId: id, name: name || 'Satıcı',
          soldCount: 0, totalAmount: 0, collected: 0, pending: 0,
          rightsApprovedQty: 0, rightsRemaining: 0, rightsPending: 0, rightsUsed: 0,
          nearestExpiry: null as Date | null,
        });
      }
      return map.get(id);
    };
    sellers.forEach((s) => ensure(s.id, s.companyName));

    for (const p of payments as any[]) {
      const sid = p.lot?.auction?.sellerId;
      if (!sid) continue;
      const c = ensure(sid, p.lot?.auction?.seller?.companyName);
      const amt = p.totalAmount ?? 0;
      c.soldCount += 1;
      c.totalAmount += amt;
      if (isPaid(p)) c.collected += amt; else c.pending += amt;
    }

    for (const r of rights as any[]) {
      const c = map.get(r.sellerId);
      if (!c) continue;
      if (r.status === 'PENDING') c.rightsPending += 1;
      if (r.status === 'APPROVED') {
        c.rightsApprovedQty += r.quantity ?? 0;
        c.rightsRemaining += r.remaining ?? 0;
        c.rightsUsed += Math.max(0, (r.quantity ?? 0) - (r.remaining ?? 0));
        if (r.expiresAt) {
          const exp = new Date(r.expiresAt);
          if (exp > now && (!c.nearestExpiry || exp < c.nearestExpiry)) c.nearestExpiry = exp;
        }
      }
    }

    const list = Array.from(map.values())
      .map((c) => ({
        ...c,
        totalAmount: round2(c.totalAmount), collected: round2(c.collected), pending: round2(c.pending),
        expiryDaysLeft: c.nearestExpiry ? daysBetween(c.nearestExpiry, now) : null,
      }))
      .sort((a, b) => b.pending - a.pending || b.totalAmount - a.totalAmount);

    const summary = {
      sellerCount: list.length,
      totalCollected: round2(list.reduce((s, c) => s + c.collected, 0)),
      totalPending: round2(list.reduce((s, c) => s + c.pending, 0)),
      rightsPendingTotal: list.reduce((s, c) => s + c.rightsPending, 0),
    };
    return NextResponse.json({ sellers: list, summary });
  } catch (e) {
    console.error('admin sellers-finance error', e);
    return NextResponse.json({ error: 'Yüklenemedi' }, { status: 500 });
  }
}
