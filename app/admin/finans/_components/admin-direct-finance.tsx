'use client';

// DIRECT (V2 / doğrudan ödeme) modunda admin "Cari Hesaplar & Finans" sayfasının yerini alan görünüm.
// Bu modelde platform ürün bedelini tahsil etmez; cari/hakediş/payout TUTULMAZ (yanıltıcı olur).
// Platformun geliri "Müzayede Hakkı" satışlarıdır. Escrow finans JSX'i olduğu gibi durur; FinanceManagement
// yalnızca DIRECT'te bunu render eder → flag ESCROW'a dönünce eski finans ekranı geri gelir.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Ticket, Info, Package, ArrowRight } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { AdminBuyersFinance } from './admin-buyers-finance';
import { AdminSellersFinance } from './admin-sellers-finance';
import { AdminServiceFee } from './admin-service-fee';

export function AdminDirectFinance() {
  const [tab, setTab] = useState<'ozet' | 'alici' | 'satici' | 'hizmet'>('ozet');
  const [loading, setLoading] = useState(true);
  const [approvedRevenue, setApprovedRevenue] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [revenueModel, setRevenueModel] = useState<string>('KONTOR');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/auction-rights');
        const d = await res.json();
        const list: any[] = d?.purchases ?? [];
        const approved = list.filter(p => p.status === 'APPROVED');
        setApprovedRevenue(approved.reduce((s, p) => s + (p.totalAmount ?? 0), 0));
        setApprovedCount(approved.length);
        setPendingCount(d?.pendingCount ?? list.filter(p => p.status === 'PENDING').length);
      } catch {
        // sessiz — 0 gösterilir
      } finally {
        setLoading(false);
      }
      try {
        const res2 = await fetch('/api/admin/platform-settings');
        const d2 = await res2.json();
        setRevenueModel(d2?.settings?.directRevenueModel === 'HIZMET_BEDELI' ? 'HIZMET_BEDELI' : 'KONTOR');
      } catch {
        // sessiz — sekme gizli kalır
      }
    })();
  }, []);

  const tabs: { key: 'ozet' | 'alici' | 'satici' | 'hizmet'; label: string }[] = [
    { key: 'ozet', label: 'Özet' },
    { key: 'alici', label: 'Alıcılar' },
    { key: 'satici', label: 'Satıcılar' },
    ...(revenueModel === 'HIZMET_BEDELI' ? [{ key: 'hizmet' as const, label: 'Hizmet Bedeli' }] : []),
  ];

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1100px] px-4">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Ticket className="h-6 w-6 text-[#d4af37]" />
          <h1 className="font-display text-2xl font-bold">Finans ({revenueModel === 'HIZMET_BEDELI' ? 'V3 — Hizmet Bedeli Sistemi' : 'V2 — Kontör Sistemi'})</h1>
        </div>

        {/* Sekmeler */}
        <div className="flex items-center gap-2 mb-5 border-b border-border">
          {tabs.map(({ key: k, label }) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === k ? 'border-[#d4af37] text-[#d4af37]' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>{label}</button>
          ))}
        </div>

        {tab === 'alici' && <AdminBuyersFinance />}
        {tab === 'satici' && <AdminSellersFinance />}
        {tab === 'hizmet' && <AdminServiceFee />}

        {tab === 'ozet' && (<>
        {/* Model açıklaması */}
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 mb-6 flex items-start gap-3">
          <Info className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
          <div className="text-sm text-muted-foreground">
            Doğrudan ödeme modelinde <strong className="text-foreground">ürün bedeli platformdan geçmez</strong>; alıcı doğrudan
            satıcıya öder. Bu yüzden platform carisi, hakediş ve payout <strong className="text-foreground">tutulmaz</strong>.
            Platformun geliri <strong className="text-foreground">Müzayede Hakkı</strong> satışlarıdır. Alıcı/satıcı bazlı ödeme
            takibi için <strong className="text-foreground">Alıcılar</strong> ve <strong className="text-foreground">Satıcılar</strong> sekmelerine bakın.
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" /></div>
        ) : (
          <>
            {/* Platform geliri: Müzayede Hakkı */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-5">
                <p className="text-xs text-muted-foreground">Müzayede Hakkı Geliri (onaylı)</p>
                <p className="text-2xl font-bold font-mono text-[#d4af37] mt-1">{formatPrice(approvedRevenue)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{approvedCount} onaylı satın alma</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs text-muted-foreground">Onay Bekleyen Hak Talebi</p>
                <p className="text-2xl font-bold font-mono mt-1">{pendingCount}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Müzayede Hakları sayfasından onaylayın</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs text-muted-foreground">Platform Ürün Komisyonu</p>
                <p className="text-2xl font-bold font-mono text-green-500 mt-1">0 ₺</p>
                <p className="text-[10px] text-muted-foreground mt-1">Bu modelde alınmaz</p>
              </div>
            </div>

            {/* Yönlendirmeler */}
            <div className="space-y-2">
              <Link href="/admin/muzayede-haklari" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/50 transition-colors">
                <Ticket className="h-5 w-5 text-[#d4af37]" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Müzayede Hakları</p>
                  <p className="text-xs text-muted-foreground">Hak taleplerini onayla, geliri gör</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">Satış kayıtları</p>
                  <p className="text-xs text-muted-foreground">Her satışın detayı (alıcı, lot, tutar, ödeme durumu) ilgili satıcının <strong>Satış Kayıtları</strong> ekranında tutulur. Anlaşmazlıkta oradan CSV indirilebilir.</p>
                </div>
              </div>
            </div>
          </>
        )}
        </>)}
      </div>
    </main>
  );
}
