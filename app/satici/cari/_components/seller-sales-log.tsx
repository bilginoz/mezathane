'use client';

// DIRECT (V2) modunda "Cari Hesabım"ın yerini alan SATIŞ KAYITLARI görünümü.
// Cari/hakediş anlamsız (para platformdan geçmiyor); bunun yerine resmi anlaşmazlıklar için
// izlenebilir bir satış log'u: kim, hangi lotu, ne zaman, kaç TL'ye aldı, ödeme/teslim durumu.
// Escrow (V1) cari koduna dokunmaz; SellerFinance yalnızca DIRECT'te bunu render eder.

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Package, Download, Search } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface SaleRow {
  paymentId: string;
  lotNumber: number;
  lotTitle: string;
  auctionTitle: string;
  salePrice: number;
  totalAmount: number;
  paymentStatus: string;
  paidAt: string | null;
  createdAt: string;
  shippingStatus: string | null;
  buyerConfirmedAt: string | null;
  buyerReportedPaidAt: string | null;
  sellerPaymentConfirmedAt: string | null;
  buyerHidden?: boolean;
  buyer?: { fullName: string; email: string; phone?: string; companyName?: string | null } | null;
}

function paymentLabel(o: SaleRow): { text: string; cls: string } {
  if (o.sellerPaymentConfirmedAt || o.paymentStatus === 'PAID') return { text: 'Ödeme alındı', cls: 'text-green-500' };
  if (o.buyerReportedPaidAt) return { text: 'Alıcı ödedi (onay bekliyor)', cls: 'text-amber-500' };
  return { text: 'Ödeme bekleniyor', cls: 'text-muted-foreground' };
}

function shippingLabel(s: string | null, confirmed: string | null): string {
  if (confirmed) return 'Teslim edildi';
  switch (s) {
    case 'SHIPPED': return 'Kargoda';
    case 'PREPARING': return 'Hazırlanıyor';
    case 'DELIVERED': return 'Teslim edildi';
    default: return '—';
  }
}

function buyerName(o: SaleRow): string {
  if (o.buyerHidden || !o.buyer) return 'Gizli';
  return o.buyer.companyName || o.buyer.fullName || '—';
}

export function SellerSalesLog() {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/seller/orders');
        if (!res.ok) throw new Error();
        const data = await res.json();
        setRows(data.orders ?? []);
      } catch {
        toast.error('Satış kayıtları yüklenemedi');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLocaleLowerCase('tr-TR');
    return (
      `#${r.lotNumber}`.includes(s) ||
      (r.lotTitle || '').toLocaleLowerCase('tr-TR').includes(s) ||
      buyerName(r).toLocaleLowerCase('tr-TR').includes(s) ||
      (r.auctionTitle || '').toLocaleLowerCase('tr-TR').includes(s)
    );
  });

  const exportCsv = () => {
    const header = ['Tarih', 'Lot No', 'Lot', 'Müzayede', 'Alıcı', 'Çekiç Fiyatı', 'Alıcı Ödediği', 'Ödeme Durumu', 'Ödeme Tarihi', 'Teslim'];
    const lines = filtered.map((r) => [
      formatDate(r.createdAt),
      `#${r.lotNumber}`,
      (r.lotTitle || '').replace(/"/g, '""'),
      (r.auctionTitle || '').replace(/"/g, '""'),
      buyerName(r).replace(/"/g, '""'),
      String(r.salePrice ?? ''),
      String(r.totalAmount ?? ''),
      paymentLabel(r).text,
      r.sellerPaymentConfirmedAt ? formatDate(r.sellerPaymentConfirmedAt) : (r.paidAt ? formatDate(r.paidAt) : ''),
      shippingLabel(r.shippingStatus, r.buyerConfirmedAt),
    ]);
    const csv = [header, ...lines].map((row) => row.map((c) => `"${c}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `satis-kayitlari-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <main className="flex-1 py-8">
        <div className="flex justify-center min-h-[40vh] items-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1200px] px-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <Link href="/satici" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Package className="h-6 w-6 text-[#d4af37]" />
            <h1 className="font-display text-2xl font-bold">Satış Kayıtları</h1>
          </div>
          {filtered.length > 0 && (
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] text-black px-4 py-2 text-sm font-semibold hover:brightness-110 transition-all shrink-0"
            >
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV indir</span>
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-6 ml-12">
          Bu satışlarda ödeme doğrudan size yapılır; platform komisyon almaz. Kayıtlar resmi anlaşmazlıklarda referans içindir.
        </p>

        {/* Arama */}
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Lot, alıcı veya müzayede ara..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-[#d4af37] focus:outline-none"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{rows.length === 0 ? 'Henüz satış kaydınız yok.' : 'Aramanızla eşleşen kayıt yok.'}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium">Tarih</th>
                  <th className="px-3 py-2.5 font-medium">Lot</th>
                  <th className="px-3 py-2.5 font-medium">Alıcı</th>
                  <th className="px-3 py-2.5 font-medium text-right">Çekiç Fiyatı</th>
                  <th className="px-3 py-2.5 font-medium text-right">Alıcı Ödediği</th>
                  <th className="px-3 py-2.5 font-medium">Ödeme</th>
                  <th className="px-3 py-2.5 font-medium">Teslim</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const pl = paymentLabel(r);
                  return (
                    <tr key={r.paymentId} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{formatDate(r.createdAt)}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-medium">#{r.lotNumber}</span> {r.lotTitle}
                        <span className="block text-[10px] text-muted-foreground">{r.auctionTitle}</span>
                      </td>
                      <td className="px-3 py-2.5">{buyerName(r)}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{formatPrice(r.salePrice)}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold">{formatPrice(r.totalAmount)}</td>
                      <td className={`px-3 py-2.5 whitespace-nowrap ${pl.cls}`}>{pl.text}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{shippingLabel(r.shippingStatus, r.buyerConfirmedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
