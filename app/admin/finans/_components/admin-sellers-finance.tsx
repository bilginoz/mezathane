'use client';

// Admin — Satıcılar finans: ne sattı, ne tahsil etti, ne bekliyor + Müzayede Hakkı özeti.
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Store, Search, Download } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

export function AdminSellersFinance() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/sellers-finance');
        if (!res.ok) throw new Error();
        setData(await res.json());
      } catch { toast.error('Satıcı finansı yüklenemedi'); }
      finally { setLoading(false); }
    })();
  }, []);

  const sellers: any[] = data?.sellers ?? [];
  const filtered = sellers.filter((s) => !q.trim() || s.name.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR')));

  const exportCsv = () => {
    const header = ['Satıcı', 'Satış', 'Toplam', 'Tahsil', 'Bekleyen', 'Hak(onaylı)', 'Hak(kalan)', 'Hak(bekleyen)', 'En yakın bitiş (gün)'];
    const lines = filtered.map((s) => [s.name, String(s.soldCount), String(s.totalAmount), String(s.collected), String(s.pending), String(s.rightsApprovedQty), String(s.rightsRemaining), String(s.rightsPending), s.expiryDaysLeft ?? '']);
    const csv = [header, ...lines].map((r) => r.map((x: any) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `saticilar-finans-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" /></div>;
  const sm = data?.summary ?? {};

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Satıcı</p><p className="text-xl font-bold font-mono">{sm.sellerCount ?? 0}</p></div>
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4"><p className="text-xs text-muted-foreground">Toplam Tahsilat</p><p className="text-xl font-bold font-mono text-green-500">{formatPrice(sm.totalCollected)}</p></div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"><p className="text-xs text-muted-foreground">Bekleyen</p><p className="text-xl font-bold font-mono text-amber-500">{formatPrice(sm.totalPending)}</p></div>
        <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-4"><p className="text-xs text-muted-foreground">Onay Bekleyen Hak</p><p className="text-xl font-bold font-mono text-[#d4af37]">{sm.rightsPendingTotal ?? 0}</p></div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Satıcı ara..." className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-[#d4af37] focus:outline-none" />
        </div>
        {filtered.length > 0 && <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] text-black px-3 py-2 text-sm font-semibold hover:brightness-110"><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center"><Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Kayıt yok.</p></div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Satıcı</th>
                <th className="px-3 py-2.5 font-medium text-right">Satış</th>
                <th className="px-3 py-2.5 font-medium text-right">Tahsil</th>
                <th className="px-3 py-2.5 font-medium text-right">Bekleyen</th>
                <th className="px-3 py-2.5 font-medium" title="Müzayede Hakkı: onaylı / kalan / bekleyen">Müzayede Hakkı</th>
                <th className="px-3 py-2.5 font-medium">En yakın bitiş</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.sellerId} onClick={() => router.push(`/admin/finans/satici/${s.sellerId}`)} className="border-b border-border/50 hover:bg-muted/30 cursor-pointer">
                  <td className="px-3 py-2.5 font-medium text-[#d4af37]">{s.name}<span className="block text-[10px] text-muted-foreground font-normal">{s.soldCount} satış · detay için tıkla</span></td>
                  <td className="px-3 py-2.5 text-right font-mono">{formatPrice(s.totalAmount)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-green-500">{formatPrice(s.collected)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-amber-500">{s.pending > 0 ? formatPrice(s.pending) : '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                    <span title="Onaylı (toplam)">{s.rightsApprovedQty}</span>
                    <span className="text-muted-foreground"> / kalan </span><span className="text-green-500">{s.rightsRemaining}</span>
                    {s.rightsPending > 0 && <span className="text-[#d4af37]"> · {s.rightsPending} bekliyor</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{s.expiryDaysLeft != null ? `${s.expiryDaysLeft} gün` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
