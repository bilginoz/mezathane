import { prisma } from '@/lib/prisma';

export type PaymentMode = 'ESCROW' | 'DIRECT';

// Aktif ödeme modunu döner (sürüm anahtarı).
// ESCROW = V1 (para platformdan geçer). DIRECT = V2 (para doğrudan satıcıya).
// Ayar okunamazsa GÜVENLİ tarafa düş: ESCROW (mevcut/varsayılan davranış).
//
// ADMIN ÖNİZLEME: Yalnızca ADMIN oturumunda ve `pm_preview` çerezi varsa, canlı flag'i DEĞİŞTİRMEDEN
// o kullanıcıya DIRECT/ESCROW gösterilir. Böylece admin, canlı ziyaretçilere dokunmadan yeni sistemi
// uçtan uca gezip test edebilir. Cron/istek dışı bağlamda çerez/oturum olmadığı için bu blok atlanır
// → check-live gibi gerçek para akışları HER ZAMAN global flag'i kullanır (önizlemeden etkilenmez).
export async function getPaymentMode(): Promise<PaymentMode> {
  try {
    const { cookies } = await import('next/headers');
    const jar = await cookies();
    const preview = jar.get('pm_preview')?.value;
    if (preview === 'DIRECT' || preview === 'ESCROW') {
      const { getServerSession } = await import('next-auth');
      const { authOptions } = await import('@/lib/auth-options');
      const session = await getServerSession(authOptions);
      if ((session?.user as any)?.role === 'ADMIN') return preview;
    }
  } catch {
    // İstek bağlamı yoksa (ör. cron) önizleme atlanır, aşağıdaki global ayar kullanılır.
  }
  try {
    const s = await prisma.platformSettings.findFirst({ select: { paymentMode: true } });
    return s?.paymentMode === 'DIRECT' ? 'DIRECT' : 'ESCROW';
  } catch {
    return 'ESCROW';
  }
}

export async function isDirectPayment(): Promise<boolean> {
  return (await getPaymentMode()) === 'DIRECT';
}
