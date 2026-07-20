export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/utils';

/*
  Canlı müzayede başlamadan 20 dk önce bildirim gönder.
  - Teklif verenler (bidders)
  - Favori ekleyenler (watchlist)
  Her ikisine de uygulama içi + e-posta bildirimi
*/
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ABACUSAI_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    // 15-25 dk sonra canlıya geçecek müzayedeleri bul (20 dk merkezli pencere)
    const minTime = new Date(now.getTime() + 15 * 60 * 1000);
    const maxTime = new Date(now.getTime() + 25 * 60 * 1000);

    const upcomingLive = await prisma.auction.findMany({
      where: {
        liveStartDate: { gte: minTime, lte: maxTime },
        liveReminderSent: false,
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        isPublic: true,
        seller: { status: 'APPROVED' },
      },
      include: {
        seller: { select: { companyName: true } },
        lots: {
          select: {
            id: true,
            title: true,
            currentPrice: true,
            startingPrice: true,
            // Favori ekleyenler
            watchlist: {
              select: {
                user: { select: { id: true, email: true, fullName: true } },
              },
            },
            // Teklif verenler
            bids: {
              select: {
                user: { select: { id: true, email: true, fullName: true } },
              },
              distinct: ['userId'],
            },
          },
        },
      },
    });

    let emailsSent = 0;
    let notificationsSent = 0;
    const appUrl = process.env.NEXTAUTH_URL || 'https://mezathane.tr';

    for (const auction of upcomingLive) {
      // Tüm ilgili kullanıcıları topla (teklif verenler + favori ekleyenler)
      const usersMap = new Map<string, {
        email: string;
        fullName: string;
        lotTitles: string[];
        hasBid: boolean;
        hasWatchlist: boolean;
      }>();

      for (const lot of auction.lots) {
        // Teklif verenler
        for (const bid of lot.bids) {
          const existing = usersMap.get(bid.user.id);
          if (existing) {
            if (!existing.lotTitles.includes(lot.title)) existing.lotTitles.push(lot.title);
            existing.hasBid = true;
          } else {
            usersMap.set(bid.user.id, {
              email: bid.user.email,
              fullName: bid.user.fullName,
              lotTitles: [lot.title],
              hasBid: true,
              hasWatchlist: false,
            });
          }
        }

        // Favori ekleyenler
        for (const w of lot.watchlist) {
          const existing = usersMap.get(w.user.id);
          if (existing) {
            if (!existing.lotTitles.includes(lot.title)) existing.lotTitles.push(lot.title);
            existing.hasWatchlist = true;
          } else {
            usersMap.set(w.user.id, {
              email: w.user.email,
              fullName: w.user.fullName,
              lotTitles: [lot.title],
              hasBid: false,
              hasWatchlist: true,
            });
          }
        }
      }

      const liveTime = auction.liveStartDate
        ? new Date(auction.liveStartDate).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })
        : '—';

      const totalLots = auction.lots.length;

      for (const [userId, userData] of usersMap) {
        const lotList = userData.lotTitles
          .slice(0, 5)
          .map(t => `<li style="margin: 4px 0; color: #e5e7eb;">${t}</li>`)
          .join('');
        const moreText = userData.lotTitles.length > 5
          ? `<p style="color: #666;">ve ${userData.lotTitles.length - 5} lot daha...</p>`
          : '';

        const reason = userData.hasBid && userData.hasWatchlist
          ? 'Teklif verdiğiniz ve takip ettiğiniz lotlar'
          : userData.hasBid
          ? 'Teklif verdiğiniz lotlar'
          : 'Takip ettiğiniz lotlar';

        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #e5e7eb; padding: 0;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%); padding: 30px; text-align: center; border-bottom: 2px solid #d4af37;">
              <h1 style="color: #d4af37; margin: 0; font-size: 24px;">🔴 Canlı Müzayede 20 dk Sonra!</h1>
            </div>
            <div style="padding: 30px;">
              <p style="color: #e5e7eb; font-size: 16px;">Merhaba ${userData.fullName},</p>
              <div style="background: #1a1a2e; border: 1px solid #d4af37; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h2 style="color: #d4af37; margin: 0 0 10px 0; font-size: 18px;">${auction.title}</h2>
                <p style="color: #9ca3af; margin: 5px 0;">🏪 ${auction.seller.companyName}</p>
                <p style="color: #e5e7eb; margin: 5px 0;">🕐 Canlı Başlangıç: <strong style="color: #d4af37;">${liveTime}</strong></p>
                <p style="color: #9ca3af; margin: 5px 0;">📦 Toplam ${totalLots} lot</p>
              </div>
              <p style="color: #e5e7eb;">${reason}:</p>
              <ul style="color: #d4af37; padding-left: 20px;">${lotList}</ul>
              ${moreText}
              <div style="background: #1a1a2e; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 3px solid #ef4444;">
                <p style="color: #ef4444; margin: 0; font-weight: bold;">⚡ Lotlar sırayla açılacak ve kısa sürede kapanacak!</p>
                <p style="color: #9ca3af; margin: 5px 0 0 0; font-size: 13px;">Canlı müzayedeye katılarak tekliflerinizi verin.</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}/canli/${auction.id}" style="display: inline-block; background: #d4af37; color: #000; padding: 14px 35px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">🔴 Canlı Müzayedeye Katıl</a>
              </div>
            </div>
            <div style="padding: 15px 30px; border-top: 1px solid #333; text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0;">Bu e-posta, teklif verdiğiniz veya takip ettiğiniz lotlar için gönderilmiştir.</p>
            </div>
          </div>
        `;

        // E-posta gönder
        try {
          await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deployment_token: process.env.ABACUSAI_API_KEY,
              app_id: process.env.WEB_APP_ID,
              notification_id: process.env.NOTIF_ID_CANL_MZAYEDE_HATRLATMAS,
              subject: `🔴 ${auction.title} — Canlı müzayede 20 dk sonra başlıyor!`,
              body: htmlBody,
              is_html: true,
              recipient_email: userData.email,
              sender_email: 'bilgi@mezathane.tr',
              sender_alias: 'Mezathane',
            }),
          });
          emailsSent++;
        } catch (e) {
          console.error(`Failed to send live reminder to ${userData.email}:`, e);
        }

        // Uygulama içi bildirim
        try {
          await prisma.notification.create({
            data: {
              userId,
              title: '🔴 Canlı Müzayede 20 dk Sonra!',
              message: `${auction.title} canlı müzayedesi başlamak üzere. ${reason.toLowerCase()}: ${userData.lotTitles.slice(0, 3).join(', ')}${userData.lotTitles.length > 3 ? '...' : ''}`,
              type: 'LIVE_AUCTION_REMINDER',
              link: `/canli/${auction.id}`,
            },
          });
          notificationsSent++;
        } catch (e) {
          console.error('Failed to create live reminder notification:', e);
        }
      }

      // Müzayedeyi "hatırlatma gönderildi" olarak işaretle
      await prisma.auction.update({
        where: { id: auction.id },
        data: { liveReminderSent: true },
      });
    }

    return NextResponse.json({
      success: true,
      auctionsProcessed: upcomingLive.length,
      emailsSent,
      notificationsSent,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Live start reminder error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
