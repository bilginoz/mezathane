import { prisma } from '@/lib/prisma';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { AuctionDetailContent } from './_components/auction-detail-content';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    const auction = await prisma.auction.findUnique({
      where: { id },
      select: { title: true, description: true, bannerUrl: true, seller: { select: { companyName: true } } },
    });
    if (!auction) return {};
    const desc = auction.description?.slice(0, 160) || `${auction.title} - Mezathane.tr müzayedesi`;
    return {
      title: auction.title,
      description: desc,
      openGraph: {
        title: auction.title,
        description: desc,
        images: auction.bannerUrl ? [{ url: auction.bannerUrl }] : [],
      },
    };
  } catch { return {}; }
}

export default async function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let auction: any = null;
  try {
    auction = await prisma.auction.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, companyName: true, logoUrl: true, description: true, commissionRate: true, status: true, isVerified: true } },
        lots: {
          include: {
            category: true,
            lotCategories: { include: { category: true }, orderBy: { createdAt: 'asc' } },
            images: { orderBy: { sortOrder: 'asc' }, take: 1 },
            bids: {
              where: { isWinning: true },
              take: 1,
              include: { user: { select: { fullName: true } } },
            },
            _count: { select: { bids: true, watchlist: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { lots: true } },
      },
    });
    if (auction) {
      await prisma.auction.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    }
  } catch (e) {
    console.error('Auction detail error:', e);
  }

  if (!auction || auction.seller?.status === 'SUSPENDED') return notFound();

  const auctionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: auction.title,
    description: auction.description?.slice(0, 300) || auction.title,
    image: auction.bannerUrl || undefined,
    startDate: auction.startDate,
    endDate: auction.endDate,
    eventStatus: auction.status === 'CANCELLED' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    organizer: { '@type': 'Organization', name: auction.seller?.companyName || 'Mezathane.tr' },
    location: { '@type': 'VirtualLocation', url: `${process.env.NEXTAUTH_URL ?? 'https://mezathane.tr'}/muzayede/${auction.id}` },
  };

  // Kazanan isimlerini maskele (A... Y... formatı) ve lot'a ekle
  if (auction.status === 'COMPLETED') {
    auction.lots = auction.lots.map((lot: any) => {
      const winnerBid = lot.bids?.[0];
      if (winnerBid?.user?.fullName && lot.status === 'SOLD') {
        const parts = winnerBid.user.fullName.split(' ');
        const masked = parts.map((p: string) => p[0] + '...').join(' ');
        lot.winnerName = masked;
      }
      return lot;
    });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(auctionJsonLd) }} />
      <Header />
      <AuctionDetailContent auction={auction} />
      <Footer />
    </div>
  );
}
