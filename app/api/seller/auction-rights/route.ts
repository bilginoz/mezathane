export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { getSellerRightBalance, AUCTION_RIGHT_UNIT_PRICE, AUCTION_RIGHT_VALIDITY_DAYS, AUCTION_RIGHT_MAX_QTY } from '@/lib/auction-rights';

async function getSeller(userId: string) {
  return prisma.sellerProfile.findUnique({ where: { userId }, select: { id: true, status: true } });
}

// Satıcının hak bakiyesi, geçmiş talepleri ve havale bilgileri.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const seller = await getSeller(userId);
  if (!seller) return NextResponse.json({ error: 'Satıcı profili yok' }, { status: 403 });

  try {
    const [{ balance, soonestExpiry }, purchases, settings] = await Promise.all([
      getSellerRightBalance(seller.id),
      prisma.auctionRightPurchase.findMany({
        where: { sellerId: seller.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.siteSettings.findUnique({
        where: { id: 'default' },
        select: { bankName: true, bankAccountHolder: true, bankIban: true },
      }),
    ]);

    return NextResponse.json({
      balance,
      soonestExpiry,
      purchases,
      unitPrice: AUCTION_RIGHT_UNIT_PRICE,
      validityDays: AUCTION_RIGHT_VALIDITY_DAYS,
      maxQty: AUCTION_RIGHT_MAX_QTY,
      bankInfo: settings ?? null,
    });
  } catch (e) {
    console.error('auction-rights GET error', e);
    return NextResponse.json({ error: 'Yüklenemedi' }, { status: 500 });
  }
}

// Yeni hak satın alma talebi oluşturur (PENDING). Ödeme havale ile yapılır, admin onaylar.
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const userId = (session.user as any).id as string;
  const seller = await getSeller(userId);
  if (!seller) return NextResponse.json({ error: 'Satıcı profili yok' }, { status: 403 });
  if (seller.status !== 'APPROVED') return NextResponse.json({ error: 'Onaylı satıcı olmalısınız' }, { status: 403 });

  try {
    const body = await request.json();
    const quantity = Math.floor(Number(body.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > AUCTION_RIGHT_MAX_QTY) {
      return NextResponse.json({ error: `Adet 1 ile ${AUCTION_RIGHT_MAX_QTY} arasında olmalı` }, { status: 400 });
    }
    const sellerNote = typeof body.sellerNote === 'string' ? body.sellerNote.slice(0, 500) : null;

    const purchase = await prisma.auctionRightPurchase.create({
      data: {
        sellerId: seller.id,
        quantity,
        unitPrice: AUCTION_RIGHT_UNIT_PRICE,
        totalAmount: quantity * AUCTION_RIGHT_UNIT_PRICE,
        status: 'PENDING',
        remaining: 0,
        sellerNote,
      },
    });

    return NextResponse.json({ success: true, purchase });
  } catch (e) {
    console.error('auction-rights POST error', e);
    return NextResponse.json({ error: 'Talep oluşturulamadı' }, { status: 500 });
  }
}
