import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Lot görselleri
const IMAGES = {
  caySeti: 'https://cdn.abacus.ai/images/8a440df4-e88f-4fe3-850c-04dbbeca9763.png',
  samdan: 'https://cdn.abacus.ai/images/fde41804-474e-400b-ace2-93b2c33b83ff.png',
  heykel: 'https://cdn.abacus.ai/images/86f9c031-5727-4f7f-b12e-8192aa58ceef.png',
  kuran: 'https://cdn.abacus.ai/images/990b74f9-a4ca-48ec-a9ed-696c62cfdba5.png',
  kemerTokasi: 'https://cdn.abacus.ai/images/df805403-f544-4a0a-a80c-c38817ec2ac9.png',
  cepSaati: 'https://cdn.abacus.ai/images/b48fd7a1-4b6a-40bd-96e6-6e17fc3705cf.png',
  sedefKutu: 'https://cdn.abacus.ai/images/f3b9a557-0886-4f95-8f3c-318dbdda6453.png',
  hali: 'https://cdn.abacus.ai/images/ec63a9ef-9433-4aad-aa4b-0af8b735effb.png',
  ibrik: 'https://cdn.abacus.ai/images/2ca6ed46-3bf7-499f-9c6b-b30a522dfa7e.png',
  vazo: 'https://cdn.abacus.ai/images/93c9583e-8455-404f-aa09-b52a581e8132.png',
  hatLevha: 'https://cdn.abacus.ai/images/411d5c50-f730-412b-aa2a-61fe5346993c.png',
  porselenTabak: 'https://cdn.abacus.ai/images/a3185bae-cc06-431e-8d26-47c639c9eb8d.png',
  fincanZarfi: 'https://cdn.abacus.ai/images/5d741770-aba8-42a3-9e39-d4043cfd708d.png',
  bronzAyna: 'https://cdn.abacus.ai/images/f9f43bd2-ba2f-4644-9551-e49d85b52f0f.png',
  minyatur: 'https://cdn.abacus.ai/images/cba82b7a-76d8-482a-b2c3-10e5c72666cb.png',
};

async function main() {
  console.log('Test verileri oluşturuluyor...');

  // ========== 1) Test Alıcı ==========
  const buyerPass = await bcrypt.hash('Test2026!', 12);
  const buyer = await prisma.user.upsert({
    where: { email: 'alici@test.mezathane.tr' },
    update: {},
    create: {
      email: 'alici@test.mezathane.tr',
      password: buyerPass,
      fullName: 'Ahmet Yılmaz',
      phone: '+905551234567',
      role: 'BUYER',
      isEmailVerified: true,
      isPhoneVerified: true,
      emailVerified: new Date(),
      hasAcceptedTerms: true,
      hasKvkkConsent: true,
      kvkkConsentDate: new Date(),
      address: 'Bağdat Caddesi No:123',
      city: 'İstanbul',
      district: 'Kadıköy',
      postalCode: '34710',
      shippingAddress: 'Bağdat Caddesi No:123, Kadıköy, İstanbul 34710',
    },
  });
  console.log('Test alıcı oluşturuldu:', buyer.email);

  // ========== 2) Test Satıcı ==========
  const sellerPass = await bcrypt.hash('Test2026!', 12);
  const sellerUser = await prisma.user.upsert({
    where: { email: 'satici@test.mezathane.tr' },
    update: {},
    create: {
      email: 'satici@test.mezathane.tr',
      password: sellerPass,
      fullName: 'Mehmet Kaya',
      phone: '+905559876543',
      role: 'SELLER',
      isEmailVerified: true,
      isPhoneVerified: true,
      emailVerified: new Date(),
      hasAcceptedTerms: true,
      hasKvkkConsent: true,
      kvkkConsentDate: new Date(),
      address: 'İstiklal Caddesi No:45',
      city: 'İstanbul',
      district: 'Beyoğlu',
      postalCode: '34430',
    },
  });
  console.log('Test satıcı kullanıcı oluşturuldu:', sellerUser.email);

  // Satıcı profili
  const sellerProfile = await prisma.sellerProfile.upsert({
    where: { userId: sellerUser.id },
    update: {},
    create: {
      userId: sellerUser.id,
      companyName: 'Kaya Antikacılık',
      companyAddress: 'İstiklal Caddesi No:45, Beyoğlu, İstanbul',
      taxOffice: 'Beyoğlu VD',
      taxNumber: '1234567890',
      description: 'Osmanlı dönemi antika eserler, hat sanatı ve koleksiyon ürünleri konusunda uzman müzayede evi. 20 yıllık tecrübe ile hizmetinizdeyiz.',
      logoUrl: 'https://cdn.abacus.ai/images/86f9c031-5727-4f7f-b12e-8192aa58ceef.png',
      iban: 'TR330006100519786457841326',
      mersisNo: '0123456789012345',
      status: 'APPROVED',
      commissionRate: 15.0,
      isVerified: true,
      averageRating: 4.5,
      reviewCount: 2,
    },
  });
  console.log('Satıcı profili oluşturuldu:', sellerProfile.companyName);

  // Kategorileri al
  const antikaKat = await prisma.category.findUnique({ where: { slug: 'antika' } });
  const koleksiyonKat = await prisma.category.findUnique({ where: { slug: 'koleksiyon' } });

  if (!antikaKat || !koleksiyonKat) {
    console.error('Kategoriler bulunamadı! Önce ana seed çalıştırılmalı.');
    return;
  }

  // ========== 3) Planlanan Müzayede (SCHEDULED — yarın başlayacak) ==========
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(20, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 3);

  // Mevcut müzayede varsa sil ve yeniden oluştur
  const existingScheduled = await prisma.auction.findFirst({
    where: { title: 'Osmanlı Hazineleri — Antika & Koleksiyon Müzayedesi' },
  });
  if (existingScheduled) {
    await prisma.auction.delete({ where: { id: existingScheduled.id } });
    console.log('Mevcut planlanan müzayede silindi, yeniden oluşturulacak.');
  }

  const scheduledAuction = await prisma.auction.create({
    data: {
      title: 'Osmanlı Hazineleri — Antika & Koleksiyon Müzayedesi',
      description: 'Osmanlı İmparatorluğu dönemine ait nadide antika eserler ve koleksiyon parçalarının yer aldığı özel müzayedemize davetlisiniz. Telkari gümüş işçiliğinden hat sanatına, sedef kakma kutulardan antik cep saatlerine kadar zengin bir koleksiyon sizleri bekliyor.',
      bannerUrl: IMAGES.caySeti,
      sellerId: sellerProfile.id,
      status: 'SCHEDULED',
      startDate: tomorrow,
      endDate: tomorrowEnd,
      waitingTime: 20,
      fairWaitingTime: 5,
      commissionRate: 15.0,
      paymentDays: 7,
      isPublic: true,
    },
  });
  console.log('Planlanan müzayede oluşturuldu:', scheduledAuction.title);

  // Lot 1 — Gümüş Çay Seti (3 resim)
  const lot1 = await prisma.lot.create({
    data: {
      lotNumber: 1,
      title: 'Osmanlı Dönemi Gümüş Telkari Çay Seti',
      description: '19. yüzyıl Osmanlı dönemi, 6 parça gümüş telkari çay seti. Demlik, şekerlik, 4 adet çay bardağı ve tabağı. Orijinal ahşap kutusu ile birlikte. Mükemmel işçilik, koleksiyoner kalitesi.',
      auctionId: scheduledAuction.id,
      categoryId: antikaKat.id,
      startingPrice: 15000,
      estimatedPrice: 35000,
      currentPrice: 0,
      status: 'PENDING',
      sortOrder: 1,
      shippingType: 'FREE_SELLER',
    },
  });
  await prisma.lotImage.createMany({
    data: [
      { lotId: lot1.id, imageUrl: IMAGES.caySeti, sortOrder: 0 },
      { lotId: lot1.id, imageUrl: IMAGES.fincanZarfi, sortOrder: 1 },
      { lotId: lot1.id, imageUrl: IMAGES.kemerTokasi, sortOrder: 2 },
    ],
  });

  // Lot 2 — Pirinç Şamdan Çifti (3 resim)
  const lot2 = await prisma.lot.create({
    data: {
      lotNumber: 2,
      title: 'Osmanlı Pirinç Şamdan Çifti — 18. Yüzyıl',
      description: '18. yüzyıl Osmanlı saray dönemi pirinç şamdan çifti. Yükseklik: 42 cm. Kabartma çiçek ve yaprak motifleri. Orijinal patina korunmuş. Nadir bulunan saray eseri.',
      auctionId: scheduledAuction.id,
      categoryId: antikaKat.id,
      startingPrice: 8000,
      estimatedPrice: 18000,
      currentPrice: 0,
      status: 'PENDING',
      sortOrder: 2,
      shippingType: 'BUYER_PAYS',
      estimatedShipping: 150,
    },
  });
  await prisma.lotImage.createMany({
    data: [
      { lotId: lot2.id, imageUrl: IMAGES.samdan, sortOrder: 0 },
      { lotId: lot2.id, imageUrl: IMAGES.ibrik, sortOrder: 1 },
      { lotId: lot2.id, imageUrl: IMAGES.bronzAyna, sortOrder: 2 },
    ],
  });

  // Lot 3 — Sedef Kakmalı Kutu (3 resim)
  const lot3 = await prisma.lot.create({
    data: {
      lotNumber: 3,
      title: 'Osmanlı Sedef Kakmalı Mücevher Kutusu',
      description: '19. yüzyıl sonu Osmanlı dönemi sedef kakmalı takı/mücevher kutusu. Geometrik sedef mozaik deseni, ahşap gövde, iç kısmı kırmızı kadife döşeli. Boyutlar: 25x18x12 cm. Mükemmel korunmuş.',
      auctionId: scheduledAuction.id,
      categoryId: antikaKat.id,
      startingPrice: 5000,
      estimatedPrice: 12000,
      currentPrice: 0,
      status: 'PENDING',
      sortOrder: 3,
      shippingType: 'FREE_SELLER',
    },
  });
  await prisma.lotImage.createMany({
    data: [
      { lotId: lot3.id, imageUrl: IMAGES.sedefKutu, sortOrder: 0 },
      { lotId: lot3.id, imageUrl: IMAGES.minyatur, sortOrder: 1 },
      { lotId: lot3.id, imageUrl: IMAGES.hatLevha, sortOrder: 2 },
    ],
  });

  console.log('Planlanan müzayedeye 3 lot eklendi (her biri 3 resim)');

  // ========== 4) Canlı Müzayede (ACTIVE — şu anda açık) ==========
  const now = new Date();
  const activeStart = new Date(now);
  activeStart.setHours(activeStart.getHours() - 2); // 2 saat önce başlamış

  const activeEnd = new Date(now);
  activeEnd.setDate(activeEnd.getDate() + 2); // 2 gün sonra bitecek

  const existingActive = await prisma.auction.findFirst({
    where: { title: 'Koleksiyon Eserleri — Canlı Online Müzayede' },
  });
  if (existingActive) {
    await prisma.auction.delete({ where: { id: existingActive.id } });
    console.log('Mevcut canlı müzayede silindi, yeniden oluşturulacak.');
  }

  const activeAuction = await prisma.auction.create({
    data: {
      title: 'Koleksiyon Eserleri — Canlı Online Müzayede',
      description: 'Art Deco bronz heykellerden antika cep saatlerine, Art Nouveau vazolardan Anadolu halılarına kadar seçkin koleksiyon eserleri. Hemen teklif verin, kaçırmayın!',
      bannerUrl: IMAGES.heykel,
      sellerId: sellerProfile.id,
      status: 'ACTIVE',
      startDate: activeStart,
      endDate: activeEnd,
      waitingTime: 20,
      fairWaitingTime: 5,
      commissionRate: 15.0,
      paymentDays: 7,
      isPublic: true,
    },
  });
  console.log('Canlı müzayede oluşturuldu:', activeAuction.title);

  // Lot 1 — Art Deco Bronz Heykel (3 resim)
  const aLot1 = await prisma.lot.create({
    data: {
      lotNumber: 1,
      title: 'Art Deco Bronz Dansçı Heykeli — 1920',
      description: 'Art Deco dönemi (circa 1920) bronz kadın dansçı heykeli. Yükseklik: 38 cm. Mermer kaide. Dönemin karakteristik geometrik formları ve zarif dans pozu. İmzalı.',
      auctionId: activeAuction.id,
      categoryId: koleksiyonKat.id,
      startingPrice: 12000,
      estimatedPrice: 28000,
      currentPrice: 14500,
      status: 'ACTIVE',
      sortOrder: 1,
      bidCount: 3,
      shippingType: 'FREE_SELLER',
    },
  });
  await prisma.lotImage.createMany({
    data: [
      { lotId: aLot1.id, imageUrl: IMAGES.heykel, sortOrder: 0 },
      { lotId: aLot1.id, imageUrl: IMAGES.bronzAyna, sortOrder: 1 },
      { lotId: aLot1.id, imageUrl: IMAGES.vazo, sortOrder: 2 },
    ],
  });
  // Teklifler
  await prisma.bid.createMany({
    data: [
      { amount: 12000, userId: buyer.id, lotId: aLot1.id, type: 'MANUAL', isWinning: false, createdAt: new Date(now.getTime() - 3600000) },
      { amount: 13000, userId: buyer.id, lotId: aLot1.id, type: 'MANUAL', isWinning: false, createdAt: new Date(now.getTime() - 2400000) },
      { amount: 14500, userId: buyer.id, lotId: aLot1.id, type: 'MANUAL', isWinning: true, createdAt: new Date(now.getTime() - 1200000) },
    ],
  });

  // Lot 2 — Antika Cep Saati (3 resim)
  const aLot2 = await prisma.lot.create({
    data: {
      lotNumber: 2,
      title: 'Antika Altın Kaplama Cep Saati — 19. Yüzyıl',
      description: '19. yüzyıl sonu Avrupa yapımı altın kaplama cep saati. Romen rakamlı kadran, mekanik hareket, orijinal köstek zinciri ile birlikte. Çalışır durumda. Çap: 48mm.',
      auctionId: activeAuction.id,
      categoryId: koleksiyonKat.id,
      startingPrice: 6000,
      estimatedPrice: 15000,
      currentPrice: 7500,
      status: 'ACTIVE',
      sortOrder: 2,
      bidCount: 2,
      shippingType: 'BUYER_PAYS',
      estimatedShipping: 80,
    },
  });
  await prisma.lotImage.createMany({
    data: [
      { lotId: aLot2.id, imageUrl: IMAGES.cepSaati, sortOrder: 0 },
      { lotId: aLot2.id, imageUrl: IMAGES.kemerTokasi, sortOrder: 1 },
      { lotId: aLot2.id, imageUrl: IMAGES.fincanZarfi, sortOrder: 2 },
    ],
  });
  await prisma.bid.createMany({
    data: [
      { amount: 6000, userId: buyer.id, lotId: aLot2.id, type: 'MANUAL', isWinning: false, createdAt: new Date(now.getTime() - 5400000) },
      { amount: 7500, userId: buyer.id, lotId: aLot2.id, type: 'MANUAL', isWinning: true, createdAt: new Date(now.getTime() - 3600000) },
    ],
  });

  // Lot 3 — Art Nouveau Vazo (3 resim)
  const aLot3 = await prisma.lot.create({
    data: {
      lotNumber: 3,
      title: 'Art Nouveau Emaye Cam Vazo — Circa 1900',
      description: 'Art Nouveau dönemi (circa 1900) emaye cam vazo. Yeşil tonlarında organik bitki ve çiçek motifleri. Yükseklik: 32 cm. Bronz rengi metal detaylar. Mükemmel korunmuş, nadir parça.',
      auctionId: activeAuction.id,
      categoryId: antikaKat.id,
      startingPrice: 9000,
      estimatedPrice: 22000,
      currentPrice: 0,
      status: 'ACTIVE',
      sortOrder: 3,
      bidCount: 0,
      shippingType: 'FREE_SELLER',
    },
  });
  await prisma.lotImage.createMany({
    data: [
      { lotId: aLot3.id, imageUrl: IMAGES.vazo, sortOrder: 0 },
      { lotId: aLot3.id, imageUrl: IMAGES.porselenTabak, sortOrder: 1 },
      { lotId: aLot3.id, imageUrl: IMAGES.hali, sortOrder: 2 },
    ],
  });

  console.log('Canlı müzayedeye 3 lot eklendi (her biri 3 resim, bazılarında teklif var)');

  // ========== Satıcıya review ekle ==========
  const existingReview = await prisma.sellerReview.findFirst({
    where: { userId: buyer.id, sellerId: sellerProfile.id },
  });
  if (!existingReview) {
    await prisma.sellerReview.create({
      data: {
        rating: 5,
        comment: 'Çok güvenilir satıcı, eserler açıklandığı gibi geldi. Paketleme de çok özenli.',
        userId: buyer.id,
        sellerId: sellerProfile.id,
      },
    });
  }

  console.log('\n===== TEST VERİLERİ BAŞARIYLA OLUŞTURULDU =====');
  console.log('\nTest Alıcı:');
  console.log('  E-posta: alici@test.mezathane.tr');
  console.log('  Şifre:   Test2026!');
  console.log('\nTest Satıcı:');
  console.log('  E-posta: satici@test.mezathane.tr');
  console.log('  Şifre:   Test2026!');
  console.log('  Firma:   Kaya Antikacılık');
  console.log('\nMüzayede 1 (Planlanan):');
  console.log('  Osmanlı Hazineleri — Antika & Koleksiyon Müzayedesi');
  console.log('  3 lot, her biri 3 resim');
  console.log('  Durum: SCHEDULED (yarın başlayacak)');
  console.log('\nMüzayede 2 (Canlı):');
  console.log('  Koleksiyon Eserleri — Canlı Online Müzayede');
  console.log('  3 lot, her biri 3 resim, bazılarında teklif mevcut');
  console.log('  Durum: ACTIVE (şu anda açık)');
}

main()
  .catch((e) => {
    console.error('Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
