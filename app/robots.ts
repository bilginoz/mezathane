import { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = headersList.get('x-forwarded-host') || process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, '') || 'mezathane.tr';
  const siteUrl = `https://${host}`;

  // Site gerçek verilerle canlıya alınana kadar hiç taranmasın.
  // Hazır olunca Vercel'de NEXT_PUBLIC_ALLOW_INDEXING=true eklenip yeniden deploy edilmeli.
  if (process.env.NEXT_PUBLIC_ALLOW_INDEXING !== 'true') {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/panel/', '/satici/', '/giris', '/kayit', '/sifre-sifirla'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
