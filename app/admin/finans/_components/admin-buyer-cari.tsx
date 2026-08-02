'use client';

// Admin — TEK EKRANDA bir alıcının her şeyi (DIRECT): bilgi, satın alma özeti, satıcı bazlı cari
// (kimden ne aldı, ödedi mi, bekliyor mu) + CSV rapor. Başka ekrana gitmeye gerek yok.
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Users, ChevronDown, ChevronRight, Download, User as UserIcon } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export function AdminBuyerCari({ buyerId }: { buyerId: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/buyer-cari/${buyerId}`);
        if (!res.ok) throw new Error();
        setData(await res.json());
      } catch { toast.error('Alıcı carisi yüklenemedi'); }
      finally { setLoading(false); }
    })();
  }, [buyerId]);

  const exportCsv = () => {
    const cs: any[] = data?.cariler ?? [];
    const header = ['Satıcı', 'Lot No', 'Lot', 'Çekiç', 'Komisyon', 'KDV', 'Toplam', 'Durum', 'Vade', 'Tarih'];
    const rows: any[] = [];
    for (const c of cs) for (const o of c.orders) {
      rows.push([c.name, `#${o.lotNumber}`, o.lotTitle, o.hammer, o.commission, o.kdv, o.total,
        o.paid ? 'Ödendi' : 'Bekliyor', o.dueDate ? formatDate(o.dueDate) : '', formatDate(o.createdAt)]);
    }
    const csv = [header, ...rows].map((row) => row.map((x: any) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `alici-cari-${(data?.buyer?.name || 'alici').replace(/[^\w]/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  if (loading) return <main className="flex-1 py-8"><div className="flex justify-center min-h-[40vh] items-center"><Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" /></div></main>;
  if (!data?.buyer) return <main className="flex-1 py-8"><p className="text-center text-muted-foreground">Alıcı bulunamadı.</p></main>;

  const s = data.summary ?? {}; const buyer = data.buyer;
  const cariler: any[] = data.cariler ?? [];

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1100px] px-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin/finans" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors shrink-0"><ArrowLeft className="h-4 w-4" /></Link>
            <UserIcon className="h-6 w-6 text-[#d4af37] shrink-0" />
            <h1 className="font-display text-2xl font-bold truncate">{buyer.name}{!buyer.isActive && <span className="ml-2 text-sm text-red-400">(askıda)</span>}</h1>
          </div>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] text-black px-3 py-2 text-sm font-semibold hover:brightness-110 shrink-0"><Download className="h-4 w-4" /><span className="hidden sm:inline">Rapor (CSV)</span></button>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 mb-5 grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">E-posta</p><p className="text-xs break-all">{buyer.email || '—'}</p></div>
          <div><p className="text-xs text-muted-foreground">Telefon</p><p className="text-xs">{buyer.phone || '—'}</p></div>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Satın Alma & Ödeme</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <Card label="Toplam Harcama" value={formatPrice(s.totalSpent)} sub={`${s.orderCount ?? 0} sipariş`} />
          <Card label="Ödediği" value={formatPrice(s.totalPaid)} tone="green" />
          <Card label="Bekleyen Borç" value={formatPrice(s.totalBalance)} tone="amber" />
          <Card label="Satıcı Sayısı" value={String(s.sellerCount ?? 0)} />
          <Card label="Vadesi Geçen" value={String(s.overdueCount ?? 0)} tone={s.overdueCount > 0 ? 'red' : undefined} />
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Cari (Kimden Aldı, Kime Ödedi)</p>
        {cariler.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center"><p className="text-muted-foreground">Bu alıcının henüz satın alması yok.</p></div>
        ) : (
          <div className="space-y-2">
            {cariler.map((c) => (
              <div key={c.sellerId} className="rounded-xl border border-border bg-card overflow-hidden">
                <button onClick={() => setExpanded(expanded === c.sellerId ? null : c.sellerId)} className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 text-left">
                  {expanded === c.sellerId ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.orderCount} sipariş</p>
                  </div>
                  <div className="text-right shrink-0">
                    {c.balance > 0 ? (
                      <>
                        <p className="font-mono font-bold text-sm text-amber-500">{formatPrice(c.balance)}</p>
                        <p className={`text-[10px] ${c.overdue ? 'text-red-400 font-semibold' : 'text-muted-foreground'}`}>{c.overdue ? 'VADESİ GEÇTİ' : c.daysLeft != null ? `${c.daysLeft} gün` : 'bekliyor'}</p>
                      </>
                    ) : <p className="font-mono font-bold text-sm text-green-500">✓ Ödendi</p>}
                  </div>
                </button>
                {expanded === c.sellerId && (
                  <div className="border-t border-border/60 bg-muted/20 px-3 py-2 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-muted-foreground border-b border-border/60">
                        <th className="py-1.5 pr-3 font-medium">Tarih</th><th className="py-1.5 pr-3 font-medium">Lot</th>
                        <th className="py-1.5 pr-3 font-medium text-right">Çekiç</th><th className="py-1.5 pr-3 font-medium text-right">Komisyon</th>
                        <th className="py-1.5 pr-3 font-medium text-right">Toplam</th><th className="py-1.5 font-medium">Durum</th>
                      </tr></thead>
                      <tbody>
                        {c.orders.map((o: any) => (
                          <tr key={o.paymentId} className="border-b border-border/40">
                            <td className="py-1.5 pr-3 whitespace-nowrap text-muted-foreground">{formatDate(o.createdAt)}</td>
                            <td className="py-1.5 pr-3">#{o.lotNumber} {o.lotTitle}</td>
                            <td className="py-1.5 pr-3 text-right font-mono">{formatPrice(o.hammer)}</td>
                            <td className="py-1.5 pr-3 text-right font-mono">{formatPrice(o.commission)} <span className="text-[9px] text-muted-foreground">%{o.commissionRate}</span></td>
                            <td className="py-1.5 pr-3 text-right font-mono font-semibold">{formatPrice(o.total)}</td>
                            <td className="py-1.5 whitespace-nowrap">{o.paid ? <span className="text-green-500">Ödendi</span> : <span className="text-amber-500">Bekliyor{o.dueDate ? ` · ${formatDate(o.dueDate)}` : ''}</span>}</td>
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
    </main>
  );
}

function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  const color = tone === 'green' ? 'text-green-500' : tone === 'amber' ? 'text-amber-500' : tone === 'red' ? 'text-red-400' : 'text-foreground';
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
