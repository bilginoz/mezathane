'use client';

import { LotCard } from '@/components/lot-card';

// Lot detayının altında "Benzer Lotlar" bölümü. Sunucuda (page.tsx) hesaplanan
// ilgili lotları mevcut LotCard bileşeniyle gösterir. Liste boşsa hiç render etmez.
export function RelatedLots({ lots }: { lots: any[] }) {
  if (!lots || lots.length === 0) return null;
  return (
    <section className="mx-auto max-w-[1400px] w-full px-4 pb-12">
      <h2 className="font-display text-xl md:text-2xl font-bold mb-1">Benzer Lotlar</h2>
      <p className="text-sm text-muted-foreground mb-4">Bu esere benzeyebilecek, teklif verebileceğiniz diğer lotlar</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {lots.map((l, i) => (
          <LotCard key={l.id} lot={l} index={i} />
        ))}
      </div>
    </section>
  );
}
