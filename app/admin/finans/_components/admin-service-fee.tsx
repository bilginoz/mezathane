'use client';

// AŞAMA 3d (2026-08-06): Admin — HİZMET_BEDELİ modelinde satıcıların platforma borcu + onay.
// Satıcı "Ödedim" dedikten sonra burada tek tuşla onaylanır; onaylanmadan borç açık sayılır
// ve satıcı yeni müzayede açamaz (bkz. /api/auctions vade kısıtlaması).

import { useState, useEffect } from 'react';
import { Loader2, Receipt, Search, Download, CheckCircle2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

export function AdminServiceFee() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState('');
  const [approving, setApproving] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/service-fee');
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error('Hizmet bedeli verisi yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (sellerId: string) => {
    setApproving(sellerId);
    try {
      const res = await fetch('/api/admin/service-fee', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d?.error || 'Hata oluştu'); return; }
      toast.success(`${d.approvedCount} sipariş onaylandı (${formatPrice(d.totalApproved)})`);
      await load();
    } catch {
      toast.error('Onaylanamadı');
    } finally {
      setApproving(null);
    }
  };

  const sellers: any[] = data?.sellers ?? [];
  const filtered = sellers.filter((s) => !q.trim() || s.name.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR')));

  const exportCsv = () => {
    const header = ['Satıcı', 'Ödenmemiş', 'Bildirildi (onay bekliyor)', 'Ödendi', 'Vadesi geçmiş adet'];
    const lines = filtered.map((s) => [s.name, String(s.owed), String(s.reported), String(s.paid), String(s.overdueCount)]);
    const csv = [header, ...lines].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `hizmet-bedeli-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" /></div>;
  const sm = data?.summary ?? {};

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4"><p className="text-xs text-muted-foreground">Ödenmemiş (bildirilmedi)</p><p className="text-xl font-bold font-mono text-red-500">{formatPrice(sm.totalOwed)}</p></div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"><p className="text-xs text-muted-foreground">Onay Bekleyen</p><p className="text-xl font-bold font-mono text-amber-500">{formatPrice(sm.totalReported)}</p></div>
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4"><p className="text-xs text-muted-foreground">Onaylanmış</p><p className="text-xl font-bold font-mono text-green-500">{formatPrice(sm.totalPaid)}</p></div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Satıcı ara..." className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-[#d4af37] focus:outline-none" />
        </div>
        {filtered.length > 0 && <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] text-black px-3 py-2 text-sm font-semibold hover:brightness-110"><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center"><Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">Henüz hizmet bedeli kaydı yok.</p></div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Satıcı</th>
                <th className="px-3 py-2.5 font-medium text-right">Ödenmemiş</th>
                <th className="px-3 py-2.5 font-medium text-right">Onay Bekleyen</th>
                <th className="px-3 py-2.5 font-medium text-right">Ödendi</th>
                <th className="px-3 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.sellerId} className="border-b border-border/50">
                  <td className="px-3 py-2.5 font-medium">
                    {s.name}
                    {s.overdueCount > 0 && <span className="block text-[10px] text-red-500 font-normal">{s.overdueCount} vadesi geçmiş — yeni müzayede açamaz</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-red-500">{s.owed > 0 ? formatPrice(s.owed) : '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-amber-500">{s.reported > 0 ? formatPrice(s.reported) : '—'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-green-500">{s.paid > 0 ? formatPrice(s.paid) : '—'}</td>
                  <td className="px-3 py-2.5 text-right">
                    {s.reported > 0 && (
                      <button onClick={() => approve(s.sellerId)} disabled={approving === s.sellerId} className="inline-flex items-center gap-1.5 rounded-lg bg-green-500 text-white px-3 py-1.5 text-xs font-semibold hover:brightness-110 disabled:opacity-50">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {approving === s.sellerId ? 'Onaylanıyor...' : 'Ödeme Onayla'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
