/**
 * clean-slate.ts — PayTR açılışı öncesi TEMİZ SAYFA.
 *
 * SİLER: tüm kullanıcı + işlem verisi (ADMIN olmayan kullanıcılar, tüm müzayede,
 *        lot, teklif, ödeme, satıcı profili, mesaj, uyuşmazlık, cari kayıt, log…).
 * KORUR: ADMIN kullanıcılar, kategoriler, platform/site ayarları, sayfalar,
 *        e-posta şablonları, kuponlar, blog, etiket tanımları.
 *
 * GÜVENLİK:
 *  - Varsayılan KURU ÇALIŞMA (dry-run): hiçbir şey silmez, sadece ne silineceğini yazar.
 *  - Gerçekten silmek için:  --confirm  bayrağı gerekir.
 *  - Tüm silmeler tek bir TRANSACTION içinde; sıra hatası olursa her şey geri alınır
 *    (kısmi silme olmaz).
 *
 * Çalıştırma:
 *   Kuru çalışma:  DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/clean-slate.ts
 *   Gerçek silme:  DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/clean-slate.ts --confirm
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const CONFIRM = process.argv.includes('--confirm');

// Silmeden önce, silinecek her şeyi tek bir JSON dosyasına döker (geri alınamaz
// işlem için sigorta). Yol: BACKUP_PATH env'i veya varsayılan geçici klasör.
async function backup(): Promise<string> {
  const data: Record<string, unknown> = {};
  const tables: [string, () => Promise<unknown>][] = [
    ['users', () => prisma.user.findMany()],
    ['sellerProfiles', () => prisma.sellerProfile.findMany()],
    ['auctions', () => prisma.auction.findMany()],
    ['lots', () => prisma.lot.findMany()],
    ['lotImages', () => prisma.lotImage.findMany()],
    ['bids', () => prisma.bid.findMany()],
    ['proxyBids', () => prisma.proxyBid.findMany()],
    ['payments', () => prisma.payment.findMany()],
    ['watchlists', () => prisma.watchlist.findMany()],
    ['sellerReviews', () => prisma.sellerReview.findMany()],
    ['notifications', () => prisma.notification.findMany()],
    ['savedSearches', () => prisma.savedSearch.findMany()],
    ['accounts', () => prisma.account.findMany()],
    ['sessions', () => prisma.session.findMany()],
    ['disputes', () => prisma.dispute.findMany()],
    ['conversations', () => prisma.conversation.findMany()],
    ['messages', () => prisma.message.findMany()],
    ['ledgerEntries', () => prisma.ledgerEntry.findMany()],
    ['installmentPlans', () => prisma.installmentPlan.findMany()],
    ['installments', () => prisma.installment.findMany()],
    ['auctionTemplates', () => prisma.auctionTemplate.findMany()],
    ['sellerDocuments', () => prisma.sellerDocument.findMany()],
    ['fieldChangeRequests', () => prisma.fieldChangeRequest.findMany()],
    ['contactMessages', () => prisma.contactMessage.findMany()],
    ['auditLogs', () => prisma.auditLog.findMany()],
    ['lotHistory', () => prisma.lotHistory.findMany()],
    ['couponUsages', () => prisma.couponUsage.findMany()],
    ['referrals', () => prisma.referral.findMany()],
  ];
  for (const [name, fn] of tables) data[name] = await fn();
  const path = process.env.BACKUP_PATH || `/tmp/mezathane-clean-slate-backup-${Date.now()}.json`;
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
  return path;
}

// Çocuktan → ebeveyne doğru silme sırası. Her tablo açıkça siliniyor (cascade'e
// güvenilmiyor), böylece Dispute.reporter gibi Restrict ilişkiler engel olmuyor.
// (t) = transaction client.
async function wipe(t: any) {
  const steps: [string, () => Promise<{ count: number }>][] = [
    ['Installment', () => t.installment.deleteMany()],
    ['InstallmentPlan', () => t.installmentPlan.deleteMany()],
    ['Message', () => t.message.deleteMany()],
    ['Conversation', () => t.conversation.deleteMany()],
    ['Dispute', () => t.dispute.deleteMany()],
    ['LotHistory', () => t.lotHistory.deleteMany()],
    ['LotTag', () => t.lotTag.deleteMany()],
    ['LotCategory', () => t.lotCategory.deleteMany()],
    ['LotImage', () => t.lotImage.deleteMany()],
    ['Bid', () => t.bid.deleteMany()],
    ['ProxyBid', () => t.proxyBid.deleteMany()],
    ['Watchlist', () => t.watchlist.deleteMany()],
    ['Payment', () => t.payment.deleteMany()],
    ['SellerReview', () => t.sellerReview.deleteMany()],
    ['SellerDocument', () => t.sellerDocument.deleteMany()],
    ['FieldChangeRequest', () => t.fieldChangeRequest.deleteMany()],
    ['AuctionTemplate', () => t.auctionTemplate.deleteMany()],
    ['LedgerEntry', () => t.ledgerEntry.deleteMany()],
    ['CouponUsage', () => t.couponUsage.deleteMany()],
    ['Referral', () => t.referral.deleteMany()],
    ['Notification', () => t.notification.deleteMany()],
    ['NotificationPreference', () => t.notificationPreference.deleteMany()],
    ['SavedSearch', () => t.savedSearch.deleteMany()],
    ['Account', () => t.account.deleteMany()],
    ['Session', () => t.session.deleteMany()],
    ['ContactMessage', () => t.contactMessage.deleteMany()],
    ['AuditLog', () => t.auditLog.deleteMany()],
    ['Lot', () => t.lot.deleteMany()],
    ['Auction', () => t.auction.deleteMany()],
    ['SellerProfile', () => t.sellerProfile.deleteMany()],
    ['User (ADMIN olmayan)', () => t.user.deleteMany({ where: { role: { not: 'ADMIN' } } })],
  ];
  for (const [name, fn] of steps) {
    const r = await fn();
    console.log(`  silindi ${String(r.count).padStart(5)}  ${name}`);
  }
}

async function main() {
  console.log(`\n=== TEMİZ SAYFA ${CONFIRM ? '(GERÇEK SİLME)' : '(KURU ÇALIŞMA — hiçbir şey silinmez)'} ===\n`);

  // Korunacakların özeti
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { email: true } });
  const cats = await prisma.category.count();
  console.log(`KORUNACAK: ${admins.length} admin (${admins.map((a) => a.email).join(', ')}), ${cats} kategori, platform/site ayarları, sayfalar, kuponlar, blog, e-posta şablonları.\n`);

  if (!CONFIRM) {
    // Silinecek adetleri göster (silmeden)
    const [users, auctions, lots, bids, payments, sellers] = await Promise.all([
      prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
      prisma.auction.count(),
      prisma.lot.count(),
      prisma.bid.count(),
      prisma.payment.count(),
      prisma.sellerProfile.count(),
    ]);
    console.log('SİLİNECEK (özet):');
    console.log(`  ADMIN olmayan kullanıcı: ${users}`);
    console.log(`  müzayede: ${auctions}, lot: ${lots}, teklif: ${bids}, ödeme: ${payments}, satıcı profili: ${sellers}`);
    console.log('\n>>> Bu bir KURU ÇALIŞMA idi, HİÇBİR ŞEY SİLİNMEDİ.');
    console.log('>>> Gerçekten silmek için betiği --confirm ile çalıştır.\n');
    return;
  }

  console.log('Önce yedek alınıyor...');
  const backupPath = await backup();
  console.log(`✓ Yedek yazıldı: ${backupPath}\n`);

  console.log('Siliniyor (transaction, hata olursa tümü geri alınır)...\n');
  await prisma.$transaction(async (t) => { await wipe(t); }, { timeout: 120000 });
  console.log('\n✓ TEMİZ SAYFA TAMAM. Adminler, kategoriler ve site içeriği korundu.\n');
}

main()
  .catch((e) => { console.error('HATA (hiçbir şey silinmedi / geri alındı):', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
