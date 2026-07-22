import { prisma } from '@/lib/prisma';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { LotDetailContent } from './_components/lot-detail-content';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    const lot = await prisma.lot.findUnique({
      where: { id },
      select: { title: true, description: true, startingPrice: true, images: { take: 1, orderBy: { sortOrder: 'asc' } }, auction: { select: { title: true } } },
    });
    if (!lot) return {};
    const desc = lot.description?.slice(0, 160) || `${lot.title} - ${lot.auction?.title ?? 'Mezathane.tr'}`;
    const img = lot.images?.[0]?.imageUrl;
    return {
      title: lot.title,
      description: desc,
      openGraph: {
        title: lot.title,
        description: desc,
        images: img ? [{ url: img }] : [],
      },
    };
  } catch { return {}; }
}

export default async function LotDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let lot: any = null;
  try {
    lot = await prisma.lot.findUnique({
      where: { id },
      include: {
        auction: {
          include: {
            seller: { select: { id: true, userId: true, companyName: true, logoUrl: true, commissionRate: true, status: true, isVerified: true } },
          },
        },
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        bids: {
          orderBy: { amount: 'desc' },
          take: 15,
          include: { user: { select: { fullName: true } } },
        },
        _count: { select: { bids: true, watchlist: true } },
      },
    });
    if (lot) {
      await prisma.lot.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    }
  } catch (e) {
    console.error('Lot detail error:', e);
  }

  if (!lot || lot.auction?.seller?.status === 'SUSPENDED') return notFound();

  const siteUrl = process.env.NEXTAUTH_URL ?? 'https://www.mezathane.tr';
  const sellerName = lot.auction?.seller?.companyName || 'Mezathane.tr';

  // Kargo bedelini yalnızca gerçekten bildiğimizde belirtiyoruz (uydurma yok):
  // - Satıcı üstleniyorsa ücretsiz (0), - Alıcı ödemeli + tahmini varsa o değer,
  // - Alıcı ödemeli ama tahmin yoksa (karşı ödemeli, tutar değişken) kargo bloğu eklenmez.
  const shippingRateValue =
    lot.shippingType === 'FREE_SELLER'
      ? 0
      : typeof lot.estimatedShipping === 'number'
        ? lot.estimatedShipping
        : null;

  const offer: any = {
    '@type': 'Offer',
    priceCurrency: 'TRY',
    price: lot.currentPrice || lot.startingPrice || 0,
    availability: lot.status === 'SOLD' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    url: `${siteUrl}/lot/${lot.id}`,
    seller: { '@type': 'Organization', name: sellerName },
    // Müzayede satışları 6502 s. Kanun 53/ç ve Mesafeli Sözleşmeler Yön. 15/ç
    // gereği cayma hakkı istisnası kapsamında — iade kabul edilmez (yasal olarak doğru).
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'TR',
      returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
    },
  };

  if (shippingRateValue !== null) {
    offer.shippingDetails = {
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: shippingRateValue, currency: 'TRY' },
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'TR' },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 5, unitCode: 'DAY' },
        transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 7, unitCode: 'DAY' },
      },
    };
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: lot.title,
    description: lot.description?.slice(0, 300) || lot.title,
    image: lot.images?.map((i: any) => i.imageUrl).filter(Boolean),
    brand: { '@type': 'Brand', name: sellerName },
    offers: offer,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <Header />
      <LotDetailContent lot={lot} />
      <Footer />
    </div>
  );
}
