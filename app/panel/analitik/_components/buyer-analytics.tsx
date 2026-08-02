'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Trophy, Target, TrendingDown, ShieldCheck, Heart, Clock, Gavel,
} from 'lucide-react';
import { formatPrice, formatDateTime } from '@/lib/utils';

export function BuyerAnalytics() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated') {
      fetch('/api/buyer/analytics')
        .then(r => r.json())
        .then(d => { if (!d?.error) setData(d); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === 'loading' || loading) {
    return (
      <main className="flex-1 py-8"><div className="mx-auto max-w-[1000px] px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}</div>
          <div className="h-48 bg-muted rounded-xl" />
        </div>
      </div></main>
    );
  }

  const trust = data?.trust ?? {};
  const bidStats = data?.bidStats ?? {};
  const wonDeals = data?.wonDeals ?? { list: [], avgDiffPct: null };
  const forgottenFavorites = data?.forgottenFavorites ?? [];

  const statCards = [
    { icon: Gavel, label: 'Katıldığınız Lot', value: (bidStats.wonCount ?? 0) + (bidStats.lostCount ?? 0), color: 'text-[#d4af37]' },
    { icon: Trophy, label: 'Kazanma Oranı', value: `%${bidStats.winRatePct ?? 0}`, color: 'text-green-400' },
    { icon: Target, label: 'Kazandığınız Lot', value: bidStats.wonCount ?? 0, color: 'text-emerald-400' },
    { icon: ShieldCheck, label: 'Güven Durumu', value: trust.trusted ? 'Güvenilir' : 'Yeni Üye', color: trust.trusted ? 'text-cyan-400' : 'text-amber-400' },
  ];

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1000px] px-4">
        <Link href="/panel" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Panelime Dön
        </Link>

        <h1 className="font-display text-2xl font-bold mb-6">Analitiğim</h1>

        {/* Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-4">
              <s.icon className={`h-5 w-5 mb-2 ${s.color}`} />
              <p className="text-lg sm:text-xl font-bold font-mono">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Güven puanı detay */}
        <div className="rounded-xl border border-border bg-card p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className={`h-5 w-5 ${trust.trusted ? 'text-cyan-400' : 'text-amber-400'}`} />
            <h2 className="font-display font-semibold">Güven Puanınız</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {trust.trusted
              ? `En az bir ödemenizi zamanında tamamladığınız için "Güvenilir Üye" statüsündesiniz. Ödenmemiş sipariş limitiniz: ${trust.countLimit} adet / ${formatPrice(trust.tlLimit ?? 0)}.`
              : `Henüz hiç ödeme tamamlamadığınız için "Yeni Üye" statüsündesiniz. Ödenmemiş sipariş limitiniz: ${trust.countLimit} adet / ${formatPrice(trust.tlLimit ?? 0)}. İlk ödemenizi tamamladığınızda limitiniz otomatik yükselir.`}
          </p>
          {(trust.outstandingCount ?? 0) > 0 && (
            <p className="text-xs text-amber-400">
              Şu an {trust.outstandingCount} ödenmemiş siparişiniz var (toplam {formatPrice(trust.outstandingAmount ?? 0)}). Limitinize yaklaştıysanız yeni teklif veremeyebilirsiniz.
            </p>
          )}
        </div>

        {/* İyi alışveriş göstergesi */}
        <div className="rounded-xl border border-border bg-card mb-8">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-display font-semibold">Kazandığınız Lotlar — Tahmini Değere Göre</h2>
            {wonDeals.avgDiffPct != null && (
              <span className={`text-xs font-mono font-bold ${wonDeals.avgDiffPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                Ortalama {wonDeals.avgDiffPct >= 0 ? `%${wonDeals.avgDiffPct} altında` : `%${Math.abs(wonDeals.avgDiffPct)} üstünde`} aldınız
              </span>
            )}
          </div>
          {wonDeals.list.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Tahmini değeri girilmiş, kazandığınız bir lot bulunmuyor.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-3 font-medium">Lot</th>
                    <th className="p-3 font-medium">Kazandığınız Fiyat</th>
                    <th className="p-3 font-medium">Tahmini Değer</th>
                    <th className="p-3 font-medium">Fark</th>
                  </tr>
                </thead>
                <tbody>
                  {wonDeals.list.map((d: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="p-3">#{d.lotNumber} {d.title}</td>
                      <td className="p-3 font-mono">{formatPrice(d.soldPrice)}</td>
                      <td className="p-3 font-mono text-muted-foreground">{formatPrice(d.estimatedPrice)}</td>
                      <td className={`p-3 font-mono font-semibold ${d.diffPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {d.diffPct >= 0 ? `%${d.diffPct} altında` : `%${Math.abs(d.diffPct)} üstünde`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Kaçırdığınız lotlar */}
        <div className="rounded-xl border border-border bg-card mb-8">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-400" />
            <h2 className="font-display font-semibold">En Yakın Kaçırdıklarınız</h2>
          </div>
          {bidStats.closeLosses?.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Kaçırdığınız bir lot bulunmuyor — ya hiç kaybetmediniz ya da henüz sonuçlanmış teklifiniz yok.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="p-3 font-medium">Lot</th>
                    <th className="p-3 font-medium">Sizin En Yüksek Teklifiniz</th>
                    <th className="p-3 font-medium">Satış Fiyatı</th>
                    <th className="p-3 font-medium">Fark</th>
                  </tr>
                </thead>
                <tbody>
                  {(bidStats.closeLosses ?? []).map((d: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="p-3">#{d.lotNumber} {d.title}</td>
                      <td className="p-3 font-mono">{formatPrice(d.yourMaxBid)}</td>
                      <td className="p-3 font-mono">{formatPrice(d.soldPrice)}</td>
                      <td className="p-3 font-mono font-semibold text-red-400">{formatPrice(d.missAmount)} (%{d.missPct})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Favorileyip unuttuklarınız */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-400" />
            <h2 className="font-display font-semibold">Favorileyip Hiç Teklif Vermedikleriniz</h2>
          </div>
          {forgottenFavorites.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Süresi yaklaşan, teklif vermediğiniz favori bir lot yok.</div>
          ) : (
            <div className="divide-y divide-border">
              {forgottenFavorites.map((f: any) => (
                <Link key={f.lotId} href={`/lot/${f.lotId}`} className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                    {f.imageUrl && <Image src={f.imageUrl} alt={f.title} fill className="object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">#{f.lotNumber} {f.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{f.auctionTitle}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-amber-400 shrink-0">
                    <Clock className="h-3.5 w-3.5" /> {formatDateTime(f.endsAt)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
