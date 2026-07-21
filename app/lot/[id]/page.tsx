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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: lot.title,
    description: lot.description?.slice(0, 300) || lot.title,
    image: lot.images?.map((i: any) => i.imageUrl).filter(Boolean),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'TRY',
      price: lot.currentPrice || lot.startingPrice || 0,
      availability: lot.status === 'SOLD' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
    },
    brand: { '@type': 'Organization', name: lot.auction?.seller?.companyName || 'Mezathane.tr' },
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <LotDetailContent lot={lot} />
      <Footer />
    </div>
  );
}
