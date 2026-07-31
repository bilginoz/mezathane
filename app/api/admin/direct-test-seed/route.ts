export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/*
  DIRECT (V2) UÇTAN-UCA TEST — admin'e özel test verisi kurucu.
  Amaç: gerçek bir test satışı (test satıcı + test alıcı + kısa müzayede + 1 lot + kazanan teklif)
  oluşturmak; sonra flag DIRECT'e alınıp check-live tetiklenince ödeme/onay/kargo/satış-kaydı
  ekranları gerçek veriyle doğrulanır. Bitince 'cleanup' ile her şey silinir (iki kullanıcı silinince
  DB cascade ile müzayede/lot/teklif/ödeme/bildirim otomatik gider).

  Bu bir TEST aracıdır; test bittikten sonra bu dosya silinebilir.
*/

const SELLER_EMAIL = 'direct-test-seller@mezathane.test';
const BUYER_EMAIL = 'direct-test-buyer@mezathane.test';
const TEST_PASSWORD = 'DirectTest2026!';
const SELLER_PHONE = '+900000000001';
const BUYER_PHONE = '+900000000002';
const SELLER_IBAN = 'TR000000000000000000000001';
const BUYER_PREMIUM_RATE = 10; // satıcının belirlediği alıcı komisyonu (%)
const START_PRICE = 100;
const WINNING_BID = 150;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'ADMIN') return null;
  return session;
}

async function cleanup() {
  // İki test kullanıcısını sil → SellerProfile/Auction/Lot/Bid/Payment/Notification cascade ile gider.
  await prisma.user.deleteMany({ where: { email: { in: [SELLER_EMAIL, BUYER_EMAIL] } } });
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  const seller = await prisma.user.findUnique({ where: { email: SELLER_EMAIL }, select: { id: true } });
  const buyer = await prisma.user.findUnique({ where: { email: BUYER_EMAIL }, select: { id: true } });
  return NextResponse.json({ exists: !!(seller || buyer) });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = body?.action;

  try {
    if (action === 'cleanup') {
      await cleanup();
      return NextResponse.json({ ok: true, message: 'Test verisi temizlendi.' });
    }

    if (action === 'end_now') {
      // Test müzayedesinin bitiş saatini geçmişe çek (check-live hemen işlesin).
      const seller = await prisma.user.findUnique({ where: { email: SELLER_EMAIL }, include: { sellerProfile: true } });
      if (!seller?.sellerProfile) return NextResponse.json({ error: 'Önce seed çalıştırın.' }, { status: 400 });
      await prisma.auction.updateMany({
        where: { sellerId: seller.sellerProfile.id },
        data: { endDate: new Date(Date.now() - 60 * 1000), status: 'ACTIVE' },
      });
      return NextResponse.json({ ok: true, message: 'Müzayede bitti işaretlendi. Şimdi check-live tetikleyin.' });
    }

    if (action === 'accounts_only') {
      // Temiz test hesapları: onaylı satıcı (IBAN+komisyon+haklar) + alıcı. Müzayede/teklif oluşturmaz.
      await cleanup();
      const password = await bcrypt.hash(TEST_PASSWORD, 12);
      const now = new Date();

      const sellerUser = await prisma.user.create({
        data: {
          email: SELLER_EMAIL, password, fullName: '[TEST] Satıcı', phone: SELLER_PHONE,
          role: 'SELLER', isActive: true, isEmailVerified: true, emailVerified: now,
          isPhoneVerified: true, hasAcceptedTerms: true, hasKvkkConsent: true,
        },
      });
      const sellerProfile = await prisma.sellerProfile.create({
        data: {
          userId: sellerUser.id, companyName: '[DIRECT-TEST] Test Müzayede Evi',
          status: 'APPROVED', iban: SELLER_IBAN, commissionRate: 0,
          buyerPremiumRate: BUYER_PREMIUM_RATE,
          salesTerms: 'TEST: Ürünler faturalıdır, kargo 3 iş günü içinde gönderilir. İade 7 gün içinde kabul edilir.',
        },
      });
      // 5 adet onaylı Müzayede Hakkı — satıcı hemen müzayede açabilsin.
      await prisma.auctionRightPurchase.create({
        data: {
          sellerId: sellerProfile.id, quantity: 5, unitPrice: 1900, totalAmount: 5 * 1900,
          status: 'APPROVED', remaining: 5, expiresAt: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
          approvedAt: now, sellerNote: 'Test hakkı (otomatik)',
        },
      });

      await prisma.user.create({
        data: {
          email: BUYER_EMAIL, password, fullName: '[TEST] Alıcı', phone: BUYER_PHONE,
          role: 'BUYER', isActive: true, isEmailVerified: true, emailVerified: now,
          isPhoneVerified: true, hasAcceptedTerms: true, hasKvkkConsent: true,
          shippingAddress: 'Test Mah. Test Sok. No:1 Marmaris/Muğla', city: 'Muğla', district: 'Marmaris',
        },
      });

      return NextResponse.json({
        ok: true,
        message: 'Test hesapları oluşturuldu (satıcı onaylı + 5 müzayede hakkı, alıcı).',
        credentials: {
          seller: { email: SELLER_EMAIL, password: TEST_PASSWORD },
          buyer: { email: BUYER_EMAIL, password: TEST_PASSWORD },
        },
      });
    }

    if (action === 'seed') {
      await cleanup(); // önceki test kalıntılarını temizle
      const password = await bcrypt.hash(TEST_PASSWORD, 12);
      const now = new Date();

      // Test satıcı (onaylı, IBAN + komisyon oranı dolu)
      const sellerUser = await prisma.user.create({
        data: {
          email: SELLER_EMAIL, password, fullName: '[TEST] Satıcı', phone: SELLER_PHONE,
          role: 'SELLER', isActive: true, isEmailVerified: true, emailVerified: now,
          isPhoneVerified: true, hasAcceptedTerms: true, hasKvkkConsent: true,
        },
      });
      const sellerProfile = await prisma.sellerProfile.create({
        data: {
          userId: sellerUser.id, companyName: '[DIRECT-TEST] Test Müzayede Evi',
          status: 'APPROVED', iban: SELLER_IBAN, commissionRate: 0,
          buyerPremiumRate: BUYER_PREMIUM_RATE,
          salesTerms: 'TEST: Ürünler faturalıdır, kargo 3 iş günü içinde gönderilir. İade 7 gün içinde kabul edilir.',
        },
      });

      // Test alıcı (teslimat bilgileri dolu)
      const buyerUser = await prisma.user.create({
        data: {
          email: BUYER_EMAIL, password, fullName: '[TEST] Alıcı', phone: BUYER_PHONE,
          role: 'BUYER', isActive: true, isEmailVerified: true, emailVerified: now,
          isPhoneVerified: true, hasAcceptedTerms: true, hasKvkkConsent: true,
          shippingAddress: 'Test Mah. Test Sok. No:1 Marmaris/Muğla', city: 'Muğla', district: 'Marmaris',
        },
      });

      // Kısa test müzayedesi (biteli 1 dk olmuş → check-live hemen işleyebilir), 1 lot, kazanan teklif
      const auction = await prisma.auction.create({
        data: {
          title: '[DIRECT-TEST] Doğrudan Ödeme Test Müzayedesi',
          description: 'DIRECT uçtan-uca test için otomatik oluşturuldu.',
          sellerId: sellerProfile.id, status: 'ACTIVE',
          startDate: new Date(now.getTime() - 60 * 60 * 1000),
          endDate: new Date(now.getTime() - 60 * 1000),
          liveStartDate: null, isPublic: true, paymentDays: 5,
          commissionRate: 0, buyerPremiumRate: BUYER_PREMIUM_RATE,
        },
      });
      const lot = await prisma.lot.create({
        data: {
          lotNumber: 1, title: '[TEST] Numune Lot', description: 'Test lotu.',
          auctionId: auction.id, startingPrice: START_PRICE, currentPrice: WINNING_BID,
          status: 'ACTIVE', kdvRate: 20, bidCount: 1,
        },
      });
      await prisma.bid.create({
        data: { amount: WINNING_BID, userId: buyerUser.id, lotId: lot.id },
      });

      return NextResponse.json({
        ok: true,
        message: 'Test verisi oluşturuldu.',
        credentials: {
          seller: { email: SELLER_EMAIL, password: TEST_PASSWORD },
          buyer: { email: BUYER_EMAIL, password: TEST_PASSWORD },
        },
        auctionId: auction.id,
        lotId: lot.id,
        expected: { startPrice: START_PRICE, winningBid: WINNING_BID, buyerPremiumRate: BUYER_PREMIUM_RATE,
          note: 'DIRECT check-live sonrası: komisyon=15, KDV=3, toplam=168; platform payı 0.' },
      });
    }

    return NextResponse.json({ error: 'Geçersiz action (seed | end_now | cleanup)' }, { status: 400 });
  } catch (error: any) {
    console.error('direct-test-seed error:', error);
    return NextResponse.json({ error: error?.message ?? 'Test verisi işlemi başarısız' }, { status: 500 });
  }
}
