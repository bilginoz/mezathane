import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Test account (internal)
  const testPass = await bcrypt.hash('johndoe123', 12);
  await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: { role: 'ADMIN', password: testPass },
    create: {
      email: 'john@doe.com',
      password: testPass,
      fullName: 'Platform Admin',
      role: 'ADMIN',
    },
  });

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

  // Categories
  const categoriesData = [
    { name: 'Antika', slug: 'antika', imageUrl: 'https://cdn.abacus.ai/images/a03523e7-5461-4450-b73e-62a3715561a1.png', sortOrder: 1 },
    { name: 'Tesbih', slug: 'tesbih', imageUrl: 'https://i.etsystatic.com/18812058/r/il/859531/6897798128/il_fullxfull.6897798128_ao7v.jpg', sortOrder: 2 },
    { name: 'Koleksiyon', slug: 'koleksiyon', imageUrl: 'https://nessbros.s3.amazonaws.com/2024/09/16162241/288.jpg', sortOrder: 3 },
    { name: 'Mücevher', slug: 'mucevher', imageUrl: 'https://assets.cdn.filesafe.space/IKsTHgDQrxdlZ6pzpBr0/media/69b03bfcddc8c73cb1e98143.png', sortOrder: 4 },
    { name: 'Resim', slug: 'resim', imageUrl: 'https://serlachius.fi/wp-content/uploads/kartanon-klassikot-5.jpg', sortOrder: 5 },
    { name: 'Nümismatik', slug: 'numismatik', imageUrl: 'https://cdn.shopify.com/s/files/1/0714/1792/1822/files/numismatic-coin-collection.png', sortOrder: 6 },
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { imageUrl: cat.imageUrl },
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
