import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// E-posta doğrulama zorunlu olmayan sayfalar
const PUBLIC_PATHS = [
  '/', '/giris', '/kayit', '/dogrulama', '/sifremi-unuttum', '/sifre-sifirla',
  '/hakkimizda', '/iletisim', '/yardim', '/yasal', '/muzayedeler', '/muzayede',
  '/lot', '/takvim', '/sayfa', '/satici-basvuru',
];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/api/')) return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/images/')) return true;
  if (pathname === '/favicon.ico' || pathname === '/robots.txt' || pathname === '/sitemap.xml') return true;
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // E-posta doğrulama kontrolü — korumalı sayfalarda
  if (!isPublicPath(pathname)) {
    try {
      const token = await getToken({ req: request });
      if (token && token.isEmailVerified === false) {
        const verifyUrl = new URL('/dogrulama', request.url);
        return NextResponse.redirect(verifyUrl);
      }
    } catch {
      // Token okunamazsa devam et — NextAuth kendi korumasını yapar
    }
  }

  // --- Güvenlik Başlıkları ---

  // MIME type sniffing koruması
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // Not: X-XSS-Protection kaldırıldı — modern tarayıcılarda etkisiz/zararlı, CSP zaten koruyor

  // Clickjacking koruması (iframe'lerde preview için sameorigin kullanılır)
  // NOT: X-Frame-Options kaldırıldı çünkü site iframe içinde preview ediliyor

  // HTTPS zorunlu (HSTS) - 1 yıl, alt alan adları dahil
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Referrer sızıntısını önle
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // İzin politikası: gereksiz tarayıcı özelliklerini kapat
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // Content-Security-Policy
  // Esnek ama güvenli: inline script/style'a izin ver (Next.js gereksinimi), dış kaynakları sınırla
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apps.abacus.ai https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://apps.abacus.ai https://www.google-analytics.com https://*.amazonaws.com",
    "frame-src 'self' https://apps.abacus.ai",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self' https://*.abacusai.app https://apps.abacus.ai",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);

  // X-Powered-By bilgi sızıntısını önle
  response.headers.delete('X-Powered-By');

  // Cache-Control: API yanıtlarını önbelleğe alma
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
  }

  return response;
}

export const config = {
  matcher: [
    // Statik dosyalar ve _next hariç tüm yollara uygula
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
