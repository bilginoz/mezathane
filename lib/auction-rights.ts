import { prisma } from '@/lib/prisma';

// Müzayede Hakkı (kontör) sabitleri — tek yerden yönetilir.
export const AUCTION_RIGHT_UNIT_PRICE = 1900; // TL / hak
export const AUCTION_RIGHT_VALIDITY_DAYS = 60; // onaydan itibaren geçerlilik
export const AUCTION_RIGHT_MAX_QTY = 100; // tek talepte en fazla

// Satıcının kullanılabilir hak bakiyesi: onaylı, kalanı>0 ve süresi dolmamış partiler.
export async function getSellerRightBalance(sellerId: string) {
  const now = new Date();
  const batches = await prisma.auctionRightPurchase.findMany({
    where: {
      sellerId,
      status: 'APPROVED',
      remaining: { gt: 0 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { expiresAt: 'asc' },
    select: { id: true, remaining: true, expiresAt: true },
  });
  const balance = batches.reduce((s, b) => s + b.remaining, 0);
  // En yakın dolacak parti (uyarı göstermek için)
  const soonest = batches.find((b) => b.expiresAt) ?? null;
  return { balance, batches, soonestExpiry: soonest?.expiresAt ?? null };
}

// Bir hak tüketir (müzayede açılışında). Transaction client (tx) İÇİNDE çağrılmalı ki
// kontrol + düşme atomik olsun. Süresi en yakın dolan partiden düşer (FIFO/erken-yanan).
// Hak yoksa false döner (çağıran iptal eder).
export async function consumeOneRight(tx: any, sellerId: string): Promise<boolean> {
  const now = new Date();
  const batch = await tx.auctionRightPurchase.findFirst({
    where: {
      sellerId,
      status: 'APPROVED',
      remaining: { gt: 0 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { expiresAt: 'asc' },
    select: { id: true },
  });
  if (!batch) return false;
  await tx.auctionRightPurchase.update({
    where: { id: batch.id },
    data: { remaining: { decrement: 1 } },
  });
  return true;
}
