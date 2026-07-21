export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mailer';

// Called by scheduled task to send auction start reminders
// Finds auctions starting within the next 1-2 hours and notifies users who have lots in their watchlist
export async function POST(req: NextRequest) {
  try {
    // Verify internal API key
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Find auctions starting in 1-2 hours that haven't been notified yet
    const upcomingAuctions = await prisma.auction.findMany({
      where: {
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        startDate: { gte: oneHourLater, lte: twoHoursLater },
        seller: { status: 'APPROVED' },
      },
      include: {
        seller: { select: { companyName: true } },
        lots: {
          select: {
            id: true,
            title: true,
            watchlist: {
              select: {
                user: { select: { id: true, email: true, fullName: true } },
              },
            },
          },
        },
      },
    });

    let emailsSent = 0;
    const appUrl = process.env.NEXTAUTH_URL || 'https://mezathane.tr';
    const appName = 'Mezathane';

    for (const auction of upcomingAuctions) {
      // Collect unique users who have watchlisted lots in this auction
      const usersMap = new Map<string, { email: string; fullName: string; lotTitles: string[] }>();

      for (const lot of auction.lots) {
        for (const w of lot.watchlist) {
          const existing = usersMap.get(w.user.id);
          if (existing) {
            existing.lotTitles.push(lot.title);
          } else {
            usersMap.set(w.user.id, {
              email: w.user.email,
              fullName: w.user.fullName,
              lotTitles: [lot.title],
            });
          }
        }
      }

      const startTime = new Date(auction.startDate).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

      for (const [userId, userData] of usersMap) {
        const lotList = userData.lotTitles.slice(0, 5).map(t => `<li style="margin: 4px 0;">${t}</li>`).join('');
        const moreText = userData.lotTitles.length > 5 ? `<p style="color: #666;">ve ${userData.lotTitles.length - 5} lot daha...</p>` : '';

        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e7eb; padding: 0;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%); padding: 30px; text-align: center; border-bottom: 2px solid #d4af37;">
              <h1 style="color: #d4af37; margin: 0; font-size: 24px;">\u23F0 M\u00fczayede Ba\u015fl\u0131yor!</h1>
            </div>
            <div style="padding: 30px;">
              <p style="color: #e5e7eb; font-size: 16px;">Merhaba ${userData.fullName},</p>
              <div style="background: #1a1a2e; border: 1px solid #d4af37; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h2 style="color: #d4af37; margin: 0 0 10px 0; font-size: 18px;">${auction.title}</h2>
                <p style="color: #9ca3af; margin: 5px 0;">\uD83C\uDFEA ${auction.seller.companyName}</p>
                <p style="color: #e5e7eb; margin: 5px 0;">\uD83D\uDCC5 Ba\u015flang\u0131\u00e7: <strong>${startTime}</strong></p>
              </div>
              <p style="color: #e5e7eb;">Takip etti\u011finiz lotlar:</p>
              <ul style="color: #d4af37; padding-left: 20px;">${lotList}</ul>
              ${moreText}
              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}/muzayede/${auction.id}" style="display: inline-block; background: #d4af37; color: #000; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">M\u00fczayedeye Git</a>
              </div>
            </div>
            <div style="padding: 15px 30px; border-top: 1px solid #333; text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0;">Bu e-posta, favori listenize ekledi\u011finiz lotlar i\u00e7in g\u00f6nderilmi\u015ftir.</p>
            </div>
          </div>
        `;

        try {
          await sendEmail({
            to: userData.email,
            subject: `\u23F0 ${auction.title} - M\u00fczayede yakla\u015f\u0131yor!`,
            html: htmlBody,
          });
          emailsSent++;
        } catch (e) {
          console.error(`Failed to send auction reminder to ${userData.email}:`, e);
        }

        // Also create in-app notification
        try {
          await prisma.notification.create({
            data: {
              userId,
              title: 'M\u00fczayede Yak\u0131nda Ba\u015fl\u0131yor!',
              message: `${auction.title} m\u00fczayedesi yakla\u015f\u0131yor. Takip etti\u011finiz ${userData.lotTitles.length} lot bulunuyor.`,
              type: 'AUCTION_REMINDER',
              link: `/muzayede/${auction.id}`,
            },
          });
        } catch (e) {
          console.error('Failed to create notification:', e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      auctionsProcessed: upcomingAuctions.length,
      emailsSent,
    });
  } catch (error) {
    console.error('Auction start reminder error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
