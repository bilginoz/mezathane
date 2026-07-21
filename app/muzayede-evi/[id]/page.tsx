import { prisma } from '@/lib/prisma';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { SellerProfileContent } from './_components/seller-profile-content';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SellerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let seller: any = null;
  let stats: any = null;

  try {
    seller = await prisma.sellerProfile.findUnique({
      where: { id, status: 'APPROVED' },
      select: {
        id: true,
        companyName: true,
        companyAddress: true,
        description: true,
        logoUrl: true,
        commissionRate: true,
        isVerified: true,
        createdAt: true,
        auctions: {
          where: { isPublic: true, status: { in: ['SCHEDULED', 'ACTIVE', 'LIVE', 'COMPLETED'] } },
          include: {
            _count: { select: { lots: true } },
            lots: {
              take: 4,
              orderBy: { sortOrder: 'asc' as const },
              select: { images: { take: 1, select: { imageUrl: true } } },
            },
          },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    if (seller) {
      const [totalLots, totalBids, soldLots] = await Promise.all([
        prisma.lot.count({ where: { auction: { sellerId: seller.id, isPublic: true } } }),
        prisma.bid.count({ where: { lot: { auction: { sellerId: seller.id } } } }),
        prisma.lot.count({ where: { auction: { sellerId: seller.id }, status: 'SOLD' } }),
      ]);
      stats = {
        totalAuctions: seller.auctions?.length ?? 0,
        totalLots,
        totalBids,
        soldLots,
      };
    }
  } catch (e) {
    console.error('Seller profile error:', e);
  }

  if (!seller) return notFound();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <SellerProfileContent seller={seller} stats={stats} />
      <Footer />
    </div>
  );
}
