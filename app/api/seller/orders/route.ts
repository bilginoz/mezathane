export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

/*
  KVKK Uyumu:
  - Ödeme PAID olmadan alıcı bilgileri (ad, adres, telefon) satıcıya gösterilmez
  - Sadece PAID ödemeler için alıcı bilgileri açılır (fatura ve kargo için)
*/

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const user = session.user as any;
    if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const sellerProfile = await prisma.sellerProfile.findFirst({
      where: { userId: user.id },
    });
    if (!sellerProfile) return NextResponse.json({ error: 'Satıcı profili yok' }, { status: 404 });

    // Satılan lotları getir
    const payments = await prisma.payment.findMany({
      where: {
        lot: {
          auction: { sellerId: sellerProfile.id },
        },
      },
      include: {
        lot: {
          include: {
            auction: { select: { title: true, commissionRate: true } },
            images: { take: 1, orderBy: { sortOrder: 'asc' } },
          },
        },
        user: {
          select: {
            id: true, fullName: true, email: true, phone: true, address: true,
            tcKimlikNo: true, isCompany: true, companyName: true,
            taxOffice: true, taxNumber: true,
            shippingAddress: true, billingAddress: true,
            city: true, district: true, postalCode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const orders = payments.map((payment: any) => {
      const isSold = payment.lot?.status === 'SOLD';
      const salePrice = payment.amount;
      const commissionRate = payment.lot.auction.commissionRate / 100;
      // Komisyon = satış fiyatı × oran (matrah), KDV ayrıca eklenir
      const commissionMatrah = salePrice * commissionRate;
      const lotKdvRate = 0.20; // Aracılık komisyonu KDV'si sabit %20 (hizmet), ürün oranından bağımsız
      const commissionKDV = commissionMatrah * lotKdvRate;
      const grossCommission = commissionMatrah + commissionKDV;
      const sellerNet = salePrice - grossCommission;

      return {
        paymentId: payment.id,
        lotId: payment.lot.id,
        lotTitle: payment.lot.title,
        lotNumber: payment.lot.lotNumber,
        lotImage: payment.lot.images?.[0]?.imageUrl ?? null,
        auctionTitle: payment.lot.auction.title,
        salePrice,
        commissionRate: payment.lot.auction.commissionRate,
        grossCommission: Math.round(grossCommission * 100) / 100,
        sellerNet: Math.round(sellerNet * 100) / 100,
        // Hizmet faturası detayları (platform → satıcıya)
        invoiceMatrah: Math.round(commissionMatrah * 100) / 100,
        invoiceKDV: Math.round(commissionKDV * 100) / 100,
        paymentStatus: payment.status,
        paymentMethod: payment.paymentMethod,
        invoiceUrl: payment.invoiceUrl,
        invoicePath: payment.invoicePath,
        paidAt: payment.paidAt,
        dueDate: payment.dueDate,
        createdAt: payment.createdAt,
        // Kargo takip
        shippingStatus: payment.shippingStatus,
        trackingNumber: payment.trackingNumber,
        trackingCompany: payment.trackingCompany,
        shippedAt: payment.shippedAt,
        deliveredAt: payment.deliveredAt,
        // Escrow
        buyerConfirmedAt: payment.buyerConfirmedAt,
        autoConfirmDate: payment.autoConfirmDate,
        payoutRequestedAt: payment.payoutRequestedAt,
        payoutCompleted: payment.payoutCompleted,
        // Satış gerçekleştikten sonra alıcı bilgileri satıcıya gösterilir (fatura kesimi için)
        buyer: isSold ? {
          fullName: payment.user.fullName,
          email: payment.user.email,
          phone: payment.user.phone ?? 'Belirtilmemiş',
          address: payment.user.address ?? payment.shippingAddress ?? 'Belirtilmemiş',
          shippingAddress: payment.shippingAddress ?? payment.user.shippingAddress ?? payment.user.address ?? 'Belirtilmemiş',
          billingAddress: payment.user.billingAddress ?? payment.user.address ?? 'Belirtilmemiş',
          tcKimlikNo: payment.user.tcKimlikNo ? decrypt(payment.user.tcKimlikNo) : null,
          isCompany: payment.user.isCompany ?? false,
          companyName: payment.user.companyName ?? null,
          taxOffice: payment.user.taxOffice ?? null,
          taxNumber: payment.user.taxNumber ?? null,
          city: payment.user.city ?? null,
          district: payment.user.district ?? null,
          postalCode: payment.user.postalCode ?? null,
        } : null,
        buyerHidden: !isSold,
      };
    });

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Seller orders error:', error);
    return NextResponse.json({ error: 'Siparişler yüklenemedi' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const user = session.user as any;
    if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const sellerProfile = await prisma.sellerProfile.findFirst({ where: { userId: user.id } });
    if (!sellerProfile) return NextResponse.json({ error: 'Satıcı profili yok' }, { status: 404 });

    const body = await request.json();
    const { paymentId, shippingStatus, trackingNumber, trackingCompany } = body;

    if (!paymentId || !shippingStatus) {
      return NextResponse.json({ error: 'Eksik bilgi' }, { status: 400 });
    }

    // Satıcı sadece PREPARING veya SHIPPED seçebilir. DELIVERED alıcı onayıyla olur.
    if (!['PREPARING', 'SHIPPED'].includes(shippingStatus)) {
      return NextResponse.json({ error: 'Geçersiz kargo durumu' }, { status: 400 });
    }

    // Satıcının kendi lotuna ait ödeme mi kontrol et
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        lot: { auction: { sellerId: sellerProfile.id } },
      },
      include: {
        lot: { select: { title: true } },
        user: { select: { id: true, email: true, fullName: true } },
      },
    });
    if (!payment) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 });

    const updateData: any = { shippingStatus };
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber || null;
    if (trackingCompany !== undefined) updateData.trackingCompany = trackingCompany || null;
    if (shippingStatus === 'SHIPPED' && payment.shippingStatus !== 'SHIPPED') {
      const now = new Date();
      updateData.shippedAt = now;
      // 7 gün sonra otomatik onay tarihi
      updateData.autoConfirmDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    await prisma.payment.update({ where: { id: paymentId }, data: updateData });

    // Alıcıya bildirim gönder
    const { createInAppNotification, sendCheckedNotificationEmail } = await import('@/lib/notifications');
    const statusLabels: Record<string, string> = {
      PREPARING: 'Hazırlanıyor',
      SHIPPED: 'Kargoya Verildi',
      DELIVERED: 'Teslim Edildi',
    };
    const statusLabel = statusLabels[shippingStatus] || shippingStatus;
    const lotTitle = payment.lot.title;
    const notifTitle = shippingStatus === 'SHIPPED'
      ? '📦 Kargonuz Yola Çıktı!'
      : shippingStatus === 'DELIVERED'
        ? '✅ Kargonuz Teslim Edildi'
        : `🔄 Kargo Durumu: ${statusLabel}`;
    const trackingInfo = trackingNumber
      ? `\nKargo firması: ${trackingCompany || '-'}\nTakip no: ${trackingNumber}`
      : '';
    const notifMessage = `"${lotTitle}" ürününüzün kargo durumu: ${statusLabel}${trackingInfo}`;

    await createInAppNotification({
      userId: payment.user.id,
      title: notifTitle,
      message: notifMessage,
      type: 'ORDER_STATUS',
      link: '/panel/siparislerim',
      preferenceType: 'OrderStatus',
    });

    if (payment.user.email) {
      await sendCheckedNotificationEmail({
        userId: payment.user.id,
        recipientEmail: payment.user.email,
        subject: notifTitle.replace(/[📦✅🔄]/g, '').trim(),
        body: `<div style="font-family:sans-serif;color:#333;">
            <h2 style="color:#d4af37;">Kargo Durumu Güncellendi</h2>
            <p>Sayın ${payment.user.fullName},</p>
            <p><strong>"${lotTitle}"</strong> ürününüzün kargo durumu güncellendi:</p>
            <div style="background:#f8f8f8;padding:16px;border-radius:8px;margin:16px 0;">
              <p style="margin:4px 0;"><strong>Durum:</strong> ${statusLabel}</p>
              ${trackingCompany ? `<p style="margin:4px 0;"><strong>Kargo Firması:</strong> ${trackingCompany}</p>` : ''}
              ${trackingNumber ? `<p style="margin:4px 0;"><strong>Takip Numarası:</strong> ${trackingNumber}</p>` : ''}
            </div>
            <p>Siparişlerinizi <a href="${process.env.NEXTAUTH_URL}/panel/siparislerim" style="color:#d4af37;">buradan</a> takip edebilirsiniz.</p>
            <p style="color:#888;font-size:12px;">Mezathane.tr</p>
          </div>`,
        preferenceType: 'OrderStatus',
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Seller orders PATCH error:', error);
    return NextResponse.json({ error: 'Kargo durumu güncellenemedi' }, { status: 500 });
  }
}
