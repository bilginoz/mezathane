export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mailer';
import { createInAppNotification } from '@/lib/notifications';
import { getDirectRevenueModel } from '@/lib/revenue-model';

// AŞAMA 3e (2026-08-06) — HAFTALIK (her Pazartesi) hizmet bedeli özeti/hatırlatması.
// cron-job.org'da her Pazartesi çalışacak bir görev olarak kurulmalı, Authorization: Bearer
// <CRON_SECRET> başlığıyla (bkz. reminders/payment-due ile aynı desen). Bu görev cron-job.org'a
// KAYDEDİLMEDİ — kullanıcı eklemeli (dış sisteme yazma, onaysız yapılmaz).
//
// Kural (2026-08-06 karar): o hafta borcu olmayan satıcıya boş özet/bildirim gitmez — sorgu
// zaten sadece serviceFeeAmount'ı olan ve henüz raporlanmamış/ödenmemiş kayıtları seçtiği için
// bu otomatik sağlanır (aşağıda ekstra filtre yok).
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const model = await getDirectRevenueModel();
    if (model !== 'HIZMET_BEDELI') {
      return NextResponse.json({ skipped: true, reason: 'KONTOR modunda haftalık özet gerekmez' });
    }

    const payments = await prisma.payment.findMany({
      where: { serviceFeeAmount: { not: null }, serviceFeeReportedAt: null, serviceFeePaidAt: null },
      select: {
        id: true,
        serviceFeeAmount: true,
        serviceFeeKDV: true,
        lot: { select: { auction: { select: { seller: { select: { id: true, companyName: true, userId: true, user: { select: { email: true } } } } } } } },
      },
    });

    const bySeller = new Map<string, { seller: any; ids: string[]; total: number }>();
    for (const p of payments) {
      const seller = p.lot?.auction?.seller;
      if (!seller) continue;
      if (!bySeller.has(seller.id)) bySeller.set(seller.id, { seller, ids: [], total: 0 });
      const c = bySeller.get(seller.id)!;
      c.ids.push(p.id);
      c.total += (p.serviceFeeAmount ?? 0) + (p.serviceFeeKDV ?? 0);
    }

    const now = new Date();
    let notified = 0;
    for (const { seller, ids, total } of bySeller.values()) {
      await prisma.payment.updateMany({ where: { id: { in: ids } }, data: { serviceFeeReportedAt: now } });

      await createInAppNotification({
        userId: seller.userId,
        title: '🧾 Haftalık hizmet bedeli özeti',
        message: `${ids.length} sipariş için toplam ${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺ hizmet bedeli borcunuz oluştu. Detay ve "Ödedim" bildirimi için Cari sayfanıza bakın.`,
        type: 'ADMIN',
        link: '/satici/cari',
      });

      if (seller.user?.email) {
        await sendEmail({
          to: seller.user.email,
          subject: 'Haftalık Hizmet Bedeli Özeti — Mezathane.tr',
          html: `<p>Merhaba,</p><p>${ids.length} sipariş için toplam <strong>${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</strong> hizmet bedeli borcunuz oluştu.</p><p>Detayları görmek ve ödemenizi bildirmek için <a href="https://www.mezathane.tr/satici/cari">Cari sayfanıza</a> gidin.</p>`,
        });
      }
      notified++;
    }

    return NextResponse.json({ success: true, sellersNotified: notified });
  } catch (error: any) {
    console.error('Service fee weekly cron error:', error);
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}
