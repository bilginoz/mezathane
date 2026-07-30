'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Ticket, Loader2, CheckCircle2, XCircle, Hourglass } from 'lucide-react';
import { formatPrice, formatDateTime } from '@/lib/utils';

interface Purchase {
  id: string;
  quantity: number;
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remaining: number;
  expiresAt: string | null;
  sellerNote: string | null;
  adminNote: string | null;
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
                    <p className="text-sm mt-1"><b>{p.quantity} hak</b> · {formatPrice(p.totalAmount)} · {formatDateTime(p.createdAt)}</p>
                    {p.status === 'APPROVED' && <p className="text-xs text-muted-foreground mt-1">Kalan: {p.remaining}{p.expiresAt ? ` · Son: ${formatDateTime(p.expiresAt)}` : ''}</p>}
                    {p.sellerNote && <p className="text-xs text-muted-foreground mt-1">Satıcı notu: {p.sellerNote}</p>}
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
