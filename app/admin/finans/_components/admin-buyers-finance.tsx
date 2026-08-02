'use client';

// Admin — Alıcılar finans/ödeme takibi: kim ne aldı, ne ödedi, ne bekliyor, vade/kaç gün kaldı.
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Users, Search, ChevronDown, ChevronRight, Download, ArrowUpRight } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export function AdminBuyersFinance() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/buyers-finance');
        if (!res.ok) throw new Error();
        setData(await res.json());
      } catch { toast.error('Alıcı finansı yüklenemedi'); }
      finally { setLoading(false); }
    })();
  }, []);

  const buyers: any[] = data?.buyers ?? [];
  const filtered = buyers.filter((b) => !q.trim() || b.name.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR')) || (b.email || '').toLowerCase().includes(q.toLowerCase()));

  const exportCsv = () => {
    const header = ['Alıcı', 'E-posta', 'Sipariş', 'Toplam', 'Ödenen', 'Bekleyen', 'Vade', 'Kalan Gün'];
    const lines = filtered.map((b) => [b.name, b.email, String(b.orderCount), String(b.totalAmount), String(b.paidAmount), String(b.pendingAmount), b.nearestDue ? formatDate(b.nearestDue) : '', b.daysLeft ?? '']);
    const csv = [header, ...lines].map((r) => r.map((x: any) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `alicilar-finans-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" /></div>;
  const s = data?.summary ?? {};

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">Alıcı</p><p className="text-xl font-bold font-mono">{s.buyerCount ?? 0}</p></div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"><p className="text-xs text-muted-foreground">Bekleyen Tahsilat</p><p className="text-xl font-bold font-mono text-amber-500">{formatPrice(s.totalPending)}</p></div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4"><p className="text-xs text-muted-foreground">Vadesi Geçen</p><p className="text-xl font-bold font-mono text-red-400">{s.overdueCount ?? 0} alıcı</p></div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Alıcı ara..." className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-[#d4af37] focus:outline-none" />
        </div>
        {filtered.length > 0 && <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] text-black px-3 py-2 text-sm font-semibold hover:brightness-110"><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center"><Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Kayıt yok.</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map((b) => (
            <div key={b.buyerId} className="rounded-xl border border-border bg-card overflow-hidden">
              <button onClick={() => setExpanded(expanded === b.buyerId ? null : b.buyerId)} className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 text-left">
                {expanded === b.buyerId ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{b.name}{!b.isActive && <span className="ml-2 text-[10px] text-red-400">(askıda)</span>}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{b.orderCount} sipariş · {b.email}</p>
                </div>
                <div className="text-right shrink-0">
                  {b.pendingAmount > 0 ? (
                    <>
                      <p className="font-mono font-bold text-sm text-amber-500">{formatPrice(b.pendingAmount)}</p>
                      <p className={`text-[10px] ${b.overdue ? 'text-red-400 font-semibold' : 'text-muted-foreground'}`}>
                        {b.overdue ? 'VADESİ GEÇTİ' : b.daysLeft != null ? `${b.daysLeft} gün kaldı` : 'bekliyor'}
                      </p>
                    </>
                  ) : (<p className="font-mono font-bold text-sm text-green-500">✓ Ödendi</p>)}
                </div>
              </button>
              <div className="px-3 pb-2 -mt-1">
                <Link href={`/admin/finans/alici/${b.buyerId}`} className="inline-flex items-center gap-1 text-[11px] text-[#d4af37] hover:underline" onClick={(e) => e.stopPropagation()}>
                  Detaylı cari görünüm <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
              {expanded === b.buyerId && (
                <div className="border-t border-border/60 bg-muted/20 px-3 py-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-left text-muted-foreground border-b border-border/60">
                      <th className="py-1.5 pr-3 font-medium">Tarih</th><th className="py-1.5 pr-3 font-medium">Lot</th><th className="py-1.5 pr-3 font-medium">Satıcı</th>
                      <th className="py-1.5 pr-3 font-medium text-right">Tutar</th><th className="py-1.5 pr-3 font-medium">Vade</th><th className="py-1.5 font-medium">Durum</th>
                    </tr></thead>
                    <tbody>
                      {b.orders.map((o: any) => (
                        <tr key={o.paymentId} className="border-b border-border/40">
                          <td className="py-1.5 pr-3 whitespace-nowrap text-muted-foreground">{formatDate(o.createdAt)}</td>
                          <td className="py-1.5 pr-3">#{o.lotNumber} {o.lotTitle}</td>
                          <td className="py-1.5 pr-3 text-muted-foreground">{o.sellerName}</td>
                          <td className="py-1.5 pr-3 text-right font-mono">{formatPrice(o.total)}</td>
                          <td className="py-1.5 pr-3 whitespace-nowrap text-muted-foreground">{o.dueDate ? formatDate(o.dueDate) : '—'}</td>
                          <td className="py-1.5 whitespace-nowrap">{o.paid ? <span className="text-green-500">Ödendi</span> : <span className="text-amber-500">Bekliyor</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
