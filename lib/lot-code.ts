import { prisma } from '@/lib/prisma';

// Global tekil lot kodu: "MZT" + 2 haneli yıl + 6 haneli GLOBAL sıra (yılda 1'den başlar).
// Örn. 2026'nın 42. lotu → MZT26000042. Hem katalog kimliği hem ödeme referansı olarak kullanılır.
// Sıra platform geneli (tüm satıcılar ortak); yıl değişince kendiliğinden 1'e döner (prefix değişir).

const SEQ_PAD = 6;

export function lotCodePrefix(date = new Date()): string {
  const yy = String(date.getFullYear() % 100).padStart(2, '0');
  return `MZT${yy}`;
}

export function formatLotCode(prefix: string, seq: number): string {
  return `${prefix}${String(seq).padStart(SEQ_PAD, '0')}`;
}

// O yılın (prefix'in) en yüksek sıra numarasını döner. Kodlar sabit genişlikte olduğundan
// sözlük sırası = sayısal sıra → orderBy desc ile en büyük seq bulunur.
async function lastSeqForPrefix(client: any, prefix: string): Promise<number> {
  const last = await client.lot.findFirst({
    where: { lotCode: { startsWith: prefix } },
    orderBy: { lotCode: 'desc' },
    select: { lotCode: true },
  });
  if (!last?.lotCode) return 0;
  const n = parseInt(last.lotCode.slice(prefix.length), 10);
  return Number.isFinite(n) ? n : 0;
}

// Sıradaki tek kod (tekil değilse çağıran retry yapmalı — @unique kısıtı çakışmayı yakalar).
export async function nextLotCode(client: any = prisma): Promise<string> {
  const prefix = lotCodePrefix();
  return formatLotCode(prefix, (await lastSeqForPrefix(client, prefix)) + 1);
}

// Toplu yükleme için: ardışık `count` adet kod (tek sorguyla base bulup base+1..base+count).
export async function nextLotCodes(count: number, client: any = prisma): Promise<string[]> {
  const prefix = lotCodePrefix();
  const base = await lastSeqForPrefix(client, prefix);
  return Array.from({ length: count }, (_, i) => formatLotCode(prefix, base + 1 + i));
}

// Kodsuz (eski) lotlar için gösterim/ödeme yedeği — kod yoksa lot no'ya düşülür.
export function lotCodeOrFallback(lotCode: string | null | undefined, lotNumber: number | null | undefined): string {
  return lotCode || (lotNumber != null ? `Lot ${lotNumber}` : '—');
}
