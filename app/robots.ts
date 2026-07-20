import { MetadataRoute } from 'next';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  const headersList = headers();
  const host = headersList.get('x-forwarded-host') || process.env.NEXTAUTH_URL?.replace(/^https?:\/\//, '') || 'mezathane.tr';
  const siteUrl = `https://${host}`;

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
