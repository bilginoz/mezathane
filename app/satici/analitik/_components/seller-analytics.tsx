'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft, TrendingUp, BarChart3, Eye, Heart, Gavel,
  Layers, ShoppingBag, Percent, Target, Activity, DollarSign,
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export function SellerAnalytics() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated') {
      fetch('/api/seller/analytics')
        .then(r => r.json())
        .then(d => { if (d?.error) router.replace('/satici'); else setData(d); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === 'loading' || loading) {
    return (
      <main className="flex-1 py-8"><div className="mx-auto max-w-[1200px] px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}</div>
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div></main>
    );
  }

  const o = data?.overview ?? {};

  const statCards = [
    { icon: Gavel, label: 'Toplam Müzayede', value: o.totalAuctions ?? 0, color: 'text-[#d4af37]' },
    { icon: Layers, label: 'Toplam Lot', value: o.totalLots ?? 0, color: 'text-blue-400' },
    { icon: ShoppingBag, label: 'Satılan Lot', value: o.soldLots ?? 0, color: 'text-green-400' },
    { icon: Target, label: 'Satış Oranı', value: `%${o.saleRate ?? 0}`, color: 'text-purple-400' },
    { icon: DollarSign, label: 'Toplam Gelir', value: formatPrice(o.totalRevenue ?? 0), color: 'text-emerald-400' },
    { icon: TrendingUp, label: 'Ort. Satış Fiyatı', value: formatPrice(o.avgSalePrice ?? 0), color: 'text-amber-400' },
    { icon: Percent, label: 'Fiyat Artışı', value: `%${o.priceIncrease ?? 0}`, color: 'text-cyan-400' },
    { icon: BarChart3, label: 'Toplam Teklif', value: o.totalBids ?? 0, color: 'text-orange-400' },
    { icon: Activity, label: 'Ort. Teklif/Lot', value: o.avgBidsPerLot ?? 0, color: 'text-pink-400' },
    { icon: Eye, label: 'Toplam Görüntülenme', value: o.totalViews ?? 0, color: 'text-sky-400' },
    { icon: Heart, label: 'Favori Sayısı', value: o.watchlistCount ?? 0, color: 'text-red-400' },
    { icon: Percent, label: 'Komisyon Oranı', value: `%${o.commissionRate ?? 15}`, color: 'text-[#d4af37]' },
  ];

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1200px] px-4">
        <Link href="/satici" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Satıcı Paneline Dön
        </Link>

        <h1 className="font-display text-2xl font-bold mb-6">Satıcı Analitik Paneli</h1>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-border bg-card p-4">
              <s.icon className={`h-5 w-5 mb-2 ${s.color}`} />
              <p className="text-lg sm:text-xl font-bold font-mono">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Auction Performance */}
        <div className="rounded-xl border border-border bg-card mb-8">
          <div className="p-4 border-b border-border">
            <h2 className="font-display font-semibold">Müzayede Performansı</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left p-3">Müzayede</th>
                  <th className="text-center p-3">Durum</th>
                  <th className="text-center p-3">Lot</th>
                  <th className="text-center p-3">Satılan</th>
                  <th className="text-center p-3">Teklif</th>
                  <th className="text-center p-3">Görüntüleme</th>
                  <th className="text-right p-3">Gelir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.auctionStats ?? []).map((a: any) => (
                  <tr key={a.id} className="hover:bg-muted/50">
                    <td className="p-3">
                      <Link href={`/satici/muzayede/${a.id}`} className="text-[#d4af37] hover:underline font-medium">{a.title}</Link>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        a.status === 'COMPLETED' ? 'bg-amber-500/20 text-amber-400' :
                        a.status === 'LIVE' ? 'bg-red-500/20 text-red-400' :
                        a.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                        'bg-muted text-muted-foreground'
                      }`}>{a.status}</span>
                    </td>
                    <td className="p-3 text-center font-mono">{a.lotCount}</td>
                    <td className="p-3 text-center font-mono text-green-400">{a.soldCount}</td>
                    <td className="p-3 text-center font-mono">{a.bids}</td>
                    <td className="p-3 text-center font-mono">{a.views}</td>
                    <td className="p-3 text-right font-mono text-[#d4af37]">{formatPrice(a.revenue)}</td>
                  </tr>
                ))}
                {(data?.auctionStats ?? []).length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Henüz müzayede verisi yok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="rounded-xl border border-border bg-card mb-8">
          <div className="p-4 border-b border-border">
            <h2 className="font-display font-semibold">Kategori Bazında Satışlar</h2>
          </div>
          <div className="p-4">
            {(data?.categorySales ?? []).length === 0 ? (
              <p className="text-center text-muted-foreground py-6">Henüz satış verisi yok</p>
            ) : (
              <div className="space-y-3">
                {(data?.categorySales ?? []).map((c: any, i: number) => {
                  const maxRevenue = data?.categorySales?.[0]?.revenue ?? 1;
                  const pct = maxRevenue > 0 ? (c.revenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-muted-foreground">{c.count} satış — {formatPrice(c.revenue)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-[#d4af37] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bid Trend */}
        {(data?.bidTrend ?? []).length > 0 && (
          <div className="rounded-xl border border-border bg-card">
            <div className="p-4 border-b border-border">
              <h2 className="font-display font-semibold">Son 30 Gün Teklif Trendi</h2>
            </div>
            <div className="p-4">
              <div className="flex items-end gap-1 h-32">
                {(data?.bidTrend ?? []).map((d: any, i: number) => {
                  const maxCount = Math.max(...(data?.bidTrend ?? []).map((t: any) => t.count));
                  const h = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count} teklif`}>
                      <div className="w-full bg-[#d4af37]/80 rounded-t transition-all hover:bg-[#d4af37]" style={{ height: `${Math.max(h, 4)}%` }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
                <span>{data?.bidTrend?.[0]?.date ?? ''}</span>
                <span>{data?.bidTrend?.[data.bidTrend.length - 1]?.date ?? ''}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
