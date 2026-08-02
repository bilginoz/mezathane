import { prisma } from '@/lib/prisma';

// Müzayede Hakkı (kontör) sabitleri — tek yerden yönetilir.
export const AUCTION_RIGHT_UNIT_PRICE = 1900; // TL / hak (bu model KDV içermez, canlıda böyle kaldı)
export const AUCTION_RIGHT_VALIDITY_DAYS = 60; // onaydan itibaren geçerlilik
export const AUCTION_RIGHT_MAX_QTY = 100; // tek talepte en fazla

// Aylık Sınırsız Paket (2026-08-01, kullanıcı kararı): sınırsız müzayede açma hakkı, 35.000 TL/ay.
// KDV KARARI (2026-08-01, kullanıcı netleştirdi): sistem KDV'yi hesaplayıp tahsil ETMEZ — tahsil
// edilen/havale istenen tutar tam olarak bu rakamdır. Ekranlarda yalnızca "+KDV" ibaresi metin
// olarak gösterilir (KDV'nin ayrıca/muhasebe tarafında ele alınacağını belirtmek için).
// Aktif olduğu sürece consumeOneRight hiç hak düşmez (bkz. aşağıda).
export const AUCTION_RIGHT_UNLIMITED_PRICE = 35000; // TL / ay — tahsil edilen tam tutar budur
export const AUCTION_RIGHT_UNLIMITED_DAYS = 30;

// Satıcının aktif (süresi dolmamış, onaylı) Aylık Sınırsız Paketi varsa döner.
export async function getSellerUnlimitedPlan(sellerId: string) {
  const now = new Date();
  return prisma.auctionRightPurchase.findFirst({
    where: { sellerId, status: 'APPROVED', planType: 'UNLIMITED_MONTHLY', expiresAt: { gt: now } },
    orderBy: { expiresAt: 'desc' },
  });
}

// Satıcının kullanılabilir hak bakiyesi: onaylı, kalanı>0 ve süresi dolmamış partiler
// (yalnızca PER_AUCTION planları — sınırsız paket ayrı döner, sayıya dahil değildir).
export async function getSellerRightBalance(sellerId: string) {
  const now = new Date();
  const [batches, unlimitedPlan] = await Promise.all([
    prisma.auctionRightPurchase.findMany({
      where: {
        sellerId,
        planType: 'PER_AUCTION',
        status: 'APPROVED',
        remaining: { gt: 0 },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { expiresAt: 'asc' },
      select: { id: true, remaining: true, expiresAt: true },
    }),
    getSellerUnlimitedPlan(sellerId),
  ]);
  const balance = batches.reduce((s, b) => s + b.remaining, 0);
  // En yakın dolacak parti (uyarı göstermek için)
  const soonest = batches.find((b) => b.expiresAt) ?? null;
  return {
    balance,
    batches,
    soonestExpiry: soonest?.expiresAt ?? null,
    unlimitedActive: !!unlimitedPlan,
    unlimitedExpiresAt: unlimitedPlan?.expiresAt ?? null,
  };
}

// Bir hak tüketir (müzayede açılışında). Transaction client (tx) İÇİNDE çağrılmalı ki
// kontrol + düşme atomik olsun. Süresi en yakın dolan partiden düşer (FIFO/erken-yanan).
// Aktif bir Aylık Sınırsız Paket varsa HİÇBİR ŞEY düşülmez, doğrudan true döner.
// Hak yoksa false döner (çağıran iptal eder).
export async function consumeOneRight(tx: any, sellerId: string): Promise<boolean> {
  const now = new Date();
  const unlimited = await tx.auctionRightPurchase.findFirst({
    where: { sellerId, status: 'APPROVED', planType: 'UNLIMITED_MONTHLY', expiresAt: { gt: now } },
    select: { id: true },
  });
  if (unlimited) return true;

  const batch = await tx.auctionRightPurchase.findFirst({
    where: {
      sellerId,
      planType: 'PER_AUCTION',
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
