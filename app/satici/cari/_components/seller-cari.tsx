'use client';

// DIRECT (V2) modunda satıcının "Cari Hesabım" sayfası: İşletme özeti + müşteri (alıcı) bazlı CARİ.
// Sipariş bazlı ödeme takibi (kısmi ödeme yok). Escrow cari koduna dokunmaz; SellerFinance yalnızca
// DIRECT'te bunu render eder.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Users, Wallet, TrendingUp, Receipt, Ticket, ChevronDown, ChevronRight, Download, Search } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { SellerSalesLog } from './seller-sales-log';

export function SellerCari() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'cari' | 'satis'>('cari');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/seller/cari');
        if (!res.ok) throw new Error();
        setData(await res.json());
      } catch {
        toast.error('Cari yüklenemedi');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cariler: any[] = data?.cariler ?? [];
  const filtered = cariler.filter((c) => !q.trim() || c.name.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR')));

  const exportCsv = () => {
    const header = ['Müşteri', 'E-posta', 'Telefon', 'Sipariş', 'Toplam Borç', 'Ödenen', 'Bakiye (Alacak)', 'Son İşlem'];
    const lines = filtered.map((c) => [
      c.name, c.email, c.phone, String(c.orderCount),
      String(c.totalDebit), String(c.totalPaid), String(c.balance), formatDate(c.lastDate),
    ]);
    const csv = [header, ...lines].map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `cari-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  if (loading) {
    return <main className="flex-1 py-8"><div className="flex justify-center min-h-[40vh] items-center"><Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" /></div></main>;
  }

  const s = data?.summary ?? {};
  const b = data?.business ?? {};

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1100px] px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/satici" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></Link>
          <Wallet className="h-6 w-6 text-[#d4af37]" />
          <h1 className="font-display text-2xl font-bold">Cari & İşletme Özeti</h1>
        </div>

        {/* Özet kartlar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <SummaryCard icon={TrendingUp} label="Toplam Ciro" value={formatPrice(s.totalCiro)} sub={`${s.orderCount ?? 0} satış`} />
          <SummaryCard icon={Receipt} label="Tahsil Edilen" value={formatPrice(s.totalPaid)} tone="green" />
          <SummaryCard icon={Wallet} label="Bakiye (Alacak)" value={formatPrice(s.totalBalance)} tone="amber" />
          <SummaryCard icon={Users} label="Müşteri" value={String(s.customerCount ?? 0)} sub="cari" />
        </div>

        {/* İşletme özeti */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <MiniStat label="Komisyon Geliriniz" value={formatPrice(b.commissionIncome)} hint="Alıcılardan aldığınız komisyon" />
          <MiniStat label="Tahsil Edilen KDV" value={formatPrice(b.kdvCollected)} hint="Komisyon üzerinden %20" />
          <MiniStat label="Müzayede Hakkı Gideriniz" value={formatPrice(b.rightsExpense)} hint="Onaylı hak alımları" icon={Ticket} />
        </div>

        {/* Sekmeler */}
        <div className="flex items-center gap-2 mb-4 border-b border-border">
          <button onClick={() => setTab('cari')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'cari' ? 'border-[#d4af37] text-[#d4af37]' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Cariler (Müşteriler)</button>
          <button onClick={() => setTab('satis')} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'satis' ? 'border-[#d4af37] text-[#d4af37]' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Tüm Satışlar</button>
        </div>

        {tab === 'satis' ? (
          <SellerSalesLog embedded />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Müşteri ara..." className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-[#d4af37] focus:outline-none" />
              </div>
              {filtered.length > 0 && (
                <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] text-black px-3 py-2 text-sm font-semibold hover:brightness-110 transition-all shrink-0">
                  <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{cariler.length === 0 ? 'Henüz cari (müşteri) kaydınız yok.' : 'Aramayla eşleşen müşteri yok.'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((c) => (
                  <div key={c.buyerId} className="rounded-xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setExpanded(expanded === c.buyerId ? null : c.buyerId)} className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors text-left">
                      {expanded === c.buyerId ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{c.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{c.orderCount} sipariş • son {formatDate(c.lastDate)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-mono font-bold text-sm ${c.balance > 0 ? 'text-amber-500' : 'text-green-500'}`}>{c.balance > 0 ? formatPrice(c.balance) : '✓ Kapalı'}</p>
                        <p className="text-[10px] text-muted-foreground">{c.balance > 0 ? 'bakiye' : 'ödendi'}</p>
                      </div>
                    </button>
                    {expanded === c.buyerId && (
                      <div className="border-t border-border/60 bg-muted/20 px-3 py-2">
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground mb-2">
                          <span>Toplam borç: <span className="font-mono text-foreground">{formatPrice(c.totalDebit)}</span></span>
                          <span>Ödenen: <span className="font-mono text-green-500">{formatPrice(c.totalPaid)}</span></span>
                          <span>Bakiye: <span className="font-mono text-amber-500">{formatPrice(c.balance)}</span></span>
                          {c.email && <span>{c.email}</span>}
                          {c.phone && <span>{c.phone}</span>}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead><tr className="text-left text-muted-foreground border-b border-border/60">
                              <th className="py-1.5 pr-3 font-medium">Tarih</th>
                              <th className="py-1.5 pr-3 font-medium">Lot</th>
                              <th className="py-1.5 pr-3 font-medium text-right">Tutar</th>
                              <th className="py-1.5 font-medium">Durum</th>
                            </tr></thead>
                            <tbody>
                              {c.orders.map((o: any) => (
                                <tr key={o.paymentId} className="border-b border-border/40">
                                  <td className="py-1.5 pr-3 whitespace-nowrap text-muted-foreground">{formatDate(o.createdAt)}</td>
                                  <td className="py-1.5 pr-3">#{o.lotNumber} {o.lotTitle}</td>
                                  <td className="py-1.5 pr-3 text-right font-mono">{formatPrice(o.total)}</td>
                                  <td className="py-1.5 whitespace-nowrap">{o.paid ? <span className="text-green-500">Ödendi</span> : o.buyerReportedPaidAt ? <span className="text-amber-500">Onay bekliyor</span> : <span className="text-muted-foreground">Bekliyor</span>}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub?: string; tone?: string }) {
  const color = tone === 'green' ? 'text-green-500' : tone === 'amber' ? 'text-amber-500' : 'text-foreground';
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="h-5 w-5 text-[#d4af37] mb-1.5" />
      <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}{sub ? ` · ${sub}` : ''}</p>
    </div>
  );
}

function MiniStat({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon?: any }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 mb-0.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-[#d4af37]" />}
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      <p className="text-base font-bold font-mono">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}
