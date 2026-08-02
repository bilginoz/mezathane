'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Ticket, Plus, Loader2, Copy, Clock, CheckCircle2, XCircle, Hourglass, Banknote } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';

interface Purchase {
  id: string;
  planType?: 'PER_AUCTION' | 'UNLIMITED_MONTHLY';
  quantity: number;
  unitPrice: number;
  kdvAmount?: number;
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remaining: number;
  expiresAt: string | null;
  adminNote: string | null;
  paymentReportedAt: string | null;
  createdAt: string;
}

export function AuctionRightsContent() {
  const { status } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [planType, setPlanType] = useState<'PER_AUCTION' | 'UNLIMITED_MONTHLY'>('PER_AUCTION');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justCreated, setJustCreated] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState<string | null>(null);

  // Onaylı Müzayede Hakkı satın alması için ödeme özeti (makbuz) PDF'i indir.
  // Not: bu bir vergi faturası değildir — DIRECT modda platform ürün satışından fatura kesmez.
  const downloadReceipt = async (purchaseId: string) => {
    setDownloadingReceipt(purchaseId);
    try {
      const res = await fetch('/api/seller/auction-rights/receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d?.error ?? 'Özet oluşturulamadı'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `muzayede-hakki-ozeti-${purchaseId.slice(-6).toUpperCase()}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Özet indirilemedi');
    } finally {
      setDownloadingReceipt(null);
    }
  };

  const reportPayment = async (purchaseId: string) => {
    setReporting(purchaseId);
    try {
      const res = await fetch('/api/seller/auction-rights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'report_payment', purchaseId }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d?.error ?? 'İşlem başarısız'); return; }
      toast.success('Ödeme bildiriminiz alındı — admin en kısa sürede onaylayacak');
      fetchData();
    } catch {
      toast.error('İşlem başarısız');
    } finally {
      setReporting(null);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/seller/auction-rights');
      if (res.status === 403) { router.replace('/satici-basvuru'); return; }
      const d = await res.json();
      setData(d);
    } catch {
      toast.error('Bilgiler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated') fetchData();
  }, [status, router]);

  const unitPrice = data?.unitPrice ?? 1900;
  const validityDays = data?.validityDays ?? 60;
  const maxQty = data?.maxQty ?? 100;
  const total = qty * unitPrice;

  const unlimitedPrice = data?.unlimitedPrice ?? 35000;
  const unlimitedKdvRate = data?.unlimitedKdvRate ?? 0.20;
  const unlimitedKdv = Math.round(unlimitedPrice * unlimitedKdvRate * 100) / 100;
  const unlimitedTotal = unlimitedPrice + unlimitedKdv;
  const unlimitedDays = data?.unlimitedDays ?? 30;
  const unlimitedActive = !!data?.unlimitedActive;
  const unlimitedExpiresAt = data?.unlimitedExpiresAt ? new Date(data.unlimitedExpiresAt) : null;
  const hasPendingUnlimited = (data?.purchases ?? []).some((p: Purchase) => p.planType === 'UNLIMITED_MONTHLY' && p.status === 'PENDING');

  const submit = async () => {
    if (planType === 'PER_AUCTION' && (qty < 1 || qty > maxQty)) {
      toast.error(`Adet 1 ile ${maxQty} arasında olmalı`); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/seller/auction-rights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          planType === 'UNLIMITED_MONTHLY'
            ? { planType, sellerNote: note || null }
            : { planType, quantity: qty, sellerNote: note || null }
        ),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Talep oluşturulamadı'); return; }
      toast.success('Talep oluşturuldu — havale sonrası admin onaylayacak');
      setJustCreated(true);
      setNote('');
      fetchData();
    } catch {
      toast.error('Talep oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} kopyalandı`);
  };

  if (loading) {
    return <main className="flex-1 flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" /></main>;
  }

  const bank = data?.bankInfo;
  const purchases: Purchase[] = data?.purchases ?? [];
  const balance = data?.balance ?? 0;
  const soonest = data?.soonestExpiry ? new Date(data.soonestExpiry) : null;

  const statusBadge = (s: Purchase['status']) => {
    if (s === 'APPROVED') return <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 text-green-500 px-2.5 py-0.5 text-xs font-medium"><CheckCircle2 className="h-3 w-3" /> Onaylandı</span>;
    if (s === 'REJECTED') return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 text-red-500 px-2.5 py-0.5 text-xs font-medium"><XCircle className="h-3 w-3" /> Reddedildi</span>;
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-500 px-2.5 py-0.5 text-xs font-medium"><Hourglass className="h-3 w-3" /> Onay bekliyor</span>;
  };

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[900px] px-4">
        <div className="mb-4">
          <Link href="/satici" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Satıcı Paneli</Link>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-full bg-[#d4af37]/10 p-3"><Ticket className="h-6 w-6 text-[#d4af37]" /></div>
          <div>
            <h1 className="font-display text-2xl font-bold">Müzayede Haklarım</h1>
            <p className="text-sm text-muted-foreground">Müzayede açmak için hak satın alın. 1 hak = 1 müzayede.</p>
          </div>
        </div>

        {/* Bakiye */}
        {unlimitedActive ? (
          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aylık Sınırsız Paketiniz aktif</p>
                <p className="text-2xl font-bold text-green-500">Sınırsız müzayede açabilirsiniz</p>
              </div>
              <Ticket className="h-10 w-10 text-green-500/40" />
            </div>
            {unlimitedExpiresAt && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDate(unlimitedExpiresAt.toISOString())} tarihine kadar geçerli</p>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kullanılabilir hakkınız</p>
                <p className="text-3xl font-bold text-[#d4af37]">{balance}</p>
              </div>
              <Ticket className="h-10 w-10 text-[#d4af37]/40" />
            </div>
            {balance > 0 && soonest && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Clock className="h-3 w-3" /> En yakın {formatDate(soonest.toISOString())} tarihinde doluyor</p>
            )}
            {balance === 0 && (
              <p className="text-xs text-amber-500 mt-2">Hakkınız yok — müzayede açmak için aşağıdan hak satın alın.</p>
            )}
          </div>
        )}

        {/* Satın alma */}
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-[#d4af37]" /> Hak Satın Al</h2>

          {/* Plan seçimi */}
          <div className="flex gap-2 mb-4">
            <button
              type="button" onClick={() => setPlanType('PER_AUCTION')}
              className={`flex-1 rounded-lg border px-4 py-3 text-left transition-colors ${planType === 'PER_AUCTION' ? 'border-[#d4af37] bg-[#d4af37]/10' : 'border-border hover:bg-muted/50'}`}
            >
              <span className="block text-sm font-semibold">Tek Tek Müzayede Hakkı</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{formatPrice(unitPrice)} / müzayede · {validityDays} gün geçerli</span>
            </button>
            <button
              type="button" onClick={() => setPlanType('UNLIMITED_MONTHLY')}
              disabled={unlimitedActive || hasPendingUnlimited}
              className={`flex-1 rounded-lg border px-4 py-3 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${planType === 'UNLIMITED_MONTHLY' ? 'border-[#d4af37] bg-[#d4af37]/10' : 'border-border hover:bg-muted/50'}`}
            >
              <span className="block text-sm font-semibold">Aylık Sınırsız Paket</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{formatPrice(unlimitedTotal)} (KDV dahil) / {unlimitedDays} gün</span>
            </button>
          </div>

          {planType === 'PER_AUCTION' ? (
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Adet</label>
                <input
                  type="number" min={1} max={maxQty} value={qty}
                  onChange={e => setQty(Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1)))}
                  className="w-24 rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="block">Birim: {formatPrice(unitPrice)}</span>
                <span className="block font-semibold text-foreground text-base">Toplam: {formatPrice(total)}</span>
              </div>
              <button
                onClick={submit} disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] text-black font-medium px-4 py-2 text-sm hover:bg-[#c9a431] transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Talep Oluştur
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-4">
              <div className="text-sm text-muted-foreground">
                <span className="block">Fiyat: {formatPrice(unlimitedPrice)} + KDV (%20) {formatPrice(unlimitedKdv)}</span>
                <span className="block font-semibold text-foreground text-base">Toplam: {formatPrice(unlimitedTotal)}</span>
                <span className="block text-xs mt-0.5">{unlimitedDays} gün boyunca sınırsız müzayede açma hakkı</span>
              </div>
              <button
                onClick={submit} disabled={submitting || unlimitedActive || hasPendingUnlimited}
                className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] text-black font-medium px-4 py-2 text-sm hover:bg-[#c9a431] transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Talep Oluştur
              </button>
              {hasPendingUnlimited && <span className="text-xs text-amber-500">Zaten bekleyen bir talebiniz var.</span>}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            {planType === 'PER_AUCTION'
              ? <>Satın alınan haklar onaydan sonra <b>{validityDays} gün</b> geçerlidir.</>
              : <>Sınırsız paket onaydan sonra <b>{unlimitedDays} gün</b> boyunca hak düşürmeden müzayede açmanızı sağlar.</>}
            {' '}Talebi oluşturduktan sonra aşağıdaki hesaba havale yapın; ödemeniz görülünce admin onaylar.
          </p>
        </div>

        {/* Havale bilgileri */}
        {(justCreated || purchases.some(p => p.status === 'PENDING')) && bank?.bankIban && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5 mb-6">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Banknote className="h-4 w-4 text-blue-400" /> Havale Bilgileri</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Banka</span><span className="font-medium">{bank.bankName || '-'}</span></div>
              <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Hesap Sahibi</span><span className="font-medium text-right">{bank.bankAccountHolder || '-'}</span></div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">IBAN</span>
                <span className="font-mono text-xs flex items-center gap-2">{bank.bankIban}
                  <button onClick={() => copy(bank.bankIban, 'IBAN')} className="text-blue-400 hover:text-blue-300"><Copy className="h-3.5 w-3.5" /></button>
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Havale açıklamasına <b>firma adınızı</b> yazın ki ödemeniz eşleştirilebilsin.</p>
          </div>
        )}

        {/* Geçmiş */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold mb-3">Taleplerim</h2>
          {purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz hak talebiniz yok.</p>
          ) : (
            <div className="space-y-2">
              {purchases.map(p => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{p.planType === 'UNLIMITED_MONTHLY' ? 'Aylık Sınırsız Paket' : `${p.quantity} hak`}</span>
                    <span className="text-sm text-muted-foreground">{formatPrice(p.totalAmount)}{(p.kdvAmount ?? 0) > 0 ? ' (KDV dahil)' : ''}</span>
                    {p.status === 'APPROVED' && (
                      p.planType === 'UNLIMITED_MONTHLY'
                        ? <span className="text-xs text-muted-foreground">{p.expiresAt ? `· ${formatDate(p.expiresAt)} tarihine kadar` : ''}</span>
                        : <span className="text-xs text-muted-foreground">· kalan {p.remaining}{p.expiresAt ? ` · ${formatDate(p.expiresAt)} son` : ''}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</span>
                    {statusBadge(p.status)}
                  </div>
                  {p.status === 'REJECTED' && p.adminNote && (
                    <p className="w-full text-xs text-red-400">Sebep: {p.adminNote}</p>
                  )}
                  {p.status === 'APPROVED' && (
                    <button
                      onClick={() => downloadReceipt(p.id)}
                      disabled={downloadingReceipt === p.id}
                      className="flex items-center gap-1.5 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/5 px-3 py-1.5 text-xs font-medium text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors disabled:opacity-50"
                    >
                      {downloadingReceipt === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Banknote className="h-3 w-3" />}
                      {downloadingReceipt === p.id ? 'Oluşturuluyor...' : 'Ödeme Özeti (PDF)'}
                    </button>
                  )}
                  {p.status === 'PENDING' && (
                    <div className="w-full">
                      {p.paymentReportedAt ? (
                        <p className="text-xs text-green-500">✓ Ödeme bildiriminiz alındı ({formatDate(p.paymentReportedAt)}) — admin onayı bekleniyor.</p>
                      ) : (
                        <button
                          onClick={() => reportPayment(p.id)}
                          disabled={reporting === p.id}
                          className="rounded-lg bg-[#d4af37] text-black px-3 py-1.5 text-xs font-semibold hover:brightness-110 transition-all disabled:opacity-50"
                        >
                          {reporting === p.id ? 'Gönderiliyor...' : 'Ödemeyi Yaptım'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
