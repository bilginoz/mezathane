import { DM_Sans, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { AnnouncementBanner } from '@/components/announcement-banner';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { NotificationPrompt } from '@/components/notification-prompt';
import { BottomNav } from '@/components/bottom-nav';
import { GoogleAnalytics } from '@next/third-parties/google';
import { GoogleAnalyticsTracker } from '@/components/google-analytics';

export const dynamic = 'force-dynamic';

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const jakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover' as const,
};
export const metadata = {
  title: {
    default: 'Mezathane.tr - Türkiye\'nin Premium Açık Artırma Platformu',
    template: '%s | Mezathane.tr',
  },
  description: 'Antika, tesbih ve koleksiyon ürünlerinin açık artırma ile satışı. Güvenli ve şeffaf müzayede deneyimi. Türkiye\'nin en güvenilir online müzayede platformu.',
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  keywords: ['müzayede', 'açık artırma', 'antika', 'tesbih', 'koleksiyon', 'online müzayede', 'mezat', 'mezathane'],
  authors: [{ name: 'Mezathane.tr' }],
  creator: 'Mezathane.tr',
  publisher: 'Mezathane.tr',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: 'Mezathane.tr',
    title: 'Mezathane.tr - Premium Açık Artırma Platformu',
    description: 'Antika, tesbih ve koleksiyon ürünlerinin açık artırma ile satışı. Türkiye\'nin en güvenilir online müzayede platformu.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Mezathane.tr' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mezathane.tr - Premium Açık Artırma Platformu',
    description: 'Antika, tesbih ve koleksiyon ürünlerinin açık artırma ile satışı',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: '/',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#d4af37" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js" defer />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Mezathane.tr',
              url: process.env.NEXTAUTH_URL ?? 'https://mezathane.tr',
              logo: `${process.env.NEXTAUTH_URL ?? 'https://mezathane.tr'}/images/logo.png`,
            }),
          }}
        />
      </head>
      <body
        className={`${dmSans.variable} ${jakartaSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>
          <GoogleAnalyticsTracker />
          <AnnouncementBanner />
          <div className="pb-16 md:pb-0">
            {children}
          </div>
          <NotificationPrompt />
          <WhatsAppButton />
          <BottomNav />
        </Providers>
      </body>
      {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID !== 'G-PLACEHOLDER' && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
      )}
    </html>
  );
}