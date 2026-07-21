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
    const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twoDaysLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Find payments with due date approaching
    const pendingPayments = await prisma.payment.findMany({
      where: {
        status: 'PENDING',
        buyerPaymentReceived: false,
        dueDate: { gte: oneDayLater, lte: twoDaysLater },
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

    return NextResponse.json({
      success: true,
      paymentsProcessed: pendingPayments.length,
      emailsSent,
    });
  } catch (error) {
    console.error('Payment reminder error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
