'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Wallet, CheckCircle2, Clock, AlertTriangle,
  ShoppingBag, Loader2, CreditCard, ArrowRight, FileText,
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

interface FinanceItem {
  paymentId: string;
  lotId: string | null;
  lotNumber: number | null;
  lotTitle: string;
  lotImage: string | null;
  auctionTitle: string;
  sellerName: string;
  amount: number;
  status: string;
  isPaid: boolean;
  isOverdue: boolean;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface Summary {
  totalCount: number;
  paidCount: number;
  pendingCount: number;
  totalPurchased: number;
  totalPaid: number;
  pendingDebt: number;
  overdueAmount: number;
  overdueCount: number;
}

export function BuyerAccount() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<FinanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated') fetchFinance();
  }, [status, router]);

  const fetchFinance = async () => {
    try {
      const res = await fetch('/api/buyer/finance');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSummary(data.summary ?? null);
      setItems(data.items ?? []);
    } catch {
      toast.error('Hesap özeti yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
        </main>
        <Footer />
      </div>
    );
  }

  const s = summary;

  const statusBadge = (it: FinanceItem) => {
    if (it.isPaid) return { icon: CheckCircle2, label: 'Ödendi', color: 'bg-green-500/20 text-green-400' };
    if (it.isOverdue) return { icon: AlertTriangle, label: 'Gecikmiş', color: 'bg-amber-500/20 text-amber-400' };
    return { icon: Clock, label: 'Ödeme Bekleniyor', color: 'bg-red-500/20 text-red-400' };
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-[1100px] px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-3">
                <button onClick={() => router.push('/panel')} className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></button>
                <h1 className="font-display text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6 text-[#d4af37]" /> Hesap Özetim</h1>
              </div>
              <button onClick={() => router.push('/panel/hesabim/ekstre')} className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] text-black px-4 py-2 text-sm font-semibold hover:brightness-110 transition-all shrink-0"><FileText className="h-4 w-4" /> <span className="hidden sm:inline">Cari Ekstrem</span></button>
            </div>
            <p className="text-sm text-muted-foreground mt-1 ml-12">Alışverişleriniz, ödemeleriniz ve bekleyen borçlarınızı buradan takip edin. Detaylı hesap hareketleri için <b>Cari Ekstrem</b>'e bakın.</p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2"><ShoppingBag className="h-4 w-4 text-blue-400" /><p className="text-xs text-muted-foreground">Toplam Alışveriş</p></div>
              <p className="text-xl font-bold font-mono">{formatPrice(s?.totalPurchased ?? 0)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{s?.totalCount ?? 0} ürün</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
              <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="h-4 w-4 text-green-400" /><p className="text-xs text-muted-foreground">Ödenen</p></div>
              <p className="text-xl font-bold font-mono text-green-400">{formatPrice(s?.totalPaid ?? 0)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{s?.paidCount ?? 0} ödeme</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-red-400" /><p className="text-xs text-muted-foreground">Bekleyen Borç</p></div>
              <p className="text-xl font-bold font-mono text-red-400">{formatPrice(s?.pendingDebt ?? 0)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{s?.pendingCount ?? 0} ödeme bekliyor</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-amber-400" /><p className="text-xs text-muted-foreground">Gecikmiş</p></div>
              <p className="text-xl font-bold font-mono text-amber-400">{formatPrice(s?.overdueAmount ?? 0)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{s?.overdueCount ?? 0} gecikmiş ödeme</p>
            </motion.div>
          </div>

          {/* Pending debt notice */}
          {(s?.pendingDebt ?? 0) > 0 && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Ödemesi bekleyen ürünleriniz var</p>
                <p className="text-xs text-muted-foreground mt-0.5">Toplam {formatPrice(s?.pendingDebt ?? 0)} tutarında ödemeniz bulunuyor. Siparişlerim sayfasından ödeme yapabilirsiniz.</p>
              </div>
              <Link href="/panel/siparislerim" className="inline-flex items-center gap-1.5 rounded-lg bg-[#d4af37] text-black px-3 py-2 text-xs font-medium hover:bg-[#c4a030] transition-colors flex-shrink-0">
                Ödeme Yap <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {/* Items list */}
          <div className="rounded-xl border border-border bg-card">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#d4af37]" />
              <h2 className="font-display font-semibold">Alışveriş Geçmişi</h2>
            </div>
            {items.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Henüz bir alışverişiniz yok</p>
                <Link href="/muzayedeler" className="inline-block mt-3 text-sm text-[#d4af37] hover:underline">Müzayedeleri keşfedin</Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {items.map((it) => {
                  const badge = statusBadge(it);
                  const BadgeIcon = badge.icon;
                  return (
                    <div key={it.paymentId} className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <Image
                          src={it.lotImage ?? 'https://cdn.abacus.ai/images/46235948-79f3-4f4e-aab0-cdfd81b98b42.png'}
                          alt={it.lotTitle} fill className="object-cover" sizes="56px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{it.lotTitle}</p>
                        <p className="text-xs text-muted-foreground truncate">{it.auctionTitle}{it.sellerName ? ` • ${it.sellerName}` : ''}</p>
                        {it.dueDate && !it.isPaid && (
                          <p className={`text-[11px] mt-0.5 ${it.isOverdue ? 'text-amber-400' : 'text-muted-foreground'}`}>Son ödeme: {formatDate(it.dueDate)}</p>
                        )}
                        {it.isPaid && it.paidAt && (
                          <p className="text-[11px] mt-0.5 text-muted-foreground">Ödendi: {formatDate(it.paidAt)}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold font-mono text-[#d4af37]">{formatPrice(it.amount)}</p>
                        <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.color}`}>
                          <BadgeIcon className="h-3 w-3" /> {badge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
