export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// Alıcının kendi cari hesabı: toplam alış, ödenen, bekleyen borç, gecikmeler
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const userId = (session.user as any).id;

    const payments = await prisma.payment.findMany({
      where: { userId },
      include: {
        lot: {
          select: {
            id: true, lotNumber: true, title: true, status: true, soldPrice: true, currentPrice: true,
            auction: { select: { title: true, seller: { select: { companyName: true } } } },
            images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { imageUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    const items = payments.map((p: any) => {
      const amount = p.amount ?? p.lot?.soldPrice ?? p.lot?.currentPrice ?? 0;
      const isPaid = p.buyerPaymentReceived || p.status === 'PAID';
      const isOverdue = !isPaid && !!p.dueDate && new Date(p.dueDate) < now;
      return {
        paymentId: p.id,
        lotId: p.lot?.id ?? null,
        lotNumber: p.lot?.lotNumber ?? null,
        lotTitle: p.lot?.title ?? '-',
        lotImage: p.lot?.images?.[0]?.imageUrl ?? null,
        auctionTitle: p.lot?.auction?.title ?? '-',
        sellerName: p.lot?.auction?.seller?.companyName ?? '',
        amount,
        status: p.status,
        isPaid,
        isOverdue,
        dueDate: p.dueDate ?? null,
        paidAt: p.paidAt ?? null,
        createdAt: p.createdAt,
      };
    });

    const totalPurchased = items.reduce((s, i) => s + (i.amount || 0), 0);
    const totalPaid = items.filter((i) => i.isPaid).reduce((s, i) => s + (i.amount || 0), 0);
    const pendingDebt = items.filter((i) => !i.isPaid).reduce((s, i) => s + (i.amount || 0), 0);
    const overdueItems = items.filter((i) => i.isOverdue);
    const overdueAmount = overdueItems.reduce((s, i) => s + (i.amount || 0), 0);

    const summary = {
      totalCount: items.length,
      paidCount: items.filter((i) => i.isPaid).length,
      pendingCount: items.filter((i) => !i.isPaid).length,
      totalPurchased,
      totalPaid,
      pendingDebt,
      overdueAmount,
      overdueCount: overdueItems.length,
    };

    return NextResponse.json({ summary, items });
  } catch (error: any) {
    console.error('Buyer finance error:', error);
    return NextResponse.json({ error: 'Hesap özeti yüklenemedi' }, { status: 500 });
  }
}
