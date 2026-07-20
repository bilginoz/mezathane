import { prisma } from '@/lib/prisma';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { HomeContent } from '@/components/home-content';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let auctions: any[] = [];
  let completedAuctions: any[] = [];
  let categories: any[] = [];
  let featuredLots: any[] = [];
  let stats = { users: 0, auctions: 0, soldLots: 0 };
  let siteSettings: any = null;

  try {
    const [userCount, auctionCount, soldLotCount] = await Promise.all([
      prisma.user.count(),
      prisma.auction.count({ where: { isPublic: true } }),
      prisma.lot.count({ where: { status: 'SOLD' } }),
    ]);
    stats = { users: userCount, auctions: auctionCount, soldLots: soldLotCount };
  } catch (e) {
    console.error('Stats error:', e);
  }

  try {
    siteSettings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  } catch (e) {
    console.error('SiteSettings error:', e);
  }

  try {
    [auctions, completedAuctions, categories, featuredLots] = await Promise.all([
      prisma.auction.findMany({
        where: { status: { in: ['SCHEDULED', 'ACTIVE', 'LIVE'] }, isPublic: true, seller: { status: 'APPROVED' } },
        include: {
          seller: { select: { companyName: true, logoUrl: true, isVerified: true } },
          lots: { take: 4, orderBy: { sortOrder: 'asc' }, select: { images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { imageUrl: true } } } },
          _count: { select: { lots: true } },
        },
        orderBy: { startDate: 'asc' },
        take: 12,
      }),
      prisma.auction.findMany({
        where: { status: 'COMPLETED', isPublic: true, seller: { status: 'APPROVED' } },
        include: {
          seller: { select: { companyName: true, logoUrl: true, isVerified: true } },
          lots: { take: 4, orderBy: { sortOrder: 'asc' }, select: { images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { imageUrl: true } } } },
          _count: { select: { lots: true } },
        },
        orderBy: { endDate: 'desc' },
        take: 6,
      }),
      prisma.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.lot.findMany({
        where: { status: { in: ['ACTIVE', 'PENDING'] }, auction: { status: { in: ['SCHEDULED', 'ACTIVE', 'LIVE'] }, seller: { status: 'APPROVED' } } },
        include: {
          images: { take: 1, orderBy: { sortOrder: 'asc' } },
          category: true,
          lotCategories: { include: { category: true }, orderBy: { createdAt: 'asc' } },
          auction: { select: { title: true, status: true, startDate: true, endDate: true, sellerId: true } },
          _count: { select: { bids: true, watchlist: true } },
        },
        orderBy: { bidCount: 'desc' },
        take: 8,
      }),
    ]);
  } catch (e) {
    console.error('Home page data error:', e);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <HomeContent auctions={auctions ?? []} completedAuctions={completedAuctions ?? []} categories={categories ?? []} featuredLots={featuredLots ?? []} stats={stats} siteSettings={siteSettings} />
      <Footer />
    </div>
  );
}
