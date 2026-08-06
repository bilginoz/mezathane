export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { createInAppNotification } from '@/lib/notifications';
import { logAudit } from '@/lib/audit';

// AŞAMA 3d (2026-08-06): Admin — HİZMET_BEDELİ modelinde satıcıların platforma borcu.
// Satıcı "Ödedim" dedikten (serviceFeeSellerReportedAt) sonra burada onaylanır (serviceFeePaidAt) —
// onaylanana kadar borç açık sayılır ve /api/auctions'daki vade kısıtlaması devrede kalır.

const round2 = (n: number) => Math.round(n * 100) / 100;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const payments = await prisma.payment.findMany({
      where: { serviceFeeAmount: { not: null } },
      select: {
        id: true,
        serviceFeeAmount: true,
        serviceFeeKDV: true,
        serviceFeeDueDate: true,
        serviceFeeSellerReportedAt: true,
        serviceFeePaidAt: true,
        lot: { select: { auction: { select: { seller: { select: { id: true, companyName: true, userId: true } } } } } },
      },
    });

    const map = new Map<string, any>();
    for (const p of payments) {
      const seller = p.lot?.auction?.seller;
      if (!seller) continue;
      if (!map.has(seller.id)) {
        map.set(seller.id, {
          sellerId: seller.id,
          userId: seller.userId,
          name: seller.companyName ?? 'Bilinmeyen',
          owed: 0,
          reported: 0,
          paid: 0,
          overdueCount: 0,
          reportedCount: 0,
        });
      }
      const c = map.get(seller.id);
      const feeTotal = (p.serviceFeeAmount ?? 0) + (p.serviceFeeKDV ?? 0);
      if (p.serviceFeePaidAt) {
        c.paid += feeTotal;
      } else if (p.serviceFeeSellerReportedAt) {
        c.reported += feeTotal;
        c.reportedCount += 1;
      } else {
        c.owed += feeTotal;
        if (p.serviceFeeDueDate && new Date(p.serviceFeeDueDate) < new Date()) c.overdueCount += 1;
      }
    }

    const sellers = Array.from(map.values())
      .map((c) => ({ ...c, owed: round2(c.owed), reported: round2(c.reported), paid: round2(c.paid) }))
      .sort((a, b) => b.reported - a.reported || b.owed - a.owed);

    const summary = sellers.reduce(
      (s, c) => ({ totalOwed: s.totalOwed + c.owed, totalReported: s.totalReported + c.reported, totalPaid: s.totalPaid + c.paid }),
      { totalOwed: 0, totalReported: 0, totalPaid: 0 }
    );

    return NextResponse.json({ sellers, summary: { totalOwed: round2(summary.totalOwed), totalReported: round2(summary.totalReported), totalPaid: round2(summary.totalPaid) } });
  } catch (error: any) {
    console.error('Admin service-fee GET error:', error);
    return NextResponse.json({ error: 'Yüklenemedi' }, { status: 500 });
  }
}

// Admin bir satıcının BİLDİRDİĞİ (serviceFeeSellerReportedAt dolu, serviceFeePaidAt boş) tüm
// hizmet bedeli kayıtlarını onaylar → borç kapanır, vade kısıtlaması kalkar.
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const adminId = (session.user as any).id as string;
    const body = await request.json();
    const { sellerId } = body as { sellerId?: string };
    if (!sellerId) return NextResponse.json({ error: 'Satıcı seçin' }, { status: 400 });

    const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId }, select: { id: true, companyName: true, userId: true } });
    if (!seller) return NextResponse.json({ error: 'Satıcı bulunamadı' }, { status: 404 });

    const reported = await prisma.payment.findMany({
      where: {
        lot: { auction: { sellerId } },
        serviceFeeSellerReportedAt: { not: null },
        serviceFeePaidAt: null,
      },
      select: { id: true, serviceFeeAmount: true, serviceFeeKDV: true },
    });
    if (reported.length === 0) {
      return NextResponse.json({ error: 'Onaylanacak bildirim yok' }, { status: 400 });
    }
    const now = new Date();
    await prisma.payment.updateMany({
      where: { id: { in: reported.map((r) => r.id) } },
      data: { serviceFeePaidAt: now },
    });
    const totalApproved = reported.reduce((s, r) => s + (r.serviceFeeAmount ?? 0) + (r.serviceFeeKDV ?? 0), 0);

    await createInAppNotification({
      userId: seller.userId,
      title: '✅ Hizmet bedeli ödemeniz onaylandı',
      message: `${reported.length} sipariş için toplam ${totalApproved.toLocaleString('tr-TR')} ₺ hizmet bedeli ödemeniz onaylandı. Borcunuz kapandı.`,
      type: 'ADMIN',
      link: '/satici/cari',
    });

    await logAudit({
      userId: adminId,
      userName: (session.user as any).fullName || (session.user as any).email,
      action: 'APPROVE_SERVICE_FEE_PAYMENT',
      entity: 'SellerProfile',
      entityId: sellerId,
      details: { companyName: seller.companyName, paymentCount: reported.length, totalApproved: round2(totalApproved) },
    });

    return NextResponse.json({ success: true, approvedCount: reported.length, totalApproved: round2(totalApproved) });
  } catch (error: any) {
    console.error('Admin service-fee PATCH error:', error);
    return NextResponse.json({ error: 'Onaylanamadı' }, { status: 500 });
  }
}
