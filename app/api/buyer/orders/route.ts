export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { getFileUrl } from '@/lib/s3';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const userId = (session.user as any).id;

    const payments = await prisma.payment.findMany({
      where: { userId },
      include: {
        lot: {
          include: {
            auction: {
              select: { title: true, seller: { select: { companyName: true } } },
            },
            images: { take: 1, orderBy: { sortOrder: 'asc' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const orders = await Promise.all(payments.map(async (payment: any) => {
      let invoiceDownloadUrl: string | null = null;
      if (payment.invoicePath) {
        try {
          invoiceDownloadUrl = await getFileUrl(payment.invoicePath, 'application/pdf', false);
        } catch {}
      }

      return {
        paymentId: payment.id,
        lotId: payment.lot.id,
        lotTitle: payment.lot.title,
        lotNumber: payment.lot.lotNumber,
        lotImage: payment.lot.images?.[0]?.imageUrl ?? null,
        auctionTitle: payment.lot.auction.title,
        sellerName: payment.lot.auction.seller?.companyName ?? '',
        amount: payment.amount,
        totalAmount: payment.totalAmount,
        buyerPremiumRate: payment.buyerPremiumRate ?? 0,
        buyerPremiumAmount: payment.buyerPremiumAmount ?? 0,
        buyerPremiumKDV: payment.buyerPremiumKDV ?? 0,
        paymentStatus: payment.status,
        paymentMethod: payment.paymentMethod,
        invoiceAvailable: !!payment.invoicePath,
        invoiceDownloadUrl,
        dueDate: payment.dueDate,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        // Kargo takip
        shippingStatus: payment.shippingStatus,
        trackingNumber: payment.trackingNumber,
        trackingCompany: payment.trackingCompany,
        shippedAt: payment.shippedAt,
        deliveredAt: payment.deliveredAt,
        buyerConfirmedAt: payment.buyerConfirmedAt,
        autoConfirmDate: payment.autoConfirmDate,
      };
    }));

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Buyer orders error:', error);
    return NextResponse.json({ error: 'Siparişler yüklenemedi' }, { status: 500 });
  }
}

// Alıcı teslim onayı
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const userId = (session.user as any).id;

    const { paymentId, action } = await request.json();
    if (!paymentId || action !== 'confirm_delivery') {
      return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId,
        shippingStatus: 'SHIPPED',
        buyerConfirmedAt: null,
      },
      include: {
        lot: {
          select: {
            title: true,
            auction: { select: { sellerId: true, seller: { select: { userId: true, companyName: true } } } },
          },
        },
      },
    });
    if (!payment) return NextResponse.json({ error: 'Sipariş bulunamadı veya zaten onaylandı' }, { status: 404 });

    const now = new Date();
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        buyerConfirmedAt: now,
        deliveredAt: now,
        shippingStatus: 'DELIVERED',
      },
    });

    // Satıcıya bildirim gönder
    const { createInAppNotification, sendCheckedNotificationEmail } = await import('@/lib/notifications');
    const sellerUserId = payment.lot.auction.seller?.userId;
    if (sellerUserId) {
      await createInAppNotification({
        userId: sellerUserId,
        title: '✅ Alıcı Teslim Onayladı!',
        message: `"${payment.lot.title}" ürünü alıcı tarafından teslim alındı ve onaylandı. Ödemeniz serbest bırakılacak.`,
        type: 'ORDER_STATUS',
        link: '/satici/siparisler',
        preferenceType: 'OrderStatus',
      });
    }

    // Admin'e bildirim
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    for (const admin of admins) {
      await createInAppNotification({
        userId: admin.id,
        title: '✅ Teslim Onaylandı — Ödeme Serbest',
        message: `"${payment.lot.title}" — Alıcı teslim onayladı. Satıcıya (${payment.lot.auction.seller?.companyName}) ödeme yapılabilir.`,
        type: 'ADMIN',
        link: `/admin/finans`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Buyer confirm delivery error:', error);
    return NextResponse.json({ error: 'Teslim onayı başarısız' }, { status: 500 });
  }
}
