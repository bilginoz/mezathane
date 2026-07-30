import { prisma } from '@/lib/prisma';

export type PaymentMode = 'ESCROW' | 'DIRECT';

// Aktif ödeme modunu döner (sürüm anahtarı).
// ESCROW = V1 (para platformdan geçer). DIRECT = V2 (para doğrudan satıcıya).
// Ayar okunamazsa GÜVENLİ tarafa düş: ESCROW (mevcut/varsayılan davranış).
export async function getPaymentMode(): Promise<PaymentMode> {
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
