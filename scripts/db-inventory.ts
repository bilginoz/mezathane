/**
 * db-inventory.ts — SALT OKUR (read-only) veritabanı envanteri.
 *
 * Hiçbir şeyi SİLMEZ, DEĞİŞTİRMEZ. Sadece canlı veritabanında ne olduğunu döker:
 * kaç kullanıcı (role bazında + e-postalar), kaç müzayede (başlık/durum/sahip),
 * kaç lot, teklif, ödeme. Amaç: PayTR başvurusu öncesi "neyin demo neyin gerçek"
 * olduğunu görüp güvenle karar vermek.
 *
 * Çalıştırma (canlı Neon veritabanına bağlanır — DATABASE_URL gerekir):
 *   1. Neon panelinden connection string'i al, proje kökünde .env.local'e yaz:
 *        DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
 *   2. npx tsx --require dotenv/config scripts/db-inventory.ts
 *
 * Demo işareti: e-postası "@test.mezathane.tr" ile biten kullanıcılar ve onlara
 * bağlı kayıtlar (test-data-seed.ts bunları üretir).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TEST_MARK = '@test.mezathane.tr';

function isTest(email?: string | null) {
  return !!email && email.toLowerCase().endsWith(TEST_MARK);
}

async function main() {
  console.log('\n=== VERİTABANI ENVANTERİ (salt okur, hiçbir şey silinmez) ===\n');

  // --- Kullanıcılar ---
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  const byRole: Record<string, number> = {};
  for (const u of users) byRole[u.role] = (byRole[u.role] ?? 0) + 1;
  console.log(`KULLANICI: toplam ${users.length}`, byRole);
  for (const u of users) {
    console.log(`  ${isTest(u.email) ? '[DEMO]' : '[GERÇEK?]'} ${u.role.padEnd(6)} ${u.email}  (${u.fullName ?? ''})`);
  }

  // --- Müzayedeler ---
  const auctions = await prisma.auction.findMany({
    select: {
      id: true, title: true, status: true, createdAt: true,
      _count: { select: { lots: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`\nMÜZAYEDE: toplam ${auctions.length}`);
  for (const a of auctions) {
    console.log(`  [${a.status}] "${a.title}"  — ${a._count.lots} lot  (${a.createdAt.toISOString().slice(0, 10)})`);
  }

  // --- Lotlar ---
  const lotCount = await prisma.lot.count();
  const bidCount = await prisma.bid.count();
  const paymentCount = await prisma.payment.count();
  const reviewCount = await prisma.sellerReview.count().catch(() => 0);
  const sellerProfiles = await prisma.sellerProfile.count();
  console.log(`\nLOT: ${lotCount}   TEKLİF: ${bidCount}   ÖDEME: ${paymentCount}   SATICI PROFİLİ: ${sellerProfiles}   SATICI YORUMU: ${reviewCount}`);

  // --- Korunacaklar (silinmemeli) ---
  const categories = await prisma.category.count();
  const admins = users.filter((u) => u.role === 'ADMIN').map((u) => u.email);
  console.log(`\nKORUNACAK: kategori ${categories}, admin hesap(lar)ı: ${admins.join(', ')}`);

  // --- Demo özeti ---
  const demoUsers = users.filter((u) => isTest(u.email));
  console.log(`\n>>> DEMO İŞARETLİ kullanıcı sayısı: ${demoUsers.length}`);
  console.log('>>> Eğer yukarıda [GERÇEK?] işaretli, senin/adminin dışında GERÇEK bir');
  console.log('>>> kullanıcı YOKSA ve müzayedeler yalnızca demo başlıklarsa, silme güvenli.');
  console.log('>>> Aksi halde önce hangileri gerçek belirlenmeli.\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
