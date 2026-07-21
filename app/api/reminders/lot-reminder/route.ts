export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mailer';

// Called by scheduled task OR cron to send lot reminders 15 minutes before auction starts
// Also called from client-side on homepage load for near-real-time checks
export async function POST(req: NextRequest) {
  try {
    // Verify internal API key
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const fifteenMinLater = new Date(now.getTime() + 15 * 60 * 1000);
    const twentyMinLater = new Date(now.getTime() + 20 * 60 * 1000);

    // Find auctions starting in 15-20 minutes
    // We check startDate for SCHEDULED auctions and liveStartDate/endDate for ACTIVE auctions about to go live
    const upcomingAuctions = await prisma.auction.findMany({
      where: {
        OR: [
          // SCHEDULED auctions starting in 15-20 min
          {
            status: 'SCHEDULED',
            startDate: { gte: fifteenMinLater, lte: twentyMinLater },
          },
          // ACTIVE auctions going live in 15-20 min
          {
            status: 'ACTIVE',
            endDate: { gte: fifteenMinLater, lte: twentyMinLater },
          },
        ],
        seller: { status: 'APPROVED' },
      },
      include: {
        seller: { select: { companyName: true } },
        lots: {
          select: {
            id: true,
            title: true,
            images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { imageUrl: true } },
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
      const usersMap = new Map<string, { email: string; fullName: string; lots: { title: string; imageUrl?: string; id: string }[] }>();

      for (const lot of auction.lots) {
        for (const w of lot.watchlist) {
          const existing = usersMap.get(w.user.id);
          const lotInfo = { title: lot.title, imageUrl: lot.images?.[0]?.imageUrl, id: lot.id };
          if (existing) {
            existing.lots.push(lotInfo);
          } else {
            usersMap.set(w.user.id, {
              email: w.user.email,
              fullName: w.user.fullName,
              lots: [lotInfo],
            });
          }
        }
      }

      // Check which users already received a 15-min reminder for this auction today
      // to avoid duplicate emails
      const notifiedKey = `lot_reminder_${auction.id}`;
      const recentNotifications = await prisma.notification.findMany({
        where: {
          type: 'LOT_REMINDER_15MIN',
          link: `/muzayede/${auction.id}`,
          createdAt: { gte: new Date(now.getTime() - 30 * 60 * 1000) }, // last 30 min
        },
        select: { userId: true },
      });
      const alreadyNotified = new Set(recentNotifications.map(n => n.userId));

      const startTime = new Date(auction.liveStartDate || auction.endDate || auction.startDate);
      const formattedTime = startTime.toLocaleString('tr-TR', {
        timeZone: 'Europe/Istanbul',
        hour: '2-digit',
        minute: '2-digit',
      });

      for (const [userId, userData] of usersMap) {
        // Skip if already notified
        if (alreadyNotified.has(userId)) continue;

        const lotListHtml = userData.lots.slice(0, 5).map(lot => `
          <tr style="border-bottom: 1px solid #2a2a2a;">
            <td style="padding: 10px; width: 60px;">
              ${lot.imageUrl ? `<img src="${lot.imageUrl}" alt="${lot.title}" style="width: 50px; height: 50px; border-radius: 6px; object-fit: cover;" />` : ''}
            </td>
            <td style="padding: 10px;">
              <a href="${appUrl}/lot/${lot.id}" style="color: #d4af37; text-decoration: none; font-weight: bold;">${lot.title}</a>
            </td>
          </tr>
        `).join('');

        const moreText = userData.lots.length > 5 ? `<p style="color: #666; text-align: center;">ve ${userData.lots.length - 5} lot daha...</p>` : '';

        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e7eb; padding: 0;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%); padding: 30px; text-align: center; border-bottom: 2px solid #d4af37;">
              <div style="font-size: 40px; margin-bottom: 10px;">\u23F0</div>
              <h1 style="color: #d4af37; margin: 0; font-size: 22px;">15 Dakika Kald\u0131!</h1>
              <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 14px;">Takip etti\u011finiz lotlar\u0131n m\u00fczayedesi ba\u015fl\u0131yor</p>
            </div>
            <div style="padding: 25px;">
              <p style="color: #e5e7eb; font-size: 15px; margin: 0 0 15px 0;">Merhaba ${userData.fullName},</p>
              <div style="background: #1a1a2e; border: 1px solid #d4af37; border-radius: 8px; padding: 15px; margin: 15px 0;">
                <h2 style="color: #d4af37; margin: 0 0 8px 0; font-size: 17px;">${auction.title}</h2>
                <p style="color: #9ca3af; margin: 4px 0; font-size: 13px;">\uD83C\uDFEA ${auction.seller.companyName}</p>
                <p style="color: #e5e7eb; margin: 4px 0; font-size: 13px;">\u23F0 Saat: <strong style="color: #d4af37;">${formattedTime}</strong></p>
              </div>
              <p style="color: #e5e7eb; font-size: 14px; margin: 15px 0 10px 0;">Takip etti\u011finiz lotlar:</p>
              <table style="width: 100%; border-collapse: collapse;">${lotListHtml}</table>
              ${moreText}
              <div style="text-align: center; margin: 25px 0 15px 0;">
                <a href="${appUrl}/muzayede/${auction.id}" style="display: inline-block; background: #d4af37; color: #000; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">M\u00fczayedeye Kat\u0131l \u2192</a>
              </div>
            </div>
            <div style="padding: 12px 25px; border-top: 1px solid #333; text-align: center;">
              <p style="color: #666; font-size: 11px; margin: 0;">Bu e-posta, favori listenize ekledi\u011finiz lotlar i\u00e7in g\u00f6nderilmi\u015ftir.</p>
            </div>
          </div>
        `;

        try {
          await sendEmail({
            to: userData.email,
            subject: `\u23F0 ${auction.title} — 15 dakika sonra ba\u015fl\u0131yor!`,
            html: htmlBody,
          });
          emailsSent++;
        } catch (e) {
          console.error(`Failed to send lot reminder to ${userData.email}:`, e);
        }

        // Create in-app notification
        try {
          await prisma.notification.create({
            data: {
              userId,
              title: '\u23F0 15 Dakika Kald\u0131!',
              message: `${auction.title} m\u00fczayedesi 15 dakika sonra ba\u015fl\u0131yor! Takip etti\u011finiz ${userData.lots.length} lot var.`,
              type: 'LOT_REMINDER_15MIN',
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
    console.error('Lot reminder error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
