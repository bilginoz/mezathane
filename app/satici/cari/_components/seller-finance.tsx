'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft, TrendingUp, Receipt, Wallet, FileText,
  Loader2, Package, DollarSign, Calculator, CircleDollarSign,
  Building2, Info, CheckCircle2, Circle,
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface Transaction {
  lotId: string;
  lotTitle: string;
  lotNumber: number;
  auctionTitle: string;
  auctionId: string;
  salePrice: number;
  commissionRate: number;
  grossCommission: number;
  netCommission: number;
  commissionKDV: number;
  sellerPayout: number;
  sellerInvoiceAmount: number;
  platformInvoiceAmount: number;
  platformInvoiceMatrah: number;
  platformInvoiceKDV: number;
  buyerName: string;
  buyerEmail: string;
  paymentStatus: string;
  sellerInvoiceIssued: boolean;
  platformInvoiceIssued: boolean;
  buyerPaymentReceived: boolean;
  payoutCompleted: boolean;
  soldAt: string;
}

interface SellerInfo {
  companyName: string;
  taxOffice: string | null;
  taxNumber: string | null;
  companyAddress: string | null;
}

interface Summary {
  totalSales: number;
  totalCommission: number;
  totalNetCommission: number;
  totalCommissionKDV: number;
  soldLotCount: number;
  sellerPayout: number;
}

export function SellerFinance() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [seller, setSeller] = useState<SellerInfo | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated' && user?.role !== 'SELLER' && user?.role !== 'ADMIN') {
      router.replace('/panel');
      return;
    }
  }, [status, router, user?.role]);

  useEffect(() => {
    if (status === 'authenticated' && (user?.role === 'SELLER' || user?.role === 'ADMIN')) {
      fetchFinance();
    }
  }, [status, user?.role]);

  const fetchFinance = async () => {
    try {
      const res = await fetch('/api/seller/finance');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSeller(data.seller);
      setSummary(data.summary);
      setTransactions(data.transactions ?? []);
    } catch {
      toast.error('Cari hesap verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1200px] px-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <Link href="/satici" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Wallet className="h-6 w-6 text-[#d4af37]" />
            <div>
              <h1 className="font-display text-2xl font-bold">Cari Hesabım</h1>
              {seller && <p className="text-sm text-muted-foreground">{seller.companyName}</p>}
            </div>
          </div>
          <Link href="/satici/cari/ekstre" className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] text-black px-4 py-2 text-sm font-semibold hover:brightness-110 transition-all shrink-0">
            <FileText className="h-4 w-4" /> <span className="hidden sm:inline">Cari Ekstrem</span>
          </Link>
        </div>

        {/* Model 1 Bilgi Kutusu */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-4 mb-8"
        >
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-[#d4af37] mt-0.5 shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-semibold text-[#d4af37]">Fatura Modeli (Aracı Model)</p>
              <p className="text-muted-foreground">
                <strong>Siz → Alıcıya:</strong> Satış fiyatı üzerinden ürün faturası kesersiniz.
              </p>
              <p className="text-muted-foreground">
                <strong>Platform → Size:</strong> Komisyon tutarı üzerinden hizmet faturası kesilir.
              </p>
              <p className="text-muted-foreground">
                <strong>Para Akışı:</strong> Alıcı → Platform → Size (komisyon düşülerek ödenir).
              </p>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4">
              <Package className="h-5 w-5 text-[#d4af37] mb-2" />
              <p className="text-xl font-bold font-mono">{summary.soldLotCount}</p>
              <p className="text-xs text-muted-foreground">Satılan Lot</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-border bg-card p-4">
              <DollarSign className="h-5 w-5 text-[#d4af37] mb-2" />
              <p className="text-xl font-bold font-mono">{formatPrice(summary.totalSales)}</p>
              <p className="text-xs text-muted-foreground">Toplam Ciro</p>
              <p className="text-[9px] text-muted-foreground">Alıcıya keseceğiniz fatura toplamı</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-4">
              <Receipt className="h-5 w-5 text-amber-500 mb-2" />
              <p className="text-xl font-bold font-mono text-amber-500">{formatPrice(summary.totalCommission)}</p>
              <p className="text-xs text-muted-foreground">Platform Komisyon Kesintisi</p>
              <p className="text-[9px] text-muted-foreground">KDV dahil</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-4">
              <Calculator className="h-5 w-5 text-muted-foreground mb-2" />
              <p className="text-xl font-bold font-mono">{formatPrice(summary.totalNetCommission)}</p>
              <p className="text-xs text-muted-foreground">Hizmet Faturası Matrah</p>
              <p className="text-[9px] text-muted-foreground">KDV hariç</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-4">
              <FileText className="h-5 w-5 text-muted-foreground mb-2" />
              <p className="text-xl font-bold font-mono">{formatPrice(summary.totalCommissionKDV)}</p>
              <p className="text-xs text-muted-foreground">Hizmet Faturası KDV</p>
              <p className="text-[9px] text-muted-foreground">KDV (lot bazında)</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/5 p-4">
              <Wallet className="h-5 w-5 text-green-500 mb-2" />
              <p className="text-xl font-bold font-mono text-green-500">{formatPrice(summary.sellerPayout)}</p>
              <p className="text-xs text-muted-foreground">Net Elinize Geçen</p>
              <p className="text-[9px] text-muted-foreground">Komisyon düşüldükten sonra</p>
            </motion.div>
          </div>
        )}

        {/* Fatura Özeti Kutuları */}
        {summary && summary.soldLotCount > 0 && (
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {/* Satıcının Alıcıya Keseceği Fatura */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                <h3 className="font-semibold text-sm">Alıcıya Keseceğiniz Ürün Faturası</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fatura Tutarı (KDV dahil)</span>
                  <span className="font-mono font-bold">{formatPrice(summary.totalSales)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Her satılan lot için alıcıya satış fiyatı üzerinden ürün faturası kesmeniz gerekmektedir.
                </p>
              </div>
            </motion.div>

            {/* Platformun Satıcıya Keseceği Fatura */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-xl border border-[#d4af37]/20 bg-card p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-[#d4af37]/10 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-[#d4af37]" />
                </div>
                <h3 className="font-semibold text-sm">Platform Hizmet Faturası (Size Kesilecek)</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Matrah (KDV hariç)</span>
                  <span className="font-mono font-bold">{formatPrice(summary.totalNetCommission)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">KDV</span>
                  <span className="font-mono">{formatPrice(summary.totalCommissionKDV)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="font-semibold">Toplam Fatura Tutarı</span>
                  <span className="font-mono font-bold text-[#d4af37]">{formatPrice(summary.totalCommission)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Platform tarafından size komisyon hizmet bedeli olarak kesilecek fatura tutarıdır.
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Transaction Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-display font-semibold">Satış Detayları</h2>
          </div>
          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Henüz satış verisi bulunmuyor</p>
              <p className="text-xs text-muted-foreground mt-1">Lotlarınız satıldıkça burada cari hesap detaylarınız görünecek</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground bg-muted/30">
                    <th className="p-3">Lot</th>
                    <th className="p-3">Müzayede</th>
                    <th className="p-3">Alıcı</th>
                    <th className="p-3 text-right">Satış Fiyatı</th>
                    <th className="p-3 text-right">Komisyon %</th>
                    <th className="p-3 text-right">Komisyon Kesinti</th>
                    <th className="p-3 text-right">Net Elinize Geçen</th>
                    <th className="p-3 text-center">İşlem Durumu</th>
                    <th className="p-3">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.lotId} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3">
                        <Link href={`/lot/${tx.lotId}`} className="text-[#d4af37] hover:underline">
                          #{tx.lotNumber} {tx.lotTitle}
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">{tx.auctionTitle}</td>
                      <td className="p-3 text-xs">{tx.buyerName}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatPrice(tx.salePrice)}</td>
                      <td className="p-3 text-right font-mono">%{tx.commissionRate}</td>
                      <td className="p-3 text-right font-mono text-amber-500">{formatPrice(tx.grossCommission)}</td>
                      <td className="p-3 text-right font-mono text-green-500 font-bold">{formatPrice(tx.sellerPayout)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 justify-center">
                          <span title="Satıcı Faturası" className={tx.sellerInvoiceIssued ? 'text-blue-400' : 'text-muted-foreground/30'}>
                            {tx.sellerInvoiceIssued ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                          </span>
                          <span title="Platform Faturası" className={tx.platformInvoiceIssued ? 'text-amber-400' : 'text-muted-foreground/30'}>
                            {tx.platformInvoiceIssued ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                          </span>
                          <span title="Alıcı Ödemesi" className={tx.buyerPaymentReceived ? 'text-green-400' : 'text-muted-foreground/30'}>
                            {tx.buyerPaymentReceived ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                          </span>
                          <span title="Satıcı Ödemesi" className={tx.payoutCompleted ? 'text-purple-400' : 'text-muted-foreground/30'}>
                            {tx.payoutCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{formatDate(tx.soldAt)}</td>
                    </tr>
                  ))}
                </tbody>
                {transactions.length > 1 && summary && (
                  <tfoot>
                    <tr className="border-t-2 border-border font-bold bg-muted/20">
                      <td className="p-3" colSpan={3}>TOPLAM</td>
                      <td className="p-3 text-right font-mono">{formatPrice(summary.totalSales)}</td>
                      <td className="p-3"></td>
                      <td className="p-3 text-right font-mono text-amber-500">{formatPrice(summary.totalCommission)}</td>
                      <td className="p-3 text-right font-mono text-green-500">{formatPrice(summary.sellerPayout)}</td>
                      <td className="p-3"></td>
                      <td className="p-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
