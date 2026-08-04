// Rate limiter for API routes.
// - checkRateLimit: bellek-içi (senkron). Serverless'te örnekler arası paylaşılmaz → tek örnek içi burst
//   yakalar ama dağıtık saldırıyı tam engellemez. checkRateLimitDB'nin YEDEĞİ olarak kullanılır.
// - checkRateLimitDB: kalıcı (Postgres). Örnekler arası ortak sayaç → gerçek brute-force koruması.
//   DB hatasında bellek-içine düşer (FAIL-OPEN: login/teklif asla kilitlenmez).

import { prisma } from '@/lib/prisma';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given key (usually IP + route)
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + options.windowSeconds * 1000,
    });
    return { allowed: true, remaining: options.maxRequests - 1, resetAt: now + options.windowSeconds * 1000 };
  }

  if (entry.count >= options.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: options.maxRequests - entry.count, resetAt: entry.resetAt };
}

/**
 * Kalıcı (DB) rate limit — serverless örnekleri arası ortak sayaç. DB hatasında bellek-içine düşer.
 */
export async function checkRateLimitDB(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const now = new Date();
  try {
    const resetAt = new Date(now.getTime() + options.windowSeconds * 1000);
    const existing = await prisma.rateLimit.findUnique({ where: { key } });

    if (!existing || now > existing.resetAt) {
      // Yeni pencere (yoksa oluştur, süresi geçmişse sıfırla)
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return { allowed: true, remaining: options.maxRequests - 1, resetAt: resetAt.getTime() };
    }

    if (existing.count >= options.maxRequests) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt.getTime() };
    }

    const updated = await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
    return { allowed: true, remaining: Math.max(0, options.maxRequests - updated.count), resetAt: existing.resetAt.getTime() };
  } catch (e) {
    // FAIL-OPEN: DB erişilemezse kullanıcıyı kilitleme, bellek-içi yedeğe düş.
    console.error('checkRateLimitDB error, falling back to in-memory:', e);
    return checkRateLimit(key, options);
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1';
}

/**
 * Rate limit presets for common use cases
 */
export const RATE_LIMITS = {
  /** Login: 5 attempts per 15 minutes */
  LOGIN: { maxRequests: 5, windowSeconds: 15 * 60 },
  /** Forgot password: 3 attempts per 15 minutes */
  FORGOT_PASSWORD: { maxRequests: 3, windowSeconds: 15 * 60 },
  /** Password reset: 5 attempts per 15 minutes */
  RESET_PASSWORD: { maxRequests: 5, windowSeconds: 15 * 60 },
  /** Registration: 3 per 15 minutes */
  REGISTER: { maxRequests: 3, windowSeconds: 15 * 60 },
  /** Bidding: 30 per minute */
  BID: { maxRequests: 30, windowSeconds: 60 },
  /** Contact form: 3 per 15 minutes */
  CONTACT: { maxRequests: 3, windowSeconds: 15 * 60 },
  /** General API: 60 per minute */
  API_GENERAL: { maxRequests: 60, windowSeconds: 60 },
} as const;
