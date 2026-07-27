/**
 * seed-categories.ts — Mezathane kategori taksonomisini uygular.
 *
 * - "Antika" ve "Koleksiyon" muğlak şemsiye kategorileri KALDIRILIR (granüler
 *   kategoriler varken çakışma yaratıyorlardı).
 * - Rakip analizi sonrası (rakip_kategori_analizi.md) 11 kategori, görsel + sıra ile
 *   upsert edilir. Görseller Wikimedia Commons (özgür lisans, kararlı CDN).
 *
 * Çalıştırma (canlı DB — DATABASE_URL gerekir):
 *   DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/seed-categories.ts
 *
 * Not: Kategori görselleri geçici olarak dış (Wikimedia) URL'lerdir; istenirse
 * admin → Kategori Yönetimi'nden kendi görsellerimizle değiştirilebilir.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES: { name: string; slug: string; imageUrl: string }[] = [
  { name: 'Resim', slug: 'resim', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/500px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg' },
  { name: 'Halı & Kilim', slug: 'hali-kilim', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Antalya_museum_Anatolian_%E2%80%98slit-kilim%E2%80%99_Mid-20th_century_4847.jpg/500px-Antalya_museum_Anatolian_%E2%80%98slit-kilim%E2%80%99_Mid-20th_century_4847.jpg' },
  { name: 'Gümüş', slug: 'gumus', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Japansk_silvertekanna_med_dito_sil.jpg/500px-Japansk_silvertekanna_med_dito_sil.jpg' },
  { name: 'Mücevher', slug: 'mucevher', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Byzantine_-_Necklace_-_Walters_57544_-_View_A.jpg/500px-Byzantine_-_Necklace_-_Walters_57544_-_View_A.jpg' },
  { name: 'Saat', slug: 'saat', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Pocket_watch_of_William_S._Haynes.jpg/500px-Pocket_watch_of_William_S._Haynes.jpg' },
  { name: 'Porselen & Seramik', slug: 'porselen-seramik', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Iznik_mosque_lamp_dated_1549.jpg/500px-Iznik_mosque_lamp_dated_1549.jpg' },
  { name: 'Hat & Tezhip', slug: 'hat-tezhip', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Hilye-i_Saadet_by_Mustafa_Rakim.jpg/500px-Hilye-i_Saadet_by_Mustafa_Rakim.jpg' },
  { name: 'Efemera', slug: 'efemera', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Constantinople_Purger_2802.jpg/500px-Constantinople_Purger_2802.jpg' },
  { name: 'Kitap & El Yazması', slug: 'kitap-el-yazmasi', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Codex_Beratinus_0011b.jpg/500px-Codex_Beratinus_0011b.jpg' },
  { name: 'Tesbih', slug: 'tesbih', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Ottoman_Faturan_Prayer_Bead.JPG/500px-Ottoman_Faturan_Prayer_Bead.JPG' },
  { name: 'Nümismatik', slug: 'numismatik', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Aureus%2C_Auguste%2C_Lyon%2C_btv1b104440369.jpg/500px-Aureus%2C_Auguste%2C_Lyon%2C_btv1b104440369.jpg' },
];

async function main() {
  // Muğlak şemsiye kategorileri kaldır (temiz sayfa sonrası hiçbir lot bunlara bağlı değil).
  const removed = await prisma.category.deleteMany({ where: { slug: { in: ['antika', 'koleksiyon'] } } });
  console.log(`Kaldırılan şemsiye kategori: ${removed.count}`);

  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, imageUrl: c.imageUrl, sortOrder: i + 1, isActive: true },
      create: { name: c.name, slug: c.slug, imageUrl: c.imageUrl, sortOrder: i + 1, isActive: true },
    });
    console.log(`  ${String(i + 1).padStart(2)}. ${c.name}`);
  }

  const all = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' }, select: { name: true, slug: true } });
  console.log(`\nToplam kategori: ${all.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
