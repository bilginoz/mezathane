import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // NOT: Eskiden burada varsayılan şifreli (johndoe123) bir john@doe.com admin
  // hesabı oluşturuluyordu. Güvenlik açığı olduğu için 2026-07-27'de kaldırıldı.
  // Gerçek admin: bilginoz@gmail.com. Yeni admin gerekiyorsa güçlü şifreyle eklenmeli.

  // Admin user - Bilgin ÖZ
  const bilginPass = await bcrypt.hash('Mzt@2026!BgOz', 12);
  await prisma.user.upsert({
    where: { email: 'bilginoz@gmail.com' },
    update: { role: 'ADMIN', fullName: 'Bilgin ÖZ' },
    create: {
      email: 'bilginoz@gmail.com',
      password: bilginPass,
      fullName: 'Bilgin ÖZ',
      role: 'ADMIN',
    },
  });
  console.log('Admin created');

  // Categories — taksonomi rakip analizi sonrası güncellendi (bkz. scripts/seed-categories.ts,
  // rakip_kategori_analizi.md). "Antika"/"Koleksiyon" şemsiyeleri kaldırıldı; görseller
  // Wikimedia Commons. NOT: seed.ts silme yapamaz (safe-seed engeli); eski "antika/koleksiyon"
  // kayıtlarını temizlemek için scripts/seed-categories.ts kullanılır.
  const categoriesData = [
    { name: 'Resim', slug: 'resim', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/500px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg', sortOrder: 1 },
    { name: 'Halı & Kilim', slug: 'hali-kilim', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Antalya_museum_Anatolian_%E2%80%98slit-kilim%E2%80%99_Mid-20th_century_4847.jpg/500px-Antalya_museum_Anatolian_%E2%80%98slit-kilim%E2%80%99_Mid-20th_century_4847.jpg', sortOrder: 2 },
    { name: 'Gümüş', slug: 'gumus', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Japansk_silvertekanna_med_dito_sil.jpg/500px-Japansk_silvertekanna_med_dito_sil.jpg', sortOrder: 3 },
    { name: 'Mücevher', slug: 'mucevher', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Byzantine_-_Necklace_-_Walters_57544_-_View_A.jpg/500px-Byzantine_-_Necklace_-_Walters_57544_-_View_A.jpg', sortOrder: 4 },
    { name: 'Saat', slug: 'saat', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Pocket_watch_of_William_S._Haynes.jpg/500px-Pocket_watch_of_William_S._Haynes.jpg', sortOrder: 5 },
    { name: 'Porselen & Seramik', slug: 'porselen-seramik', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Iznik_mosque_lamp_dated_1549.jpg/500px-Iznik_mosque_lamp_dated_1549.jpg', sortOrder: 6 },
    { name: 'Hat & Tezhip', slug: 'hat-tezhip', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Hilye-i_Saadet_by_Mustafa_Rakim.jpg/500px-Hilye-i_Saadet_by_Mustafa_Rakim.jpg', sortOrder: 7 },
    { name: 'Efemera', slug: 'efemera', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Constantinople_Purger_2802.jpg/500px-Constantinople_Purger_2802.jpg', sortOrder: 8 },
    { name: 'Kitap & El Yazması', slug: 'kitap-el-yazmasi', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Codex_Beratinus_0011b.jpg/500px-Codex_Beratinus_0011b.jpg', sortOrder: 9 },
    { name: 'Tesbih', slug: 'tesbih', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Ottoman_Faturan_Prayer_Bead.JPG/500px-Ottoman_Faturan_Prayer_Bead.JPG', sortOrder: 10 },
    { name: 'Nümismatik', slug: 'numismatik', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Aureus%2C_Auguste%2C_Lyon%2C_btv1b104440369.jpg/500px-Aureus%2C_Auguste%2C_Lyon%2C_btv1b104440369.jpg', sortOrder: 11 },
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, imageUrl: cat.imageUrl, sortOrder: cat.sortOrder },
      create: cat,
    });
  }
  console.log('Categories created:', categoriesData.length);

  // Platform settings
  const existingSettings = await prisma.platformSettings.findFirst();
  if (!existingSettings) {
    await prisma.platformSettings.create({
      data: {
        platformName: 'Mezathane.tr',
        platformEmail: 'info@mezathane.tr',
        platformPhone: '+90 212 555 0000',
        defaultCommission: 15.0,
        defaultWaitTime: 10,
        defaultFairWait: 10,
        defaultPaymentDays: 5,
      },
    });
  }

  // Site settings
  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default' },
    update: {},
  });
  console.log('Settings created');

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
