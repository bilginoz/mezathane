'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Plus, X, CheckCircle, XCircle, Eye, Clock, ArrowLeft } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  OPEN: { label: 'Açık', color: 'bg-red-500/20 text-red-600 dark:text-red-400' },
  IN_REVIEW: { label: 'İnceleniyor', color: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' },
  RESOLVED: { label: 'Çözüldü', color: 'bg-green-500/20 text-green-600 dark:text-green-400' },
  REJECTED: { label: 'Reddedildi', color: 'bg-gray-500/20 text-gray-600 dark:text-gray-400' },
};

export function MyDisputes() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ lotId: '', reason: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [myLots, setMyLots] = useState<{ lotId: string; lotTitle: string; lotNumber: number; auctionTitle: string }[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/giris');
  }, [status, router]);

  const fetchDisputes = useCallback(async () => {
    try {
      const res = await fetch('/api/disputes');
      if (res.ok) setDisputes(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  const fetchMyLots = useCallback(async () => {
    try {
      const res = await fetch('/api/buyer/orders');
      if (res.ok) {
        const data = await res.json();
        setMyLots(data.map((o: any) => ({ lotId: o.lotId, lotTitle: o.lotTitle, lotNumber: o.lotNumber, auctionTitle: o.auctionTitle })));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDisputes();
      fetchMyLots();
    }
  }, [status, fetchDisputes, fetchMyLots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lotId || !form.reason || !form.description) {
      toast.error('Tüm alanları doldurun');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Şikayet oluşturuldu');
        setShowForm(false);
        setForm({ lotId: '', reason: '', description: '' });
        fetchDisputes();
      } else {
        const data = await res.json();
        toast.error(data.error ?? 'Hata');
      }
    } catch { toast.error('Hata oluştu'); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return <main className="flex-1 py-8"><div className="flex justify-center min-h-[40vh] items-center"><Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" /></div></main>;
  }

  return (
    <main className="flex-1 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button onClick={() => router.back()} className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></button>
            <AlertTriangle className="h-6 w-6 text-[#d4af37]" />
            <h1 className="font-display text-2xl font-bold">Anlaşmazlıklarım</h1>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#d4af37] text-black text-sm font-medium hover:bg-[#c4a030]"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'İptal' : 'Yeni Şikayet'}
          </button>
        </div>

        {/* Yeni Şikayet Formu */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-muted/50 border border-border rounded-xl p-4 sm:p-6 mb-6 space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">İlgili Ürün (Lot) *</label>
              <select
                value={form.lotId}
                onChange={e => setForm({ ...form, lotId: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#d4af37]/50"
              >
                <option value="">Ürün seçin...</option>
                {myLots.map(lot => (
                  <option key={lot.lotId} value={lot.lotId}>
                    Lot #{lot.lotNumber} — {lot.lotTitle} ({lot.auctionTitle})
                  </option>
                ))}
              </select>
              {myLots.length === 0 && <p className="text-[10px] text-muted-foreground mt-1">Henüz satın aldığınız bir ürün bulunmuyor</p>}
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Neden *</label>
              <select
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-[#d4af37]/50"
              >
                <option value="">Seçin...</option>
                <option value="Ürün açıklaması yanlış">Ürün açıklaması yanlış</option>
                <option value="Ürün hasarlı geldi">Ürün hasarlı geldi</option>
                <option value="Ürün gönderilmedi">Ürün gönderilmedi</option>
                <option value="Sahte teklif şüphesi">Sahte teklif şüphesi</option>
                <option value="Ödeme sorunu">Ödeme sorunu</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Detaylı Açıklama *</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={4}
                placeholder="Sorunu detaylı açıklayın..."
                className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#d4af37]/50 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-[#d4af37] text-black font-medium text-sm hover:bg-[#c4a030] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Şikayeti Gönder
            </button>
          </form>
        )}

        {/* Şikayet Listesi */}
        {disputes.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Henüz anlaşmazlık kaydınız yok</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map((d: any) => {
              const st = STATUS_MAP[d.status] ?? STATUS_MAP.OPEN;
              return (
                <div key={d.id} className="bg-muted/50 border border-border rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{d.reason}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.color}`}>{st.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Lot: <Link href={`/lot/${d.lotId}`} className="text-[#d4af37] hover:underline">{d.lot?.title ?? d.lotId}</Link>
                        {' • '}{formatDate(d.createdAt)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">{d.description}</p>

                      {d.resolution && (
                        <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                          <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">Çözüm</p>
                          <p className="text-sm text-foreground/80">{d.resolution}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}