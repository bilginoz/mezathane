import { prisma } from '@/lib/prisma';

export type DirectRevenueModel = 'KONTOR' | 'HIZMET_BEDELI';

// DIRECT (V2) içindeki gelir modeli anahtarı (AŞAMA 3). KONTOR = mevcut/varsayılan davranış
// (satıcı önden Müzayede Hakkı satın alır). HİZMET_BEDELİ henüz kodlanmadı (3b-3e) — bu flag
// HİZMET_BEDELİ'ye çevrilse bile şu an davranışta hiçbir değişiklik olmaz.
// Ayar okunamazsa GÜVENLİ tarafa düş: KONTOR (mevcut/varsayılan davranış).
export async function getDirectRevenueModel(): Promise<DirectRevenueModel> {
  try {
    const s = await prisma.platformSettings.findFirst({ select: { directRevenueModel: true } });
    return s?.directRevenueModel === 'HIZMET_BEDELI' ? 'HIZMET_BEDELI' : 'KONTOR';
  } catch {
    return 'KONTOR';
  }
}

export async function isServiceFeeModel(): Promise<boolean> {
  return (await getDirectRevenueModel()) === 'HIZMET_BEDELI';
}
