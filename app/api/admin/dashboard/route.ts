export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const [totalUsers, totalSellers, pendingSellers, totalAuctions, activeAuctions, totalLots, totalBids, totalPayments] = await Promise.all([
      prisma.user.count(),
      prisma.sellerProfile.count(),
      prisma.sellerProfile.count({ where: { status: 'PENDING' } }),
      prisma.auction.count(),
      prisma.auction.count({ where: { status: { in: ['ACTIVE', 'LIVE'] } } }),
      prisma.lot.count(),
      prisma.bid.count(),
      prisma.payment.aggregate({ _sum: { totalAmount: true }, where: { status: 'PAID' } }),
    ]);

    // --- "Bugün neye bakmalıyım" özeti ---
    // Panele girince iş gerektiren şeylerin tek bakışta görülmesi için.
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [pendingCollect, overdueList, payoutDue, openDisputes, monthExpense] = await Promise.all([
      // Tahsil edilmemiş ödemeler
      prisma.payment.aggregate({
        _sum: { totalAmount: true }, _count: true,
        where: { buyerPaymentReceived: false, status: { notIn: ['PAID', 'REFUNDED'] } },
      }),
      // Vadesi geçmiş olanlar (tutar + adet için liste)
      prisma.payment.findMany({
        where: {
          buyerPaymentReceived: false,
          status: { notIn: ['PAID', 'REFUNDED'] },
          dueDate: { lt: now },
        },
        select: { totalAmount: true },
      }),
      // Tahsil edildi ama satıcıya henüz ödenmedi
      prisma.payment.aggregate({
        _sum: { amount: true }, _count: true,
        where: { buyerPaymentReceived: true, payoutCompleted: false },
      }),
      prisma.dispute.count({ where: { status: { in: ['OPEN', 'IN_REVIEW'] } } }),
      prisma.expense.aggregate({ _sum: { totalAmount: true }, where: { expenseDate: { gte: monthStart } } }),
    ]);

    const overdueAmount = overdueList.reduce((s, p) => s + (p.totalAmount ?? 0), 0);

    const actionSummary = {
      pendingCollectAmount: pendingCollect._sum?.totalAmount ?? 0,
      pendingCollectCount: pendingCollect._count ?? 0,
      overdueAmount,
      overdueCount: overdueList.length,
      payoutDueAmount: payoutDue._sum?.amount ?? 0,
      payoutDueCount: payoutDue._count ?? 0,
      pendingSellers,
      openDisputes,
      monthExpense: monthExpense._sum?.totalAmount ?? 0,
    };

    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    });

    const pendingSellerApps = await prisma.sellerProfile.findMany({
      where: { status: 'PENDING' },
      include: { user: { select: { email: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        totalSellers,
        pendingSellers,
        totalAuctions,
        activeAuctions,
        totalLots,
        totalBids,
        totalRevenue: totalPayments._sum?.totalAmount ?? 0,
      },
      actionSummary,
      recentUsers,
      pendingSellerApps,
    });
  } catch (error: any) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Dashboard yüklenemedi' }, { status: 500 });
  }
}
