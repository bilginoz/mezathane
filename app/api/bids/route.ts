export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { getMinBidIncrement } from '@/lib/utils';
import { createInAppNotification, sendCheckedNotificationEmail } from '@/lib/notifications';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';
import { logLotEvent } from '@/lib/lot-history';
import { getEmailTemplate } from '@/lib/email-templates';
import { triggerLiveUpdate } from '@/lib/realtime';

// Proxy bid otomatik teklif işlemi
async function processProxyBids(lotId: string, currentBidAmount: number, currentBidderId: string, customBidIncrement?: number | null) {
  const minIncrement = getMinBidIncrement(currentBidAmount, customBidIncrement);
  
  // Aktif proxy bid'leri bul (mevcut teklif sahibi hariç)
  const activeProxies = await prisma.proxyBid.findMany({
    where: {
      lotId,
      isActive: true,
      userId: { not: currentBidderId },
      maxAmount: { gt: currentBidAmount },
    },
    orderBy: { maxAmount: 'desc' },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });

  if (activeProxies.length === 0) return null;

  const topProxy = activeProxies[0];
  const autoBidAmount = Math.min(topProxy.maxAmount, currentBidAmount + minIncrement);

  // Mevcut en yükseği kaldır
  await prisma.bid.updateMany({
    where: { lotId, isWinning: true },
    data: { isWinning: false },
  });

  // Proxy kullanıcının otomatik teklifini oluştur
  await prisma.bid.create({
    data: {
      amount: autoBidAmount,
      maxAmount: topProxy.maxAmount,
      userId: topProxy.userId,
      lotId,
      type: 'PROXY',
      isWinning: true,
      ipAddress: topProxy.ipAddress ?? 'proxy',
    },
  });

  await prisma.lot.update({
    where: { id: lotId },
    data: { currentPrice: autoBidAmount, bidCount: { increment: 1 } },
  });

  // Geçilen kullanıcıya bildirim
  try {
    const lot = await prisma.lot.findUnique({ where: { id: lotId }, select: { title: true } });
    await createInAppNotification({
      userId: currentBidderId,
      title: 'Otomatik Teklif Geçti!',
      message: `"${lot?.title}" için teklifiniz otomatik teklif sistemi tarafından geçildi. Yeni en yüksek teklif: ${autoBidAmount.toLocaleString('tr-TR')} ₺`,
      type: 'BID_OUTBID',
      link: `/lot/${lotId}`,
      preferenceType: 'Outbid',
    });
  } catch {}

  return { userId: topProxy.userId, amount: autoBidAmount };
}

async function handleAntiSniping(lot: any): Promise<boolean> {
  if (lot.auction.status === 'LIVE' && lot.liveEndTime) {
    const extension = (lot.auction as any).liveBidExtension ?? 10;
    const newEndTime = new Date(Math.max(
      new Date(lot.liveEndTime).getTime(),
      Date.now()
    ) + extension * 1000);
    await prisma.lot.update({
      where: { id: lot.id },
      data: { liveEndTime: newEndTime },
    });
    return true;
  } else {
    const SNIPING_THRESHOLD = 60;
    const endTime = lot.liveEndTime || (lot.auction.endDate ? new Date(lot.auction.endDate) : null);
    if (endTime) {
      const timeLeft = new Date(endTime).getTime() - Date.now();
      if (timeLeft > 0 && timeLeft < (SNIPING_THRESHOLD * 1000)) {
        const newEndTime = new Date(Date.now() + (SNIPING_THRESHOLD * 1000));
        await prisma.lot.update({
          where: { id: lot.id },
          data: { liveEndTime: newEndTime },
        });
        if (lot.auction.endDate) {
          await prisma.auction.update({
            where: { id: lot.auctionId },
            data: { endDate: newEndTime },
          });
        }
        return true;
      }
    }
  }
  return false;
}

async function notifyOutbidUser(previousBidder: any, lotTitle: string, lotId: string, newAmount: number) {
  if (!previousBidder) return;
  try {
    const bidderUserId = previousBidder.userId;
    // Uygulama içi bildirim
    await createInAppNotification({
      userId: bidderUserId,
      title: 'Teklifiniz Geçildi!',
      message: `"${lotTitle}" için teklifiniz geçildi. Yeni en yüksek teklif: ${newAmount.toLocaleString('tr-TR')} ₺`,
      type: 'BID_OUTBID',
      link: `/lot/${lotId}`,
      preferenceType: 'Outbid',
    });
    // E-posta bildirimi (şablon destekli)
    const outbidTmpl = await getEmailTemplate('outbid', {
      lotTitle, amount: `${newAmount.toLocaleString('tr-TR')} ₺`, lotUrl: `${process.env.NEXTAUTH_URL}/lot/${lotId}`,
    });
    if (outbidTmpl) {
      await sendCheckedNotificationEmail({
        userId: bidderUserId,
        recipientEmail: previousBidder?.user?.email ?? '',
        subject: outbidTmpl.subject,
        body: outbidTmpl.body,
        preferenceType: 'Outbid',
      }).catch(() => {});
    }
  } catch {}
}

// Favori lot izleyicilerine bildirim
async function notifyWatchlistUsers(lotId: string, lotTitle: string, bidderUserId: string, bidAmount: number) {
  try {
    const watchers = await prisma.watchlist.findMany({
      where: { lotId, userId: { not: bidderUserId } },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    for (const watcher of watchers) {
      // Uygulama içi
      await createInAppNotification({
        userId: watcher.userId,
        title: 'İzlediğiniz Lota Teklif Geldi!',
        message: `"${lotTitle}" için yeni teklif: ${bidAmount.toLocaleString('tr-TR')} ₺`,
        type: 'WATCHLIST_BID',
        link: `/lot/${lotId}`,
        preferenceType: 'WatchlistBid',
      });
      // E-posta (şablon destekli)
      const wTmpl = await getEmailTemplate('watchlist_bid', {
        userName: watcher.user.fullName, lotTitle, amount: `${bidAmount.toLocaleString('tr-TR')} ₺`, lotUrl: `${process.env.NEXTAUTH_URL}/lot/${lotId}`,
      });
      if (wTmpl) {
        await sendCheckedNotificationEmail({
          userId: watcher.userId,
          recipientEmail: watcher.user.email,
          subject: wTmpl.subject,
          body: wTmpl.body,
          preferenceType: 'WatchlistBid',
        }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Watchlist notification error:', error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // Rate limiting: 30 teklif/dk
    const clientIp = getClientIP(request);
    const rl = checkRateLimit(`bid:${clientIp}`, RATE_LIMITS.BID);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla teklif gönderdiniz. Lütfen biraz bekleyin.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const body = await request.json();
    const { lotId, amount, maxAmount, type } = body ?? {};

    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') ?? 'unknown';

    if (!lotId || !amount) {
      return NextResponse.json({ error: 'Lot ID ve teklif tutarı gerekli' }, { status: 400 });
    }

    // Tutarların gerçekten pozitif sayı olduğunu doğrula (sayı olmayan/negatif/NaN girişleri engelle)
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Geçersiz teklif tutarı' }, { status: 400 });
    }
    if (maxAmount !== undefined && maxAmount !== null &&
        (typeof maxAmount !== 'number' || !Number.isFinite(maxAmount) || maxAmount <= 0)) {
      return NextResponse.json({ error: 'Geçersiz maksimum teklif tutarı' }, { status: 400 });
    }

    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        auction: true,
        bids: { orderBy: { amount: 'desc' }, take: 1, include: { user: { select: { id: true, fullName: true, email: true } } } },
      },
    });

    if (!lot) return NextResponse.json({ error: 'Lot bulunamadı' }, { status: 404 });
    if (lot.status !== 'ACTIVE' && lot.status !== 'PENDING') {
      return NextResponse.json({ error: 'Bu lot için teklif verilemez' }, { status: 400 });
    }

    // Sadece Canlı müzayedelerde LIVE olmadan teklif vermeyi engelle
    if (lot.auction.liveOnly && lot.auction.status !== 'LIVE') {
      return NextResponse.json({ error: 'Bu müzayede sadece canlı olarak gerçekleşecek. Canlı müzayede başladığında teklif verebilirsiniz.' }, { status: 400 });
    }

    // Canlı müzayededeki lota dışarıdan teklif vermeyi engelle
    if (lot.auction.status === 'LIVE' && lot.liveEndTime) {
      const source = body.source;
      if (source !== 'live') {
        return NextResponse.json({ error: 'Bu lot şu anda canlı müzayedede. Teklif vermek için canlı müzayede sayfasına gidin.' }, { status: 400 });
      }
    }

    // Müzayede durumu kontrolü — COMPLETED veya CANCELLED ise teklif engelle
    if (lot.auction.status === 'COMPLETED' || lot.auction.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Bu müzayede sona ermiştir. Teklif verilemez.' }, { status: 400 });
    }

    const auctionStartDate = lot.auction.startDate ? new Date(lot.auction.startDate) : null;
    if (auctionStartDate && new Date() < auctionStartDate) {
      return NextResponse.json({ error: 'Müzayede henüz başlamadı. Teklif veremezsiniz.' }, { status: 400 });
    }

    // Süre dolmuş mu kontrol et (cron henüz çalışmamış olabilir)
    const effectiveEndDate = lot.liveEndTime ? new Date(lot.liveEndTime) : (lot.auction.endDate ? new Date(lot.auction.endDate) : null);
    if (effectiveEndDate && new Date() > effectiveEndDate) {
      return NextResponse.json({ error: 'Müzayede süresi dolmuştur. Teklif verilemez.' }, { status: 400 });
    }

    const currentHighest = lot?.bids?.[0]?.amount ?? lot.startingPrice;
    const minIncrement = getMinBidIncrement(currentHighest, lot.customBidIncrement);
    const minBid = currentHighest + minIncrement;

    // E-posta doğrulama kontrolü
    const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isEmailVerified: true } });

    // E-posta doğrulanmamış kullanıcılar teklif veremez
    if (!userRecord?.isEmailVerified) {
      return NextResponse.json({ error: 'Teklif vermek için e-posta adresinizi doğrulamanız gerekmektedir.', needsVerification: true }, { status: 403 });
    }

    // Kendi lotuna teklif verme kontrolü (SELLER veya ADMIN — shill bidding engeli)
    const auctionSeller = await prisma.sellerProfile.findUnique({
      where: { id: lot.auction.sellerId },
    });
    if (auctionSeller?.userId === userId) {
      return NextResponse.json({ error: 'Kendi ilanınıza teklif veremezsiniz. Bu işlem platform kurallarına aykırıdır.' }, { status: 403 });
    }
    if (auctionSeller?.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Bu satıcı askıya alınmıştır' }, { status: 400 });
    }

    // ====== PROXY TEKLİF ======
    if (type === 'PROXY' && maxAmount) {
      if (maxAmount < minBid) {
        return NextResponse.json({ error: `Maksimum teklif en az ${minBid.toLocaleString('tr-TR')} ₺ olmalıdır` }, { status: 400 });
      }

      // ProxyBid kaydını oluştur/güncelle
      await prisma.proxyBid.upsert({
        where: { userId_lotId: { userId, lotId } },
        create: { userId, lotId, maxAmount, ipAddress },
        update: { maxAmount, isActive: true, ipAddress },
      });

      // Kullanıcı zaten en yüksek teklif sahibiyse sadece proxy max güncelle, yeni bid oluşturma
      const currentWinningBid = lot?.bids?.[0];
      if (currentWinningBid && currentWinningBid.userId === userId) {
        // Sadece proxy max güncellendi, fiyat değişmez
        return NextResponse.json({ success: true, currentPrice: lot.currentPrice, proxySet: true, proxyUpdated: true });
      }

      // Rakip proxy bid kontrolü
      const rivalProxy = await prisma.proxyBid.findFirst({
        where: { lotId, isActive: true, userId: { not: userId }, maxAmount: { gt: 0 } },
        orderBy: { maxAmount: 'desc' },
      });

      let finalAmount = amount < minBid ? minBid : amount;

      if (rivalProxy) {
        if (rivalProxy.maxAmount >= maxAmount) {
          // Rakip proxy daha yüksek - rakip kazanır
          const rivalBidAmount = Math.min(rivalProxy.maxAmount, maxAmount + minIncrement);
          
          await prisma.bid.updateMany({ where: { lotId, isWinning: true }, data: { isWinning: false } });
          
          await prisma.bid.create({
            data: { amount: maxAmount, maxAmount, userId, lotId, type: 'PROXY', isWinning: false, ipAddress },
          });
          await prisma.bid.create({
            data: { amount: rivalBidAmount, maxAmount: rivalProxy.maxAmount, userId: rivalProxy.userId, lotId, type: 'PROXY', isWinning: true, ipAddress: rivalProxy.ipAddress ?? 'proxy' },
          });
          
          await prisma.lot.update({ where: { id: lotId }, data: { currentPrice: rivalBidAmount, bidCount: { increment: 2 } } });

          try {
            await createInAppNotification({
              userId,
              title: 'Otomatik Teklifiniz Geçildi',
              message: `"${lot.title}" için belirlediğiniz maksimum teklif (${maxAmount.toLocaleString('tr-TR')} ₺) geçildi.`,
              type: 'BID_OUTBID',
              link: `/lot/${lotId}`,
              preferenceType: 'Outbid',
            });
          } catch {}

          await handleAntiSniping(lot);
          triggerLiveUpdate(lot.auctionId).catch(() => {});
          return NextResponse.json({ success: true, outbid: true, currentPrice: rivalBidAmount, proxySet: true });
        } else {
          finalAmount = rivalProxy.maxAmount + minIncrement;
        }
      }

      await prisma.bid.updateMany({ where: { lotId, isWinning: true }, data: { isWinning: false } });
      
      const bid = await prisma.bid.create({
        data: { amount: finalAmount, maxAmount, userId, lotId, type: 'PROXY', isWinning: true, ipAddress },
      });

      await prisma.lot.update({ where: { id: lotId }, data: { currentPrice: finalAmount, bidCount: { increment: 1 } } });

      const previousBidder = lot?.bids?.[0];
      if (previousBidder && previousBidder.userId !== userId) {
        await notifyOutbidUser(previousBidder, lot.title, lotId, finalAmount);
      }

      await handleAntiSniping(lot);
      // Favori lot izleyicilerine bildirim
      notifyWatchlistUsers(lotId, lot.title, userId, finalAmount).catch(() => {});
      // Lot geçmişine proxy teklif kaydı
      logLotEvent({ lotId, event: 'BID', description: `${finalAmount.toLocaleString('tr-TR')} ₺ otomatik teklif`, userId, metadata: { amount: finalAmount, type: 'PROXY' } });

      triggerLiveUpdate(lot.auctionId).catch(() => {});
      return NextResponse.json({ success: true, bid, currentPrice: finalAmount, proxySet: true });
    }

    // ====== MANUEL TEKLİF ======
    if (amount < minBid) {
      return NextResponse.json(
        { error: `Minimum teklif: ${minBid.toLocaleString('tr-TR')} ₺` },
        { status: 400 }
      );
    }

    const highestBid = lot?.bids?.[0];
    if (highestBid && highestBid.userId === userId) {
      return NextResponse.json({ error: 'Zaten en yüksek teklif sizde. Teklifinizi yükseltmek için Otomatik Teklif özelliğini kullanın.' }, { status: 400 });
    }

    // Sahte teklif kontrolü
    if (ipAddress && ipAddress !== 'unknown') {
      const sameIpDiffUser = await prisma.bid.findFirst({
        where: { lotId, ipAddress, userId: { not: userId } },
      });
      if (sameIpDiffUser) {
        console.warn(`[SAHTE_TEKLIF_UYARI] Aynı IP (${ipAddress}) farklı kullanıcı. User1: ${sameIpDiffUser.userId}, User2: ${userId}, Lot: ${lotId}`);
      }
    }

    await prisma.bid.updateMany({
      where: { lotId, isWinning: true },
      data: { isWinning: false },
    });

    const bid = await prisma.bid.create({
      data: {
        amount,
        userId,
        lotId,
        type: 'MANUAL',
        isWinning: true,
        ipAddress,
      },
    });

    await prisma.lot.update({
      where: { id: lotId },
      data: { currentPrice: amount, bidCount: { increment: 1 } },
    });

    const previousBidder = lot?.bids?.[0];
    if (previousBidder && previousBidder.userId !== userId) {
      await notifyOutbidUser(previousBidder, lot.title, lotId, amount);
    }

    const timeExtended = await handleAntiSniping(lot);

    // Manuel teklif sonrası proxy bid'leri kontrol et
    const proxyResult = await processProxyBids(lotId, amount, userId, lot.customBidIncrement);
    const finalPrice = proxyResult ? proxyResult.amount : amount;

    // Favori lot izleyicilerine bildirim (arka planda)
    notifyWatchlistUsers(lotId, lot.title, userId, finalPrice).catch(() => {});

    // Lot geçmişine kaydet
    logLotEvent({ lotId, event: 'BID', description: `${finalPrice.toLocaleString('tr-TR')} ₺ teklif verildi`, userId, metadata: { amount: finalPrice, type: 'MANUAL' } });

    triggerLiveUpdate(lot.auctionId).catch(() => {});
    return NextResponse.json({ success: true, bid, currentPrice: finalPrice, timeExtended });
  } catch (error: any) {
    console.error('Bid error:', error);
    return NextResponse.json({ error: 'Teklif verilemedi' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lotId = searchParams.get('lotId');
    if (!lotId) return NextResponse.json({ error: 'lotId gerekli' }, { status: 400 });

    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    const bids = await prisma.bid.findMany({
      where: { lotId },
      orderBy: { amount: 'desc' },
      take: 20,
      include: { user: { select: { id: true, fullName: true } } },
    });

    const bidsWithUserId = bids.map((b: any) => ({
      ...b,
      userId: b.user?.id,
    }));

    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      select: { currentPrice: true, bidCount: true, liveEndTime: true, status: true, auction: { select: { endDate: true } } },
    });

    // Kullanıcının aktif proxy bid'ini kontrol et
    let activeProxyBid = null;
    if (userId) {
      activeProxyBid = await prisma.proxyBid.findUnique({
        where: { userId_lotId: { userId, lotId } },
        select: { maxAmount: true, isActive: true },
      });
    }

    return NextResponse.json({ bids: bidsWithUserId, lot, activeProxyBid });
  } catch (error: any) {
    console.error('Bids fetch error:', error);
    return NextResponse.json({ error: 'Teklifler yüklenemedi' }, { status: 500 });
  }
}
