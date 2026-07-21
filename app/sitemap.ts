import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') || process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, '') || 'mezathane.tr';
  const siteUrl = `https://${host}`;

  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/muzayedeler`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/takvim`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${siteUrl}/yardim`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
  ];

  let auctionPages: MetadataRoute.Sitemap = [];
  let lotPages: MetadataRoute.Sitemap = [];
  let sellerPages: MetadataRoute.Sitemap = [];
  let categoryPages: MetadataRoute.Sitemap = [];

  try {
    const auctions = await prisma.auction.findMany({
      where: { isPublic: true },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    });
    auctionPages = auctions.map((a) => ({
      url: `${siteUrl}/muzayede/${a.id}`,
      lastModified: a.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));
  } catch (e) {
    console.error('Sitemap auctions error:', e);
  }

  try {
    const lots = await prisma.lot.findMany({
      where: { auction: { isPublic: true } },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
    });
    lotPages = lots.map((l) => ({
      url: `${siteUrl}/lot/${l.id}`,
      lastModified: l.updatedAt,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));
  } catch (e) {
    console.error('Sitemap lots error:', e);
  }

  try {
    const sellers = await prisma.sellerProfile.findMany({
      where: { status: 'APPROVED' },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    sellerPages = sellers.map((s) => ({
      url: `${siteUrl}/muzayede-evi/${s.id}`,
      lastModified: s.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (e) {
    console.error('Sitemap sellers error:', e);
  }

  try {
    const categories = await prisma.category.findMany({
      select: { slug: true, createdAt: true },
    });
    categoryPages = categories.map((c) => ({
      url: `${siteUrl}/muzayedeler?kategori=${c.slug}`,
      lastModified: c.createdAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (e) {
    console.error('Sitemap categories error:', e);
  }

  // Blog yazıları
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const blogPosts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
    });
    blogPages = blogPosts.map((p: any) => ({
      url: `${siteUrl}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (e) {
    console.error('Sitemap blog error:', e);
  }

  return [...staticPages, ...auctionPages, ...lotPages, ...sellerPages, ...categoryPages, ...blogPages];
}
