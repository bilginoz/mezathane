export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/*
  Otomatik teslim onayı:
  - Kargoya verildikten 7 gün sonra alıcı onay vermemiş ve anlaşmazlık açmamışsa
  - Sistem otomatik olarak "Teslim Edildi" yapar
  - Bu cron, sayfa ziyaretlerinde veya zamanlanmış görevle tetiklenir
*/

export async function GET() {
  try {
    const now = new Date();

    // autoConfirmDate geçmiş, henüz DELIVERED olmamış ödemeleri bul
    const pendingPayments = await prisma.payment.findMany({
      where: {
        shippingStatus: 'SHIPPED',
        autoConfirmDate: { lte: now },
        buyerConfirmedAt: null,
        deliveredAt: null,
      },
      include: {
        lot: {
          select: {
            id: true,
            title: true,
            auction: { select: { seller: { select: { userId: true, companyName: true } } } },
          },
        },
        user: { select: { id: true, fullName: true } },
      },
    });

    let confirmed = 0;

    for (const payment of pendingPayments) {
      // Aktif anlaşmazlık var mı kontrol et
      const activeDispute = await prisma.dispute.findFirst({
        where: {
          lotId: payment.lot.id,
          status: { in: ['OPEN', 'IN_REVIEW'] },
        },
      });

      if (activeDispute) {
        // Anlaşmazlık varsa otomatik onay yapma, bekle
        continue;
      }

      // Otomatik onayla
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          shippingStatus: 'DELIVERED',
          deliveredAt: now,
          buyerConfirmedAt: now, // sistem tarafından otomatik
        },
      });

      // Satıcıya bildirim
      const { createInAppNotification } = await import('@/lib/notifications');
      const sellerUserId = payment.lot.auction.seller?.userId;
      if (sellerUserId) {
        await createInAppNotification({
          userId: sellerUserId,
          title: '✅ Otomatik Teslim Onayı',
          message: `"${payment.lot.title}" — 7 günlük süre doldu, alıcı sorun bildirmedi. Teslim otomatik onaylandı.`,
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
          title: '✅ Otomatik Teslim Onayı',
          message: `"${payment.lot.title}" — 7 gün geçti, anlaşmazlık yok. Satıcıya (${payment.lot.auction.seller?.companyName}) ödeme yapılabilir.`,
          type: 'ADMIN',
          link: '/admin/finans',
        });
      }

      // Alıcıya bildirim
      await createInAppNotification({
        userId: payment.user.id,
        title: '📦 Kargonuz Otomatik Onaylandı',
        message: `"${payment.lot.title}" — 7 günlük inceleme süresi dolduğu için kargo teslimi otomatik onaylandı.`,
        type: 'ORDER_STATUS',
        link: '/panel/siparislerim',
        preferenceType: 'OrderStatus',
      });

      confirmed++;
    }

    return NextResponse.json({ confirmed, checked: pendingPayments.length });
  } catch (error: any) {
    console.error('Auto-confirm cron error:', error);
    return NextResponse.json({ error: 'Otomatik onay hatası' }, { status: 500 });
  }
}
