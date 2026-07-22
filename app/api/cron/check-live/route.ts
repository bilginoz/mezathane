export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createInAppNotification } from '@/lib/notifications';
import { sendEmail } from '@/lib/mailer';

/*
  Müzayede otomatik geçiş kontrolü:
  1. SCHEDULED → ACTIVE: startDate geçmiş olanlar
  2. ACTIVE → LIVE: liveStartDate geçmiş olanlar
  3. ACTIVE → COMPLETED: endDate geçmiş ve liveStartDate olmayan (yazılı müzayedeler)
  4. Kazanıcıları belirle, lotları SOLD/UNSOLD yap, ödeme kaydı oluştur
*/
export async function GET() {
  try {
    const now = new Date();
    let transitioned = 0;

    // 1. SCHEDULED → ACTIVE: startDate geçmiş olanları aktifleştir
    const scheduledToActive = await prisma.auction.updateMany({
      where: {
        status: 'SCHEDULED',
        startDate: { lte: now },
        isPublic: true,
      },
      data: { status: 'ACTIVE' },
    });
    transitioned += scheduledToActive.count;

    // 2. ACTIVE → LIVE: liveStartDate geçmiş olanları canlıya al
    const activeToLive = await prisma.auction.findMany({
      where: {
        status: 'ACTIVE',
        liveStartDate: { lte: now },
        isPublic: true,
      },
    });

    for (const auction of activeToLive) {
      await prisma.auction.update({
        where: { id: auction.id },
        data: { status: 'LIVE' },
      });
      transitioned++;
    }

    // 3. ACTIVE → COMPLETED: endDate geçmiş ve liveStartDate olmayan (yazılı müzayedeler)
    //    veya liveStartDate olan ama hala ACTIVE olup endDate geçmiş olanlar
    const expiredAuctions = await prisma.auction.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lte: now, not: null },
        liveStartDate: null, // Canlı müzayede değil
      },
      include: {
        lots: {
          include: {
            bids: {
              orderBy: { amount: 'desc' },
              take: 1,
              include: { user: { select: { id: true, fullName: true, phone: true, shippingAddress: true } } },
            },
          },
        },
        seller: { select: { id: true, commissionRate: true } },
      },
    });

    for (const auction of expiredAuctions) {
      // Her lot için kazananı belirle
      for (const lot of auction.lots) {
        if (lot.status === 'SOLD' || lot.status === 'UNSOLD' || lot.status === 'CANCELLED') continue;

        const highestBid = lot.bids?.[0];
        if (highestBid && highestBid.amount >= lot.startingPrice) {
          // Lot satıldı
          const commRate = (auction.seller?.commissionRate ?? 0) / 100;
          const commAmt = highestBid.amount * commRate;
          // Alıcı komisyonu (buyer premium) hesapla
          const buyerPremiumRate = 7.0;
          const buyerPremiumAmount = highestBid.amount * (buyerPremiumRate / 100);
          const lotKdvRate = 0.20; // Hizmet bedeli bir hizmettir; KDV'si ürün oranından bağımsız, sabit %20
          const buyerPremiumKDV = Math.round(buyerPremiumAmount * lotKdvRate * 100) / 100;
          const buyerTotalAmount = highestBid.amount + buyerPremiumAmount + buyerPremiumKDV;
          const dueDate = new Date(now.getTime() + (auction.paymentDays ?? 7) * 24 * 60 * 60 * 1000);

          await prisma.lot.update({
            where: { id: lot.id },
            data: {
              status: 'SOLD',
              soldPrice: highestBid.amount,
              currentPrice: highestBid.amount,
            },
          });

          // Kazanan teklifi işaretle
          await prisma.bid.update({
            where: { id: highestBid.id },
            data: { isWinning: true },
          });

          // Ödeme kaydı oluştur
          const buyer = highestBid.user;
          await prisma.payment.create({
            data: {
              lotId: lot.id,
              userId: highestBid.userId,
              amount: highestBid.amount,
              commissionAmount: commAmt,
              buyerPremiumRate,
              buyerPremiumAmount,
              buyerPremiumKDV,
              totalAmount: buyerTotalAmount,
              status: 'PENDING',
              dueDate,
              shippingName: buyer?.fullName ?? null,
              shippingAddress: buyer?.shippingAddress ?? null,
              shippingPhone: buyer?.phone ?? null,
            },
          });

          // Kazanana bildirim gönder
          try {
            await createInAppNotification({
              userId: highestBid.userId,
              title: 'Müzayede Kazandınız! 🏆',
              message: `"${lot.title}" ürününü ${highestBid.amount.toLocaleString('tr-TR')} ₺ ile kazandınız.`,
              type: 'AUCTION_WON',
              link: `/panel/siparislerim`,
              preferenceType: 'AuctionWon',
            });
          } catch {}
        } else {
          // Lot satılamadı
          await prisma.lot.update({
            where: { id: lot.id },
            data: { status: 'UNSOLD' },
          });
        }
      }

      // Müzayedeyi tamamla
      await prisma.auction.update({
        where: { id: auction.id },
        data: { status: 'COMPLETED' },
      });
      transitioned++;
    }

    // 4. Canlı müzayede hatırlatması (20 dk önce)
    let liveRemindersSent = 0;
    try {
      const appUrl = process.env.NEXTAUTH_URL || 'https://mezathane.tr';
      const minTime = new Date(now.getTime() + 15 * 60 * 1000);
      const maxTime = new Date(now.getTime() + 25 * 60 * 1000);

      const upcomingLiveReminders = await prisma.auction.findMany({
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
              id: true, title: true,
              watchlist: { select: { user: { select: { id: true, email: true, fullName: true } } } },
              bids: { select: { user: { select: { id: true, email: true, fullName: true } } }, distinct: ['userId'] },
            },
          },
        },
      });

      for (const auction of upcomingLiveReminders) {
        const usersMap = new Map<string, { email: string; fullName: string; lotTitles: string[]; hasBid: boolean; hasWatch: boolean }>();

        for (const lot of auction.lots) {
          for (const bid of lot.bids) {
            const ex = usersMap.get(bid.user.id);
            if (ex) { if (!ex.lotTitles.includes(lot.title)) ex.lotTitles.push(lot.title); ex.hasBid = true; }
            else usersMap.set(bid.user.id, { email: bid.user.email, fullName: bid.user.fullName, lotTitles: [lot.title], hasBid: true, hasWatch: false });
          }
          for (const w of lot.watchlist) {
            const ex = usersMap.get(w.user.id);
            if (ex) { if (!ex.lotTitles.includes(lot.title)) ex.lotTitles.push(lot.title); ex.hasWatch = true; }
            else usersMap.set(w.user.id, { email: w.user.email, fullName: w.user.fullName, lotTitles: [lot.title], hasBid: false, hasWatch: true });
          }
        }

        const liveTime = auction.liveStartDate
          ? new Date(auction.liveStartDate).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })
          : '—';

        for (const [userId, u] of usersMap) {
          const reason = u.hasBid && u.hasWatch ? 'Teklif verdiğiniz ve takip ettiğiniz lotlar'
            : u.hasBid ? 'Teklif verdiğiniz lotlar' : 'Takip ettiğiniz lotlar';
          const lotList = u.lotTitles.slice(0, 5).map(t => `<li style="margin:4px 0;color:#e5e7eb">${t}</li>`).join('');
          const more = u.lotTitles.length > 5 ? `<p style="color:#666">ve ${u.lotTitles.length - 5} lot daha...</p>` : '';

          const htmlBody = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e7eb">
            <div style="background:linear-gradient(135deg,#1a1a2e,#0a0a0a);padding:30px;text-align:center;border-bottom:2px solid #d4af37">
              <h1 style="color:#d4af37;margin:0;font-size:24px">🔴 Canlı Müzayede 20 dk Sonra!</h1>
            </div>
            <div style="padding:30px">
              <p style="font-size:16px">Merhaba ${u.fullName},</p>
              <div style="background:#1a1a2e;border:1px solid #d4af37;border-radius:8px;padding:20px;margin:20px 0">
                <h2 style="color:#d4af37;margin:0 0 10px;font-size:18px">${auction.title}</h2>
                <p style="color:#9ca3af;margin:5px 0">🏪 ${auction.seller.companyName}</p>
                <p style="margin:5px 0">🕐 Canlı Başlangıç: <strong style="color:#d4af37">${liveTime}</strong></p>
                <p style="color:#9ca3af;margin:5px 0">📦 Toplam ${auction.lots.length} lot</p>
              </div>
              <p>${reason}:</p>
              <ul style="color:#d4af37;padding-left:20px">${lotList}</ul>${more}
              <div style="background:#1a1a2e;border-radius:8px;padding:15px;margin:20px 0;border-left:3px solid #ef4444">
                <p style="color:#ef4444;margin:0;font-weight:bold">⚡ Lotlar sırayla açılacak ve kısa sürede kapanacak!</p>
                <p style="color:#9ca3af;margin:5px 0 0;font-size:13px">Canlı müzayedeye katılarak tekliflerinizi verin.</p>
              </div>
              <div style="text-align:center;margin:30px 0">
                <a href="${appUrl}/canli/${auction.id}" style="display:inline-block;background:#d4af37;color:#000;padding:14px 35px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">🔴 Canlı Müzayedeye Katıl</a>
              </div>
            </div>
            <div style="padding:15px 30px;border-top:1px solid #333;text-align:center">
              <p style="color:#666;font-size:12px;margin:0">Teklif verdiğiniz veya takip ettiğiniz lotlar için gönderilmiştir.</p>
            </div>
          </div>`;

          // E-posta
          try {
            await sendEmail({
              to: u.email,
              subject: `🔴 ${auction.title} — Canlı müzayede 20 dk sonra!`,
              html: htmlBody,
            });
            liveRemindersSent++;
          } catch (e) { console.error(`Live reminder email failed for ${u.email}:`, e); }

          // Uygulama içi bildirim
          try {
            await createInAppNotification({
              userId,
              title: '🔴 Canlı Müzayede 20 dk Sonra!',
              message: `${auction.title} canlı müzayedesi başlamak üzere. ${reason.toLowerCase()}: ${u.lotTitles.slice(0, 3).join(', ')}${u.lotTitles.length > 3 ? '...' : ''}`,
              type: 'LIVE_AUCTION_REMINDER',
              link: `/canli/${auction.id}`,
              preferenceType: 'LiveAuction',
            });
          } catch (e) { console.error('Live reminder notification failed:', e); }
        }

        await prisma.auction.update({ where: { id: auction.id }, data: { liveReminderSent: true } });
      }
    } catch (e) {
      console.error('Live reminder step error:', e);
    }

    // 5. Yakın canlı müzayedeleri döndür
    const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcomingLive = await prisma.auction.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lte: oneDayLater, gte: now },
        isPublic: true,
      },
      select: {
        id: true,
        title: true,
        endDate: true,
        liveStartDate: true,
      },
    });

    return NextResponse.json({
      transitioned,
      completedAuctions: expiredAuctions.length,
      liveRemindersSent,
      upcomingLive,
      timestamp: now.toISOString(),
    });
  } catch (error: any) {
    console.error('Check live cron error:', error);
    return NextResponse.json({ error: 'Kontrol başarısız' }, { status: 500 });
  }
}
