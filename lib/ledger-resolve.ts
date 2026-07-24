import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { buildBuyerLedger, buildSellerLedger, buildPlatformLedger, applyPeriod, type LedgerResult } from '@/lib/ledger';

export type ResolveOutcome = { ok: true; data: LedgerResult } | { ok: false; status: number; error: string };

// scope: 'admin' | 'self' ; type: 'buyer' | 'seller' | 'platform'
export async function resolveLedger(
  scope: string | null,
  type: string | null,
  id: string | null,
  period?: { from?: string | null; to?: string | null }
): Promise<ResolveOutcome> {
  const withPeriod = (r: LedgerResult) => applyPeriod(r, period?.from, period?.to);
  const session = await getServerSession(authOptions);
  if (!session?.user) return { ok: false, status: 401, error: 'Yetkisiz' };
  const role = (session.user as any).role;
  const uid = (session.user as any).id;

  if (scope === 'admin') {
    if (role !== 'ADMIN') return { ok: false, status: 403, error: 'Yetkisiz' };
    if (type === 'platform') return { ok: true, data: withPeriod(await buildPlatformLedger()) };
    if (!id) return { ok: false, status: 400, error: 'id gerekli' };
    if (type === 'buyer') {
      const r = await buildBuyerLedger(id);
      return r ? { ok: true, data: withPeriod(r) } : { ok: false, status: 404, error: 'Bulunamadı' };
    }
    if (type === 'seller') {
      const r = await buildSellerLedger(id);
      return r ? { ok: true, data: withPeriod(r) } : { ok: false, status: 404, error: 'Bulunamadı' };
    }
    return { ok: false, status: 400, error: 'Geçersiz tip' };
  }

  // self
  if (type === 'buyer') {
    const r = await buildBuyerLedger(uid);
    return r ? { ok: true, data: withPeriod(r) } : { ok: false, status: 404, error: 'Bulunamadı' };
  }
  if (type === 'seller') {
    const profile = await prisma.sellerProfile.findUnique({ where: { userId: uid }, select: { id: true } });
    if (!profile) return { ok: false, status: 404, error: 'Satıcı profili yok' };
    const r = await buildSellerLedger(profile.id);
    return r ? { ok: true, data: withPeriod(r) } : { ok: false, status: 404, error: 'Bulunamadı' };
  }
  return { ok: false, status: 400, error: 'Geçersiz tip' };
}
