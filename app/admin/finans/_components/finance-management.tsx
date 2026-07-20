'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, TrendingUp, Receipt, Building2, ChevronRight,
  DollarSign, Percent, FileText, Loader2, Search,
  Wallet, Calculator, CircleDollarSign, Package,
  CheckCircle2, Circle, MessageSquare, Save,
  AlertCircle, Clock, CreditCard, Send, Filter, Eye,
  AlertTriangle, XCircle, RefreshCw, Ban, User,
  Truck, PackageCheck, X, Banknote, Users,
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
  buyerId: string | null;
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  buyerActive: boolean;
  dueDate: string | null;
  isOverdue: boolean;
  daysOverdue: number;
  commissionRate: number;
  grossCommission: number;
  netCommission: number;
  commissionKDV: number;
  sellerPayout: number;
  paymentId: string | null;
  paymentStatus: string;
  sellerInvoiceIssued: boolean;
  platformInvoiceIssued: boolean;
  buyerPaymentReceived: boolean;
  payoutCompleted: boolean;
  adminNotes: string | null;
  soldAt: string;
  // Kargo bilgileri
  shippingStatus: string;
  trackingNumber: string | null;
  trackingCompany: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  paymentMethod: string | null;
  paidAt: string | null;
  sellerId: string;
  // Hizmet bedeli
  buyerPremiumRate: number;
  buyerPremiumAmount: number;
  buyerPremiumKDV: number;
  buyerTotalAmount: number;
}

interface SellerFinance {
  sellerId: string;
  companyName: string;
  user: { id: string; email: string; fullName: string; phone: string | null };
  status: string;
  summary: {
    totalSales: number;
    totalCommission: number;
    totalNetCommission: number;
    totalCommissionKDV: number;
    soldLotCount: number;
    sellerPayout: number;
    totalBuyerPremium: number;
    totalBuyerPremiumKDV: number;
  };
  transactions: Transaction[];
}

interface PlatformTotals {
  totalSales: number;
  totalCommission: number;
  totalNetCommission: number;
  totalCommissionKDV: number;
  totalSoldLots: number;
  totalBuyerPremium: number;
  totalBuyerPremiumKDV: number;
}

const STAGE_CONFIG = [
  { field: 'sellerInvoiceIssued', label: 'Satıcı Faturası', shortLabel: 'Sat. Fatura', color: 'blue' },
  { field: 'platformInvoiceIssued', label: 'Platform Faturası', shortLabel: 'Plt. Fatura', color: 'amber' },
  { field: 'buyerPaymentReceived', label: 'Alıcı Ödemesi', shortLabel: 'Al. Ödeme', color: 'green' },
  { field: 'payoutCompleted', label: 'Satıcı Ödemesi', shortLabel: 'Sat. Ödeme', color: 'purple' },
] as const;

function StageIndicator({
  stage,
  checked,
  onToggle,
  disabled,
}: {
  stage: typeof STAGE_CONFIG[number];
  checked: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  };
  const colors = colorMap[stage.color] || colorMap.blue;

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
        checked
          ? `${colors.bg} ${colors.border} ${colors.text}`
          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={stage.label}
    >
      {checked ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <Circle className="h-3.5 w-3.5" />
      )}
      <span className="hidden lg:inline">{stage.shortLabel}</span>
    </button>
  );
}

type ViewMode = 'list' | 'sellers' | 'buyers';
type TxFilter = 'awaiting_payment' | 'paid_pending' | 'awaiting_payout' | 'completed' | 'all';

interface FlatTransaction extends Transaction {
  sellerName: string;
  sellerId: string;
}

export function FinanceManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sellers, setSellers] = useState<SellerFinance[]>([]);
  const [totals, setTotals] = useState<PlatformTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<{ paymentId: string; notes: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [txFilter, setTxFilter] = useState<TxFilter>('awaiting_payment');
  const [saleAction, setSaleAction] = useState<{ lotId: string; title: string; action: 'cancel' | 'transfer' } | null>(null);
  const [saleBanBuyer, setSaleBanBuyer] = useState(false);
  const [saleBusy, setSaleBusy] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{ tx: FlatTransaction; type: 'buyer' | 'seller' } | null>(null);

  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated' && user?.role !== 'ADMIN') { router.replace('/panel'); return; }
  }, [status, router, user?.role]);

  useEffect(() => {
    if (status === 'authenticated' && user?.role === 'ADMIN') {
      fetchFinance();
    }
  }, [status, user?.role]);

  const fetchFinance = async () => {
    try {
      const res = await fetch('/api/admin/finance');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSellers(data.sellers ?? []);
      setTotals(data.platformTotals ?? null);
      // Satıcılar ekranından "Finans Detayına Git" ile gelindiyse ilgili satıcıyı aç
      const sellerParam = searchParams?.get('seller');
      if (sellerParam && (data.sellers ?? []).some((s: SellerFinance) => s.sellerId === sellerParam)) {
        router.push(`/admin/finans/satici/${sellerParam}`);
      }
    } catch {
      toast.error('Finans verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const toggleStage = useCallback(async (paymentId: string, field: string, currentValue: boolean, paymentDetails?: any) => {
    if (!paymentId) {
      toast.error('Bu lot için ödeme kaydı bulunamadı');
      return;
    }
    setUpdatingPayment(paymentId);
    try {
      const res = await fetch('/api/admin/finance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, field, value: !currentValue, paymentDetails }),
      });
      if (!res.ok) throw new Error();

      setSellers(prev => prev.map(seller => ({
        ...seller,
        transactions: seller.transactions.map(tx =>
          tx.paymentId === paymentId
            ? { ...tx, [field]: !currentValue }
            : tx
        ),
      })));
      toast.success(getSuccessMsg(field, !currentValue));
    } catch {
      toast.error('Güncellenemedi');
    } finally {
      setUpdatingPayment(null);
    }
  }, []);

  function getSuccessMsg(field: string, value: boolean): string {
    if (field === 'buyerPaymentReceived') return value ? 'Alıcı ödemesi alındı — cari hesaplara işlendi' : 'Ödeme geri alındı';
    if (field === 'payoutCompleted') return value ? 'Satıcıya ödeme yapıldı — cari hesaplara işlendi' : 'Satıcı ödemesi geri alındı';
    return 'İşlem durumu güncellendi';
  }

  const saveNotes = useCallback(async () => {
    if (!editingNotes) return;
    setUpdatingPayment(editingNotes.paymentId);
    try {
      const res = await fetch('/api/admin/finance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: editingNotes.paymentId, adminNotes: editingNotes.notes }),
      });
      if (!res.ok) throw new Error();

      setSellers(prev => prev.map(seller => ({
        ...seller,
        transactions: seller.transactions.map(tx =>
          tx.paymentId === editingNotes.paymentId
            ? { ...tx, adminNotes: editingNotes.notes }
            : tx
        ),
      })));
      toast.success('Not kaydedildi');
      setEditingNotes(null);
    } catch {
      toast.error('Not kaydedilemedi');
    } finally {
      setUpdatingPayment(null);
    }
  }, [editingNotes]);

  const submitSaleAction = async () => {
    if (!saleAction) return;
    setSaleBusy(true);
    try {
      const res = await fetch('/api/admin/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotId: saleAction.lotId, action: saleAction.action, banBuyer: saleBanBuyer }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'İşlem başarısız');
      }
      toast.success(saleAction.action === 'cancel' ? 'Satış iptal edildi' : 'Satış 2. teklife devredildi');
      setSaleAction(null);
      setSaleBanBuyer(false);
      await fetchFinance();
    } catch (e: any) {
      toast.error(e?.message || 'İşlem başarısız');
    } finally {
      setSaleBusy(false);
    }
  };

  // All transactions flat list — MUST be before any conditional return
  const allTransactions = useMemo<FlatTransaction[]>(() => {
    const txs: FlatTransaction[] = [];
    sellers.forEach(seller => {
      seller.transactions.forEach(tx => {
        txs.push({ ...tx, sellerName: seller.companyName, sellerId: seller.sellerId });
      });
    });
    return txs;
  }, [sellers]);

  // Overview counts
  const overviewCounts = useMemo(() => {
    const counts = {
      total: allTransactions.length,
      awaitingPayment: 0,
      paidPending: 0,
      awaitingPayout: 0,
      completed: 0,
      awaitingPaymentAmount: 0,
      awaitingPayoutAmount: 0,
    };
    allTransactions.forEach(tx => {
      const isComplete = tx.sellerInvoiceIssued && tx.platformInvoiceIssued && tx.buyerPaymentReceived && tx.payoutCompleted;
      if (isComplete) {
        counts.completed++;
      } else if (!tx.buyerPaymentReceived) {
        counts.awaitingPayment++;
        counts.awaitingPaymentAmount += (tx.buyerTotalAmount || tx.salePrice);
      } else if (!tx.payoutCompleted) {
        counts.awaitingPayout++;
        counts.awaitingPayoutAmount += tx.sellerPayout;
      } else {
        counts.paidPending++;
      }
    });
    return counts;
  }, [allTransactions]);

  // Nakit akışı: tahsil edilen / bekleyen taraflar
  const cashFlow = useMemo(() => {
    const cf = {
      collectedFromBuyers: 0,   // alıcılardan tahsil edilen (ödemesi alınan satışların tutarı)
      pendingFromBuyers: 0,     // alıcılardan beklenen (ödemesi alınmayan)
      paidToSellers: 0,         // satıcılara ödenen (payout tamamlanan)
      pendingToSellers: 0,      // satıcılara ödenecek (payout bekleyen)
    };
    allTransactions.forEach(tx => {
      if (tx.buyerPaymentReceived) cf.collectedFromBuyers += (tx.buyerTotalAmount || tx.salePrice);
      else cf.pendingFromBuyers += (tx.buyerTotalAmount || tx.salePrice);
      if (tx.payoutCompleted) cf.paidToSellers += tx.sellerPayout;
      else cf.pendingToSellers += tx.sellerPayout;
    });
    return cf;
  }, [allTransactions]);

  // Alıcı bazlı özet — işlemleri alıcıya göre grupla
  const buyersSummary = useMemo(() => {
    const map = new Map<string, {
      buyerId: string;
      buyerName: string | null;
      buyerEmail: string | null;
      buyerPhone: string | null;
      buyerActive: boolean;
      lotCount: number;
      totalPurchases: number;   // toplam alış (satış fiyatı)
      collected: number;        // ödemesi alınan
      pending: number;          // beklenen borç
      hasOverdue: boolean;
    }>();
    allTransactions.forEach(tx => {
      if (!tx.buyerId) return;
      const cur = map.get(tx.buyerId) ?? {
        buyerId: tx.buyerId,
        buyerName: tx.buyerName,
        buyerEmail: tx.buyerEmail,
        buyerPhone: tx.buyerPhone,
        buyerActive: tx.buyerActive,
        lotCount: 0,
        totalPurchases: 0,
        collected: 0,
        pending: 0,
        hasOverdue: false,
      };
      cur.lotCount += 1;
      cur.totalPurchases += (tx.buyerTotalAmount || tx.salePrice);
      if (tx.buyerPaymentReceived) cur.collected += (tx.buyerTotalAmount || tx.salePrice);
      else cur.pending += (tx.buyerTotalAmount || tx.salePrice);
      if (tx.isOverdue) cur.hasOverdue = true;
      map.set(tx.buyerId, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.pending - a.pending || b.totalPurchases - a.totalPurchases);
  }, [allTransactions]);

  const filteredBuyers = useMemo(() => {
    if (!searchQuery.trim()) return buyersSummary;
    const q = searchQuery.toLowerCase();
    return buyersSummary.filter(b =>
      (b.buyerName || '').toLowerCase().includes(q) ||
      (b.buyerEmail || '').toLowerCase().includes(q) ||
      (b.buyerPhone || '').toLowerCase().includes(q)
    );
  }, [buyersSummary, searchQuery]);

  // Filtered transactions for flat list
  const filteredTransactions = useMemo(() => {
    let txs = allTransactions;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      txs = txs.filter(tx => tx.sellerName.toLowerCase().includes(q) || tx.lotTitle.toLowerCase().includes(q) || tx.auctionTitle.toLowerCase().includes(q) || (tx.paymentId && `MZT-${tx.paymentId.slice(-8).toUpperCase()}`.toLowerCase().includes(q)));
    }
    switch (txFilter) {
      case 'awaiting_payment': return txs.filter(tx => !tx.buyerPaymentReceived);
      case 'paid_pending': return txs.filter(tx => tx.buyerPaymentReceived && !(tx.sellerInvoiceIssued && tx.platformInvoiceIssued && tx.payoutCompleted));
      case 'awaiting_payout': return txs.filter(tx => tx.buyerPaymentReceived && !tx.payoutCompleted);
      case 'completed': return txs.filter(tx => tx.sellerInvoiceIssued && tx.platformInvoiceIssued && tx.buyerPaymentReceived && tx.payoutCompleted);
      default: return txs;
    }
  }, [allTransactions, txFilter, searchQuery]);

  if (status === 'loading' || loading) {
    return (
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
            </div>
          </div>

        </div>
      </main>
    );
  }

  const filteredSellers = sellers.filter(s =>
    !searchQuery.trim() ||
    s.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCompletedStages = (tx: Transaction) => {
    let count = 0;
    if (tx.sellerInvoiceIssued) count++;
    if (tx.platformInvoiceIssued) count++;
    if (tx.buyerPaymentReceived) count++;
    if (tx.payoutCompleted) count++;
    return count;
  };

  const FILTER_TABS: { key: TxFilter; label: string; count: number; color: string; activeColor: string }[] = [
    { key: 'awaiting_payment', label: 'Ödeme Bekleyenler', count: overviewCounts.awaitingPayment, color: 'text-red-400', activeColor: 'border-red-500 bg-red-500/10' },
    { key: 'paid_pending', label: 'Ödemesi Yapılanlar', count: overviewCounts.paidPending, color: 'text-amber-400', activeColor: 'border-amber-500 bg-amber-500/10' },
    { key: 'awaiting_payout', label: 'Satıcı Ödemesi Bekleyen', count: overviewCounts.awaitingPayout, color: 'text-purple-400', activeColor: 'border-purple-500 bg-purple-500/10' },
    { key: 'completed', label: 'Tamamlanan', count: overviewCounts.completed, color: 'text-green-400', activeColor: 'border-green-500 bg-green-500/10' },
    { key: 'all', label: 'Tümü', count: overviewCounts.total, color: 'text-muted-foreground', activeColor: 'border-[#d4af37] bg-[#d4af37]/10' },
  ];

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1200px] px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Receipt className="h-6 w-6 text-[#d4af37]" />
          <h1 className="font-display text-2xl font-bold">Cari Hesaplar &amp; Finans</h1>
        </div>

        {/* Platform Totals */}
        {totals && (<>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4">
              <Package className="h-5 w-5 text-[#d4af37] mb-2" />
              <p className="text-xl font-bold font-mono">{totals.totalSoldLots}</p>
              <p className="text-xs text-muted-foreground">Satılan Lot</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-border bg-card p-4">
              <DollarSign className="h-5 w-5 text-[#d4af37] mb-2" />
              <p className="text-xl font-bold font-mono">{formatPrice(totals.totalSales)}</p>
              <p className="text-xs text-muted-foreground">Toplam Satış</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-4">
              <TrendingUp className="h-5 w-5 text-[#d4af37] mb-2" />
              <p className="text-xl font-bold font-mono text-[#d4af37]">{formatPrice(totals.totalCommission)}</p>
              <p className="text-xs text-muted-foreground">Toplam Komisyon (Brüt)</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-4">
              <Calculator className="h-5 w-5 text-[#d4af37] mb-2" />
              <p className="text-xl font-bold font-mono">{formatPrice(totals.totalNetCommission)}</p>
              <p className="text-xs text-muted-foreground">Net Komisyon (KDV Hariç)</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-4">
              <FileText className="h-5 w-5 text-[#d4af37] mb-2" />
              <p className="text-xl font-bold font-mono">{formatPrice(totals.totalCommissionKDV)}</p>
              <p className="text-xs text-muted-foreground">Satıcı Komisyon KDV</p>
            </motion.div>
          </div>

          {/* Hizmet Bedeli Toplamları */}
          {(totals.totalBuyerPremium > 0 || totals.totalBuyerPremiumKDV > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <Users className="h-5 w-5 text-emerald-500 mb-2" />
                <p className="text-xl font-bold font-mono text-emerald-500">{formatPrice(totals.totalBuyerPremium)}</p>
                <p className="text-xs text-muted-foreground">Hizmet Bedeli (Matrah)</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <FileText className="h-5 w-5 text-emerald-500 mb-2" />
                <p className="text-xl font-bold font-mono text-emerald-500">{formatPrice(totals.totalBuyerPremiumKDV)}</p>
                <p className="text-xs text-muted-foreground">Hizmet Bedeli KDV</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/10 p-4">
                <TrendingUp className="h-5 w-5 text-[#d4af37] mb-2" />
                <p className="text-xl font-bold font-mono text-[#d4af37]">{formatPrice(totals.totalCommission + totals.totalBuyerPremium + totals.totalBuyerPremiumKDV)}</p>
                <p className="text-xs text-muted-foreground">Toplam Platform Geliri</p>
              </motion.div>
            </div>
          )}
        </>)}

        {/* Nakit Akışı: Tahsil edilen / Bekleyen */}
        {totals && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CircleDollarSign className="h-5 w-5 text-green-500" />
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">Tahsil edildi</span>
              </div>
              <p className="text-xl font-bold font-mono text-green-500">{formatPrice(cashFlow.collectedFromBuyers)}</p>
              <p className="text-xs text-muted-foreground">Alıcılardan Tahsil Edilen</p>
              <p className="text-[9px] text-muted-foreground">Ödemesi alınan satışlar</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-red-500" />
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">Bekliyor</span>
              </div>
              <p className="text-xl font-bold font-mono text-red-500">{formatPrice(cashFlow.pendingFromBuyers)}</p>
              <p className="text-xs text-muted-foreground">Alıcılardan Beklenen</p>
              <p className="text-[9px] text-muted-foreground">Henüz tahsil edilmedi</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-5 w-5 text-purple-500" />
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">Ödendi</span>
              </div>
              <p className="text-xl font-bold font-mono text-purple-500">{formatPrice(cashFlow.paidToSellers)}</p>
              <p className="text-xs text-muted-foreground">Satıcılara Ödenen</p>
              <p className="text-[9px] text-muted-foreground">Payout tamamlanan</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">Ödenecek</span>
              </div>
              <p className="text-xl font-bold font-mono text-amber-500">{formatPrice(cashFlow.pendingToSellers)}</p>
              <p className="text-xs text-muted-foreground">Satıcılara Ödenecek</p>
              <p className="text-[9px] text-muted-foreground">Payout bekleyen</p>
            </motion.div>
          </div>
        )}

        {/* View Mode Toggle + Search */}
        <div className="flex flex-col gap-3 mb-6">
          {/* Ana mod seçici */}
          <div className="flex items-center gap-3">
            <div className="flex rounded-xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-[#d4af37] text-black' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span>İşlem Listesi</span>
              </button>
              <button
                onClick={() => setViewMode('sellers')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  viewMode === 'sellers' ? 'bg-[#d4af37] text-black' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span>Satıcı Bazlı</span>
              </button>
              <button
                onClick={() => setViewMode('buyers')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  viewMode === 'buyers' ? 'bg-[#d4af37] text-black' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <User className="h-4 w-4" />
                <span>Alıcı Bazlı</span>
              </button>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={viewMode === 'list' ? 'Satıcı, lot, müzayede veya referans kodu ara...' : viewMode === 'sellers' ? 'Satıcı adı veya firma adı ara...' : 'Alıcı adı, e-posta veya telefon ara...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
              />
            </div>
            <Link
              href="/admin/finans/platform"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 text-[#d4af37] hover:bg-[#d4af37]/20 transition-colors shrink-0"
            >
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Platform Ekstresi</span>
            </Link>
          </div>

          {/* Filtre sekmeleri — sadece list modunda */}
          {viewMode === 'list' && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {FILTER_TABS.map((tab) => {
                const isActive = txFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setTxFilter(tab.key)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      isActive
                        ? `${tab.activeColor} ${tab.color} border-current`
                        : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isActive ? 'bg-white/20' : 'bg-muted'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ===== LIST MODE: Filtered Transaction List ===== */}
        {viewMode === 'list' && (
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{txFilter === 'all' ? 'Henüz işlem bulunmuyor' : 'Bu filtreye uygun işlem yok'}</p>
                {txFilter !== 'all' && (
                  <button onClick={() => setTxFilter('all')} className="text-sm text-[#d4af37] hover:underline mt-2">Tüm işlemleri göster</button>
                )}
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const completed = getCompletedStages(tx);
                const progressPercent = (completed / 4) * 100;
                const isEditing = editingNotes?.paymentId === tx.paymentId;

                return (
                  <motion.div
                    key={tx.lotId}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border bg-card p-4 space-y-3"
                  >
                    {/* Top row */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {tx.sellerName}
                          </span>
                          <Link href={`/lot/${tx.lotId}`} className="text-sm font-semibold text-[#d4af37] hover:underline">
                            #{tx.lotNumber} {tx.lotTitle}
                          </Link>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <p className="text-xs text-muted-foreground">{tx.auctionTitle} • {formatDate(tx.soldAt)}</p>
                          {tx.paymentId && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              <CreditCard className="h-2.5 w-2.5" />
                              MZT-{tx.paymentId.slice(-8).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <p className="font-mono font-bold">{formatPrice(tx.salePrice)}</p>
                          <p className="text-[10px] text-muted-foreground">Satış</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold text-[#d4af37]">{formatPrice(tx.grossCommission)}</p>
                          <p className="text-[10px] text-muted-foreground">Sat. Kom.</p>
                        </div>
                        {tx.buyerPremiumAmount > 0 && (
                          <div className="text-right">
                            <p className="font-mono font-bold text-emerald-500">{formatPrice(tx.buyerPremiumAmount + tx.buyerPremiumKDV)}</p>
                            <p className="text-[10px] text-muted-foreground">Al. Kom.</p>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="font-mono font-bold text-green-500">{formatPrice(tx.sellerPayout)}</p>
                          <p className="text-[10px] text-muted-foreground">Satıcıya</p>
                        </div>
                      </div>
                    </div>

                    {/* Buyer info + status */}
                    {(tx.buyerName || tx.buyerEmail) && (
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg bg-muted/30 border border-border px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {tx.buyerId ? (
                                <Link href={`/admin/finans/alici/${tx.buyerId}`} className="text-xs font-semibold truncate text-[#d4af37] hover:underline inline-flex items-center gap-1">
                                  {tx.buyerName || 'İsimsiz alıcı'} <ChevronRight className="h-3 w-3" />
                                </Link>
                              ) : (
                                <span className="text-xs font-semibold truncate">{tx.buyerName || 'İsimsiz alıcı'}</span>
                              )}
                              {!tx.buyerActive && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                                  <Ban className="h-2.5 w-2.5" /> Engelli
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {tx.buyerEmail}{tx.buyerPhone ? ` • ${tx.buyerPhone}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {tx.isOverdue ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                              <AlertTriangle className="h-3 w-3" /> {tx.daysOverdue} gün gecikti
                            </span>
                          ) : !tx.buyerPaymentReceived ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                              Ödeme bekleniyor
                            </span>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Sale intervention buttons (only for unpaid) */}
                    {!tx.buyerPaymentReceived && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => { setSaleBanBuyer(false); setSaleAction({ lotId: tx.lotId, title: tx.lotTitle, action: 'cancel' }); }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-500 px-3 py-1.5 text-xs font-medium hover:bg-red-500/20 transition-colors"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Satışı İptal Et
                        </button>
                        <button
                          onClick={() => { setSaleBanBuyer(false); setSaleAction({ lotId: tx.lotId, title: tx.lotTitle, action: 'transfer' }); }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-500 px-3 py-1.5 text-xs font-medium hover:bg-blue-500/20 transition-colors"
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> 2. Teklife Devret
                        </button>
                      </div>
                    )}

                    {/* Progress bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-amber-500 to-green-500 transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
                        {completed}/4
                      </span>
                    </div>

                    {/* Kargo durumu */}
                    {tx.buyerPaymentReceived && (
                      <div className="flex items-center gap-2 text-xs">
                        <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Kargo:</span>
                        {tx.shippingStatus === 'PREPARING' && <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium">Hazırlanıyor</span>}
                        {tx.shippingStatus === 'SHIPPED' && <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium">Kargoda{tx.trackingNumber ? ` · ${tx.trackingCompany || ''} ${tx.trackingNumber}` : ''}</span>}
                        {tx.shippingStatus === 'DELIVERED' && <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 font-medium">Teslim Edildi{tx.deliveredAt ? ` · ${formatDate(tx.deliveredAt)}` : ''}</span>}
                        {tx.paidAt && <span className="text-muted-foreground ml-2">Ödeme: {formatDate(tx.paidAt)}{tx.paymentMethod ? ` (${tx.paymentMethod})` : ''}</span>}
                      </div>
                    )}

                    {/* Stage toggles */}
                    <div className="flex flex-wrap gap-2">
                      {STAGE_CONFIG.map((stage) => {
                        // buyerPaymentReceived ve payoutCompleted için modal açan buton
                        if (stage.field === 'buyerPaymentReceived' && !tx.buyerPaymentReceived) {
                          return (
                            <button
                              key={stage.field}
                              onClick={() => tx.paymentId && setPaymentModal({ tx, type: 'buyer' })}
                              disabled={!tx.paymentId || updatingPayment === tx.paymentId}
                              className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 text-green-400 px-2.5 py-1.5 text-xs font-medium hover:bg-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Banknote className="h-3.5 w-3.5" />
                              <span>Ödeme Al</span>
                            </button>
                          );
                        }
                        if (stage.field === 'payoutCompleted' && !tx.payoutCompleted && tx.buyerPaymentReceived) {
                          return (
                            <button
                              key={stage.field}
                              onClick={() => tx.paymentId && setPaymentModal({ tx, type: 'seller' })}
                              disabled={!tx.paymentId || updatingPayment === tx.paymentId}
                              className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 px-2.5 py-1.5 text-xs font-medium hover:bg-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>Satıcıya Öde</span>
                            </button>
                          );
                        }
                        return (
                          <StageIndicator
                            key={stage.field}
                            stage={stage}
                            checked={(tx as any)[stage.field]}
                            onToggle={() => tx.paymentId && toggleStage(tx.paymentId, stage.field, (tx as any)[stage.field])}
                            disabled={!tx.paymentId || updatingPayment === tx.paymentId}
                          />
                        );
                      })}
                      <button
                        onClick={() => {
                          if (isEditing) {
                            setEditingNotes(null);
                          } else if (tx.paymentId) {
                            setEditingNotes({ paymentId: tx.paymentId, notes: tx.adminNotes || '' });
                          }
                        }}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                          tx.adminNotes
                            ? 'border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]'
                            : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50'
                        }`}
                        title="Admin notu"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span className="hidden lg:inline">Not</span>
                      </button>
                    </div>

                    {/* Notes editor */}
                    {isEditing && editingNotes && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingNotes.notes}
                          onChange={(e) => setEditingNotes({ ...editingNotes, notes: e.target.value })}
                          placeholder="Admin notu ekleyin..."
                          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
                        />
                        <button
                          onClick={saveNotes}
                          disabled={updatingPayment === editingNotes.paymentId}
                          className="rounded-lg bg-[#d4af37] text-black px-3 py-2 text-sm font-medium hover:bg-[#c4a030] transition-colors disabled:opacity-50"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    {!isEditing && tx.adminNotes && (
                      <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                        📝 {tx.adminNotes}
                      </p>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* ===== SELLERS MODE: Existing Seller-by-Seller View ===== */}
        {viewMode === 'sellers' && (
        <div className="space-y-4">
          {filteredSellers.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Henüz satış verisi bulunmuyor</p>
              <p className="text-xs text-muted-foreground mt-1">Satıcılar lot sattıkça burada cari hesapları görünecek</p>
            </div>
          ) : (
            filteredSellers.map((seller, idx) => {

              return (
                <motion.div
                  key={seller.sellerId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  {/* Seller Header */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => router.push(`/admin/finans/satici/${seller.sellerId}`)}
                  >
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-[#d4af37]/10">
                      <Building2 className="h-6 w-6 text-[#d4af37]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{seller.companyName}</h3>
                      <p className="text-sm text-muted-foreground truncate">{seller.user.fullName} • {seller.user.email}</p>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-mono font-bold text-foreground">{seller.summary.soldLotCount}</p>
                        <p className="text-[11px] text-muted-foreground">Satış</p>
                      </div>
                      <div className="text-center">
                        <p className="font-mono font-bold text-foreground">{formatPrice(seller.summary.totalSales)}</p>
                        <p className="text-[11px] text-muted-foreground">Ciro</p>
                      </div>
                      <div className="text-center">
                        <p className="font-mono font-bold text-[#d4af37]">{formatPrice(seller.summary.totalCommission)}</p>
                        <p className="text-[11px] text-muted-foreground">Komisyon</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#d4af37] text-sm font-semibold shrink-0">
                      <span className="hidden sm:inline">Cari Ekstre</span>
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>

                </motion.div>
              );
            })
          )}
        </div>
        )}

        {/* ===== BUYERS MODE: Alıcı Bazlı Cari Hesaplar ===== */}
        {viewMode === 'buyers' && (
        <div className="space-y-3">
          {filteredBuyers.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Henüz alıcı verisi bulunmuyor</p>
              <p className="text-xs text-muted-foreground mt-1">Alıcılar lot kazandıkça burada cari hesapları görünecek</p>
            </div>
          ) : (
            filteredBuyers.map((buyer, idx) => (
              <motion.div
                key={buyer.buyerId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                onClick={() => router.push(`/admin/finans/alici/${buyer.buyerId}`)}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-[#d4af37]/10 shrink-0">
                  <User className="h-6 w-6 text-[#d4af37]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{buyer.buyerName || 'İsimsiz alıcı'}</h3>
                    {!buyer.buyerActive && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                        <Ban className="h-2.5 w-2.5" /> Engelli
                      </span>
                    )}
                    {buyer.hasOverdue && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                        <AlertTriangle className="h-2.5 w-2.5" /> Gecikmiş ödeme
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {buyer.buyerEmail}{buyer.buyerPhone ? ` • ${buyer.buyerPhone}` : ''}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{buyer.lotCount} kazanılan lot</p>
                </div>
                <div className="hidden md:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-mono font-bold text-foreground">{formatPrice(buyer.totalPurchases)}</p>
                    <p className="text-[11px] text-muted-foreground">Toplam Alış</p>
                  </div>
                  <div className="text-center">
                    <p className="font-mono font-bold text-green-500">{formatPrice(buyer.collected)}</p>
                    <p className="text-[11px] text-muted-foreground">Ödenen</p>
                  </div>
                  <div className="text-center">
                    <p className={`font-mono font-bold ${buyer.pending > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>{formatPrice(buyer.pending)}</p>
                    <p className="text-[11px] text-muted-foreground">Kalan Borç</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[#d4af37] text-sm font-semibold shrink-0">
                  <span className="hidden sm:inline">Cari Ekstre</span>
                  <ChevronRight className="h-5 w-5" />
                </div>
              </motion.div>
            ))
          )}
        </div>
        )}
      </div>

      {/* Payment Form Modal */}
      <AnimatePresence>
        {paymentModal && (
          <PaymentFormModal
            tx={paymentModal.tx}
            type={paymentModal.type}
            onClose={() => setPaymentModal(null)}
            onSubmit={async (details) => {
              const field = paymentModal.type === 'buyer' ? 'buyerPaymentReceived' : 'payoutCompleted';
              await toggleStage(paymentModal.tx.paymentId!, field, false, details);
              setPaymentModal(null);
              // Tüm verileri yeniden yükle
              setTimeout(() => fetchFinance(), 500);
            }}
            isLoading={!!updatingPayment}
          />
        )}
      </AnimatePresence>

      {/* Sale Action Confirm Modal */}
      <AnimatePresence>
        {saleAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
            onClick={() => !saleBusy && setSaleAction(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${saleAction.action === 'cancel' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {saleAction.action === 'cancel' ? <XCircle className="h-6 w-6" /> : <RefreshCw className="h-6 w-6" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {saleAction.action === 'cancel' ? 'Satışı iptal et' : '2. teklife devret'}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{saleAction.title}</span>
                    {saleAction.action === 'cancel'
                      ? ' lotunun satışını iptal etmek üzeresiniz. Lot satılmamış duruma dönecek ve bekleyen ödeme kaydı silinecek.'
                      : ' lotu bir sonraki en yüksek teklifi veren alıcıya devredilecek. Yeni alıcı için ödeme kaydı oluşturulacak ve bilgilendirme gönderilecek.'}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Bu işlem geri alınamaz. Lütfen alıcıyla iletişime geçtikten sonra onaylayın.
                </p>
              </div>

              <label className="mt-4 flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saleBanBuyer}
                  onChange={(e) => setSaleBanBuyer(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-[#d4af37]"
                />
                <span className="text-sm text-muted-foreground">Alıcıyı da engelle (giriş yapamaz)</span>
              </label>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => { setSaleAction(null); setSaleBanBuyer(false); }}
                  disabled={saleBusy}
                  className="flex-1 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  Vazgeç
                </button>
                <button
                  onClick={submitSaleAction}
                  disabled={saleBusy}
                  className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${saleAction.action === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {saleBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : (saleAction.action === 'cancel' ? <XCircle className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />)}
                  {saleAction.action === 'cancel' ? 'Satışı iptal et' : 'Devret'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}

// ===== ÖDEME FORMU MODAL =====
function PaymentFormModal({
  tx, type, onClose, onSubmit, isLoading,
}: {
  tx: FlatTransaction;
  type: 'buyer' | 'seller';
  onClose: () => void;
  onSubmit: (details: { paymentMethod: string; bankName: string; paymentDate: string; note: string }) => void;
  isLoading: boolean;
}) {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [bankName, setBankName] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');

  const isBuyer = type === 'buyer';
  const title = isBuyer ? 'Alıcı Ödemesi Al' : 'Satıcıya Ödeme Yap';
  const amount = isBuyer ? (tx.buyerTotalAmount || tx.salePrice) : tx.sellerPayout;
  const subtitle = isBuyer
    ? `${tx.buyerName || 'Alıcı'} — ${tx.lotTitle}`
    : `${tx.sellerName} — ${tx.lotTitle}`;

  const handleSubmit = () => {
    if (!paymentMethod) { toast.error('Ödeme yöntemi seçiniz'); return; }
    onSubmit({ paymentMethod, bankName, paymentDate, note });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={() => !isLoading && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isBuyer ? 'bg-green-500/10 text-green-500' : 'bg-purple-500/10 text-purple-500'}`}>
              {isBuyer ? <Banknote className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground truncate max-w-[250px]">{subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isLoading} className="p-1 hover:bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tutar */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 mb-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">{isBuyer ? 'Tahsil Edilecek Tutar' : 'Satıcıya Ödenecek Tutar'}</p>
          <p className={`text-2xl font-bold font-mono ${isBuyer ? 'text-green-500' : 'text-purple-500'}`}>{formatPrice(amount)}</p>
          {isBuyer && tx.buyerPremiumAmount > 0 && (
            <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
              <p>Çekiç: {formatPrice(tx.salePrice)} + Komisyon: {formatPrice(tx.buyerPremiumAmount)} + KDV: {formatPrice(tx.buyerPremiumKDV)}</p>
            </div>
          )}
          {!isBuyer && (
            <p className="text-[11px] text-muted-foreground mt-1">
              Satış: {formatPrice(tx.salePrice)} — Komisyon: {formatPrice(tx.grossCommission)}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {/* Ödeme Yöntemi */}
          <div>
            <label className="text-xs text-muted-foreground font-medium">Ödeme Yöntemi *</label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {['Havale', 'EFT', 'Elden', 'Kredi Kartı'].map(m => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    paymentMethod === m
                      ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37]'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Banka ve Tarih */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground font-medium">Banka</label>
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ör: Ziraat"
                className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium">Tarih</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
              />
            </div>
          </div>

          {/* Not */}
          <div>
            <label className="text-xs text-muted-foreground font-medium">Not / Açıklama</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={isBuyer ? 'Ör: Havale ile tam ödeme alındı' : 'Ör: EFT ile satıcıya gönderildi'}
              className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
            />
          </div>
        </div>

        {/* Bilgi notu */}
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-400">
            {isBuyer
              ? 'Bu işlem alıcının ve satıcının cari hesabına otomatik olarak kaydedilecek.'
              : 'Bu işlem satıcının cari hesabına otomatik olarak kaydedilecek.'}
          </p>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-black transition-colors disabled:opacity-60 ${
              isBuyer ? 'bg-green-500 hover:bg-green-600' : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isBuyer ? <Banknote className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {isBuyer ? 'Ödemeyi Onayla' : 'Ödemeyi Gönder'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}