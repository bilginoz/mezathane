'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Ticket, Loader2, CheckCircle2, XCircle, Hourglass, Gift, Search } from 'lucide-react';
import { formatPrice, formatDateTime } from '@/lib/utils';

interface Purchase {
  id: string;
  planType?: 'PER_AUCTION' | 'UNLIMITED_MONTHLY';
  quantity: number;
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remaining: number;
  isTrial?: boolean;
  expiresAt: string | null;
  sellerNote: string | null;
  adminNote: string | null;
  paymentReportedAt: string | null;
  createdAt: string;
  seller: { id: string; companyName: string; user: { fullName: string; email: string } };
}

export function AuctionRightsManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const user = session?.user as any;
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [busy, setBusy] = useState<string | null>(null);

  // Hediye hak verme formu
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftQuery, setGiftQuery] = useState('');
  const [giftResults, setGiftResults] = useState<{ id: string; companyName: string; user: { fullName: string; email: string } }[]>([]);
  const [giftSeller, setGiftSeller] = useState<{ id: string; companyName: string; email: string } | null>(null);
  const [giftQty, setGiftQty] = useState('1');
  const [giftDays, setGiftDays] = useState('60');
  const [giftNote, setGiftNote] = useState('');
  const [giftBusy, setGiftBusy] = useState(false);
  const [giftSearching, setGiftSearching] = useState(false);

  const searchSellers = async () => {
    const q = giftQuery.trim();
    if (q.length < 2) { toast.error('En az 2 harf yazın'); return; }
    setGiftSearching(true);
    try {
      const res = await fetch(`/api/admin/sellers?status=APPROVED&search=${encodeURIComponent(q)}`);
      const d = await res.json();
      const list = (d?.sellers ?? []).map((s: any) => ({ id: s.id, companyName: s.companyName, user: { fullName: s.user?.fullName, email: s.user?.email } }));
      setGiftResults(list);
      if (list.length === 0) toast.info('Onaylı satıcı bulunamadı');
    } catch {
      toast.error('Arama başarısız');
    } finally {
      setGiftSearching(false);
    }
  };

  const submitGift = async () => {
    if (!giftSeller) { toast.error('Satıcı seçin'); return; }
    const qty = Number(giftQty), days = Number(giftDays);
    if (!Number.isInteger(qty) || qty < 1) { toast.error('Geçerli bir adet girin'); return; }
    if (!Number.isInteger(days) || days < 1) { toast.error('Geçerli bir gün girin'); return; }
    setGiftBusy(true);
    try {
      const res = await fetch('/api/admin/auction-rights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId: giftSeller.id, quantity: qty, days, adminNote: giftNote.trim() || undefined }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'İşlem başarısız'); return; }
      toast.success(`${giftSeller.companyName} → ${qty} hediye hak tanımlandı`);
      setGiftOpen(false);
      setGiftSeller(null); setGiftQuery(''); setGiftResults([]); setGiftQty('1'); setGiftDays('60'); setGiftNote('');
      fetchData(filter);
    } catch {
      toast.error('İşlem başarısız');
    } finally {
      setGiftBusy(false);
    }
  };

  const fetchData = async (f: 'PENDING' | 'ALL') => {
    setLoading(true);
    try {
      const url = f === 'PENDING' ? '/api/admin/auction-rights?status=PENDING' : '/api/admin/auction-rights';
      const res = await fetch(url);
      const d = await res.json();
      setPurchases(d?.purchases ?? []);
      setPendingCount(d?.pendingCount ?? 0);
    } catch {
      toast.error('Yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated' && user?.role !== 'ADMIN') { router.replace('/panel'); return; }
    if (status === 'authenticated') fetchData(filter);
  }, [status, router, user?.role, filter]);

  const act = async (id: string, action: 'approve' | 'reject') => {
    let adminNote: string | undefined;
    if (action === 'reject') {
      adminNote = window.prompt('Ret sebebi (satıcıya gösterilir, isteğe bağlı):') || undefined;
    }
    setBusy(id);
    try {
      const res = await fetch('/api/admin/auction-rights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, adminNote }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'İşlem başarısız'); return; }
      toast.success(action === 'approve' ? 'Onaylandı, haklar yüklendi' : 'Reddedildi');
      fetchData(filter);
    } catch {
      toast.error('İşlem başarısız');
    } finally {
      setBusy(null);
    }
  };

  const statusBadge = (s: Purchase['status']) => {
    if (s === 'APPROVED') return <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 text-green-500 px-2.5 py-0.5 text-xs font-medium"><CheckCircle2 className="h-3 w-3" /> Onaylandı</span>;
    if (s === 'REJECTED') return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 text-red-500 px-2.5 py-0.5 text-xs font-medium"><XCircle className="h-3 w-3" /> Reddedildi</span>;
    return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-500 px-2.5 py-0.5 text-xs font-medium"><Hourglass className="h-3 w-3" /> Bekliyor</span>;
  };

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1000px] px-4">
        <div className="mb-4">
          <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Admin Paneli</Link>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-full bg-[#d4af37]/10 p-3"><Ticket className="h-6 w-6 text-[#d4af37]" /></div>
          <div>
            <h1 className="font-display text-2xl font-bold">Müzayede Hakkı Talepleri</h1>
            <p className="text-sm text-muted-foreground">Satıcıların hak satın alma taleplerini onaylayın (havale geldiyse).</p>
          </div>
        </div>

        {/* Hediye hak ver */}
        <div className="mb-4">
          <button onClick={() => setGiftOpen(o => !o)} className="inline-flex items-center gap-2 rounded-lg border border-[#d4af37]/50 bg-[#d4af37]/10 text-[#d4af37] px-3 py-1.5 text-sm font-medium hover:bg-[#d4af37]/20">
            <Gift className="h-4 w-4" /> {giftOpen ? 'Hediye Hak Formunu Kapat' : 'Hediye Hak Ver'}
          </button>

          {giftOpen && (
            <div className="mt-3 rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/5 p-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Bir satıcıya <strong className="text-foreground">ücretsiz</strong> müzayede hakkı tanımlayın (0 TL, anında aktif).
                Örn. sadık satıcıyı ödüllendirmek veya sorun yaşayan satıcıyı telafi etmek için.
              </p>

              {/* Satıcı arama */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={giftQuery}
                    onChange={e => setGiftQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchSellers(); } }}
                    placeholder="Firma adı, isim veya e-posta ile ara…"
                    className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none"
                  />
                </div>
                <button onClick={searchSellers} disabled={giftSearching} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50">
                  {giftSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ara'}
                </button>
              </div>

              {/* Arama sonuçları */}
              {giftResults.length > 0 && !giftSeller && (
                <div className="rounded-lg border border-border divide-y divide-border max-h-52 overflow-auto">
                  {giftResults.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setGiftSeller({ id: s.id, companyName: s.companyName || s.user.fullName, email: s.user.email }); setGiftResults([]); }}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                    >
                      <span className="font-medium">{s.companyName || s.user.fullName}</span>
                      <span className="text-muted-foreground"> · {s.user.email}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Seçilen satıcı + adet/gün/not */}
              {giftSeller && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-background border border-border px-3 py-2">
                    <span className="text-sm"><b>{giftSeller.companyName}</b> · {giftSeller.email}</span>
                    <button onClick={() => setGiftSeller(null)} className="text-xs text-muted-foreground hover:text-foreground">Değiştir</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Adet (hak)</label>
                      <input type="number" min={1} value={giftQty} onChange={e => setGiftQty(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Geçerlilik (gün)</label>
                      <input type="number" min={1} value={giftDays} onChange={e => setGiftDays(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Not (isteğe bağlı, satıcı görmez — kayıt için)</label>
                    <input value={giftNote} onChange={e => setGiftNote(e.target.value)} placeholder="Örn. sadakat ödülü" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
                  </div>
                  <button onClick={submitGift} disabled={giftBusy} className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] text-black px-4 py-2 text-sm font-semibold hover:bg-[#c9a430] disabled:opacity-50">
                    {giftBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />} Hediye Ver
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setFilter('PENDING')} className={`rounded-lg px-3 py-1.5 text-sm ${filter === 'PENDING' ? 'bg-[#d4af37] text-black font-medium' : 'border border-border text-muted-foreground hover:bg-muted'}`}>Bekleyenler{pendingCount > 0 ? ` (${pendingCount})` : ''}</button>
          <button onClick={() => setFilter('ALL')} className={`rounded-lg px-3 py-1.5 text-sm ${filter === 'ALL' ? 'bg-[#d4af37] text-black font-medium' : 'border border-border text-muted-foreground hover:bg-muted'}`}>Hepsi</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" /></div>
        ) : purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground py-10 text-center">Kayıt yok.</p>
        ) : (
          <div className="space-y-3">
            {purchases.map(p => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{p.seller?.companyName || p.seller?.user?.fullName || 'Satıcı'}</span>
                      {statusBadge(p.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{p.seller?.user?.email}</p>
                    <p className="text-sm mt-1">
                      <b>{p.planType === 'UNLIMITED_MONTHLY' ? '🔁 Aylık Sınırsız Paket' : `${p.quantity} hak`}</b>
                      {' '}· {p.totalAmount > 0
                        ? `${formatPrice(p.totalAmount)} + KDV`
                        : (p.isTrial ? '🎁 Ücretsiz (deneme)' : '🎁 Ücretsiz (hediye)')}
                      {' '}· {formatDateTime(p.createdAt)}
                    </p>
                    {p.status === 'APPROVED' && <p className="text-xs text-muted-foreground mt-1">Kalan: {p.remaining}{p.expiresAt ? ` · Son: ${formatDateTime(p.expiresAt)}` : ''}</p>}
                    {p.sellerNote && <p className="text-xs text-muted-foreground mt-1">Satıcı notu: {p.sellerNote}</p>}
                    {p.status === 'PENDING' && p.paymentReportedAt && (
                      <p className="text-xs text-green-500 mt-1 font-medium">💳 Satıcı ödemeyi yaptığını bildirdi ({formatDateTime(p.paymentReportedAt)}) — hesabı kontrol edip onaylayın.</p>
                    )}
                    {p.adminNote && <p className="text-xs text-muted-foreground mt-1">Admin notu: {p.adminNote}</p>}
                  </div>
                  {p.status === 'PENDING' && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => act(p.id, 'approve')} disabled={busy === p.id} className="inline-flex items-center gap-1 rounded-lg bg-green-500 text-white px-3 py-1.5 text-sm font-medium hover:bg-green-600 disabled:opacity-50">
                        {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Onayla
                      </button>
                      <button onClick={() => act(p.id, 'reject')} disabled={busy === p.id} className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 text-red-500 px-3 py-1.5 text-sm font-medium hover:bg-red-500/10 disabled:opacity-50">
                        <XCircle className="h-4 w-4" /> Reddet
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
