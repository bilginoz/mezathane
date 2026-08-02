'use client';

// Admin — TEK EKRANDA bir satıcının her şeyi (DIRECT): bilgi+IBAN+komisyon, cari özet,
// Müzayede Hakkı özeti, alıcı bazlı cari (kim aldı, ödedi mi, bekliyor mu). Başka ekrana gitmeye gerek yok.
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Wallet, Ticket, Users, ChevronDown, ChevronRight, Store, Download } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export function AdminSellerCari({ sellerId }: { sellerId: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/seller-cari/${sellerId}`);
        if (!res.ok) throw new Error();
        setData(await res.json());
      } catch { toast.error('Satıcı carisi yüklenemedi'); }
      finally { setLoading(false); }
    })();
  }, [sellerId]);

  const exportCsv = () => {
    const cs: any[] = data?.cariler ?? [];
    const header = ['Alıcı', 'E-posta', 'Telefon', 'Lot No', 'Lot', 'Çekiç', 'Komisyon', 'KDV', 'Toplam', 'Durum', 'Vade', 'Tarih'];
    const rows: any[] = [];
    for (const c of cs) for (const o of c.orders) {
      rows.push([c.name, c.email, c.phone, `#${o.lotNumber}`, o.lotTitle, o.hammer, o.commission, o.kdv, o.total,
        o.paid ? 'Ödendi' : 'Bekliyor', o.dueDate ? formatDate(o.dueDate) : '', formatDate(o.createdAt)]);
    }
    const csv = [header, ...rows].map((row) => row.map((x: any) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `satici-cari-${(data?.seller?.name || 'satici').replace(/[^\w]/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  if (loading) return <main className="flex-1 py-8"><div className="flex justify-center min-h-[40vh] items-center"><Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" /></div></main>;
  if (!data?.seller) return <main className="flex-1 py-8"><p className="text-center text-muted-foreground">Satıcı bulunamadı.</p></main>;

  const s = data.summary ?? {}; const r = data.rights ?? {}; const seller = data.seller;
  const cariler: any[] = data.cariler ?? [];

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1100px] px-4">
        {/* Başlık + satıcı bilgisi */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/admin/finans" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors shrink-0"><ArrowLeft className="h-4 w-4" /></Link>
            <Store className="h-6 w-6 text-[#d4af37] shrink-0" />
            <h1 className="font-display text-2xl font-bold truncate">{seller.name}</h1>
          </div>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] text-black px-3 py-2 text-sm font-semibold hover:brightness-110 shrink-0"><Download className="h-4 w-4" /><span className="hidden sm:inline">Rapor (CSV)</span></button>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">Alıcı Komisyonu</p><p className="font-mono font-semibold">%{seller.buyerPremiumRate ?? 7}</p></div>
          <div><p className="text-xs text-muted-foreground">IBAN</p><p className="font-mono text-xs break-all">{seller.iban || '—'}</p></div>
          <div><p className="text-xs text-muted-foreground">E-posta</p><p className="text-xs break-all">{seller.email || '—'}</p></div>
          <div><p className="text-xs text-muted-foreground">Telefon</p><p className="text-xs">{seller.phone || '—'}</p></div>
        </div>

        {/* Cari özet */}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Satış & Tahsilat</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <Card label="Toplam Ciro" value={formatPrice(s.totalCiro)} sub={`${s.orderCount ?? 0} satış`} />
          <Card label="Tahsil Edilen" value={formatPrice(s.totalPaid)} tone="green" />
          <Card label="Bakiye (Alacak)" value={formatPrice(s.totalBalance)} tone="amber" />
          <Card label="Müşteri" value={String(s.customerCount ?? 0)} sub="cari" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 mb-6">
          <Mini label="Komisyon Geliri" value={formatPrice(s.commissionIncome)} />
          <Mini label="Tahsil Edilen KDV" value={formatPrice(s.kdvCollected)} />
        </div>

        {/* Müzayede Hakkı özeti — AYNI EKRANDA */}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5"><Ticket className="h-3.5 w-3.5 text-[#d4af37]" /> Müzayede Hakkı</p>
        {r.unlimitedActive && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 mb-3 text-sm">
            <span className="text-green-500 font-semibold">🔁 Aylık Sınırsız Paket aktif</span>
            {r.unlimitedExpiresAt && <span className="text-muted-foreground"> — {formatDate(r.unlimitedExpiresAt)} tarihine kadar</span>}
          </div>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <Card label="Kalan Hak (adet bazlı)" value={String(r.remaining ?? 0)} tone={r.remaining > 0 ? 'green' : undefined} />
          <Card label="Kullanılan" value={String(r.usedQty ?? 0)} />
          <Card label="Onaylı (toplam)" value={String(r.approvedQty ?? 0)} />
          <Card label="Onay Bekleyen" value={String(r.pendingCount ?? 0)} tone={r.pendingCount > 0 ? 'amber' : undefined} />
          <Card label="En Yakın Bitiş" value={r.expiryDaysLeft != null ? `${r.expiryDaysLeft} gün` : '—'} />
        </div>

        {/* Cari — alıcı bazlı */}
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Cari (Kim Aldı, Kim Ödedi)</p>
        {cariler.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center"><p className="text-muted-foreground">Bu satıcının henüz satışı yok.</p></div>
        ) : (
          <div className="space-y-2">
            {cariler.map((c) => (
              <div key={c.buyerId} className="rounded-xl border border-border bg-card overflow-hidden">
                <button onClick={() => setExpanded(expanded === c.buyerId ? null : c.buyerId)} className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 text-left">
                  {expanded === c.buyerId ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{c.orderCount} sipariş · {c.email}</p>
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
                {expanded === c.buyerId && (
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
  const color = tone === 'green' ? 'text-green-500' : tone === 'amber' ? 'text-amber-500' : 'text-foreground';
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border bg-card p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-base font-bold font-mono">{value}</p></div>;
}
