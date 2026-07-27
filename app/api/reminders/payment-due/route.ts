export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mailer';

// Called by scheduled task to send payment due reminders
// Finds unpaid orders where dueDate is approaching (within 24-48 hours)
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const twoDaysLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Vadesine 48 saatten az kalan, henüz ödenmemiş VE daha önce hatırlatma
    // gönderilmemiş ödemeler. paymentReminderSentAt kontrolü sayesinde bu görev
    // saatte bir çalışsa bile aynı ödeme için yalnızca BİR kez e-posta gider.
    const pendingPayments = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        buyerPaymentReceived: false,
        paymentReminderSentAt: null,
        dueDate: { gte: now, lte: twoDaysLater },
      },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        lot: {
          select: {
            title: true,
            soldPrice: true,
            auction: { select: { title: true } },
          },
        },
      },
    });

    let emailsSent = 0;
    const appUrl = process.env.NEXTAUTH_URL || 'https://mezathane.tr';
    const appName = 'Mezathane';

    for (const payment of pendingPayments) {
      const dueDate = payment.dueDate ? new Date(payment.dueDate).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'long' }) : 'Belirtilmemi\u015f';
      const amount = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(payment.totalAmount);

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e7eb; padding: 0;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%); padding: 30px; text-align: center; border-bottom: 2px solid #d4af37;">
            <h1 style="color: #d4af37; margin: 0; font-size: 24px;">\uD83D\uDCB3 \u00d6deme Hat\u0131rlatmas\u0131</h1>
          </div>
          <div style="padding: 30px;">
            <p style="color: #e5e7eb; font-size: 16px;">Merhaba ${payment.user.fullName},</p>
            <p style="color: #e5e7eb;">Kazand\u0131\u011f\u0131n\u0131z lot i\u00e7in \u00f6deme s\u00fcreniz yakla\u015f\u0131yor.</p>
            <div style="background: #1a1a2e; border: 1px solid #d4af37; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #d4af37; margin: 0 0 10px 0;">${payment.lot.title}</h3>
              <p style="color: #9ca3af; margin: 5px 0;">M\u00fczayede: ${payment.lot.auction?.title || ''}</p>
              <p style="color: #e5e7eb; margin: 5px 0;">Tutar: <strong style="color: #d4af37;">${amount}</strong></p>
              <p style="color: #ef4444; margin: 5px 0;">\u26A0\uFE0F Son \u00f6deme tarihi: <strong>${dueDate}</strong></p>
            </div>
            <div style="background: #1c1c1c; border-left: 4px solid #ef4444; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="color: #ef4444; margin: 0; font-weight: bold;">\u00d6nemli: \u00d6deme s\u00fcresi ge\u00e7tikten sonra sipari\u015f iptal edilebilir.</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${appUrl}/panel/siparislerim" style="display: inline-block; background: #d4af37; color: #000; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">\u00d6deme Yap</a>
            </div>
          </div>
          <div style="padding: 15px 30px; border-top: 1px solid #333; text-align: center;">
            <p style="color: #666; font-size: 12px; margin: 0;">Bu e-posta, kazand\u0131\u011f\u0131n\u0131z m\u00fczayede lotu i\u00e7in g\u00f6nderilmi\u015ftir.</p>
          </div>
        </div>
      `;

      try {
        await sendEmail({
          to: payment.user.email,
          subject: `\uD83D\uDCB3 \u00d6deme hat\u0131rlatmas\u0131 - ${payment.lot.title}`,
          html: htmlBody,
        });
        emailsSent++;
        // Sadece e-posta ba\u015Far\u0131yla gidince i\u015Faretle; gitmezse bir sonraki
        // \u00E7al\u0131\u015Fmada tekrar denenir, ama bir daha spam olmaz.
        await prisma.payment.update({
          where: { id: payment.id },
          data: { paymentReminderSentAt: new Date() },
        });
      } catch (e) {
        console.error(`Failed to send payment reminder to ${payment.user.email}:`, e);
      }

      // In-app notification
      try {
        await prisma.notification.create({
          data: {
            userId: payment.user.id,
            title: '\u00d6deme S\u00fcreniz Yakla\u015f\u0131yor!',
            message: `${payment.lot.title} i\u00e7in \u00f6deme s\u00fcreniz ${dueDate} tarihinde sona eriyor.`,
            type: 'PAYMENT_REMINDER',
            link: '/panel/siparislerim',
          },
        });
      } catch (e) {
        console.error('Failed to create notification:', e);
      }
    }

    // ====== OTOMATİK ASKI: ödeme yapmayan (default) kullanıcılar ======
    // Vadesi geçmiş ödenmemiş siparişi olan BUYER'lar, ayarlanan eşiğe ulaşınca
    // otomatik askıya alınır (isActive=false → giriş engellenir). Bu görev saatlik
    // çalıştığı için ayrı bir cron gerekmez. Admin, hesabı elle geri açabilir.
    let suspendedCount = 0;
    try {
      const ps = await prisma.platformSettings.findFirst();
      const threshold = ps?.autoSuspendAfterDefaults ?? 1;
      const overdueGroups = await prisma.payment.groupBy({
        by: ['userId'],
        where: { status: 'PENDING', buyerPaymentReceived: false, dueDate: { lt: now } },
        _count: { id: true },
      });
      for (const g of overdueGroups) {
        if ((g._count.id ?? 0) < threshold) continue;
        const u = await prisma.user.findUnique({
          where: { id: g.userId },
          select: { id: true, isActive: true, role: true, email: true, fullName: true },
        });
        if (!u || !u.isActive || u.role !== 'BUYER') continue; // sadece aktif BUYER'lar
        await prisma.user.update({ where: { id: u.id }, data: { isActive: false } });
        suspendedCount++;
        try {
          await sendEmail({
            to: u.email,
            subject: 'Mezathane — Hesabınız askıya alındı',
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#e5e7eb;background:#0a0a0a"><h2 style="color:#d4af37">Hesabınız askıya alındı</h2><p>Merhaba ${u.fullName ?? ''},</p><p>Kazandığınız bir veya daha fazla lot için ödeme süresi dolduğu hâlde ödeme yapılmadığından hesabınız askıya alınmıştır. Borcunuzu kapatıp hesabınızı yeniden açtırmak için lütfen bizimle iletişime geçin: bilgi@mezathane.tr</p></div>`,
          });
        } catch {}
      }
    } catch (e) {
      console.error('Auto-suspend error:', e);
    }

    return NextResponse.json({
      success: true,
      paymentsProcessed: pendingPayments.length,
      emailsSent,
      suspendedCount,
    });
  } catch (error) {
    console.error('Payment reminder error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
