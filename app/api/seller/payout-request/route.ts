export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const user = session.user as any;
    if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const sellerProfile = await prisma.sellerProfile.findFirst({ where: { userId: user.id } });
    if (!sellerProfile) return NextResponse.json({ error: 'Satıcı profili yok' }, { status: 404 });

    const { paymentId } = await request.json();
    if (!paymentId) return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        lot: { auction: { sellerId: sellerProfile.id } },
        shippingStatus: 'SHIPPED',
        payoutCompleted: false,
      },
      include: {
        lot: { select: { title: true } },
        user: { select: { fullName: true } },
      },
    });
    if (!payment) return NextResponse.json({ error: 'Uygun sipariş bulunamadı' }, { status: 404 });

    if (payment.payoutRequestedAt) {
      return NextResponse.json({ error: 'Ödeme talebi zaten gönderildi' }, { status: 400 });
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { payoutRequestedAt: new Date() },
    });

    // Admin'e bildirim gönder
    const { createInAppNotification } = await import('@/lib/notifications');
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    for (const admin of admins) {
      await createInAppNotification({
        userId: admin.id,
        title: '💰 Satıcı Ödeme Talebi',
        message: `${sellerProfile.companyName} — "${payment.lot.title}" için ödeme talep etti. Alıcı: ${payment.user.fullName}. Kargo durumu: Kargoya Verildi.`,
        type: 'ADMIN',
        link: `/admin/finans?seller=${sellerProfile.id}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Payout request error:', error);
    return NextResponse.json({ error: 'Ödeme talebi gönderilemedi' }, { status: 500 });
  }
}
