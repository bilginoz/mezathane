'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, X, Receipt, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

interface ExpenseData {
  id: string;
  title: string;
  category: string;
  amount: number;
  kdvRate: number;
  kdvAmount: number;
  totalAmount: number;
  supplier: string | null;
  documentNo: string | null;
  paymentMethod: string | null;
  bankName: string | null;
  expenseDate: string;
  notes: string | null;
}

interface ProfitLoss {
  income: { buyerPremium: number; sellerCommission: number; total: number; collected: number; pending: number; salesVolume: number; soldCount: number };
  expense: { total: number; kdv: number; count: number; byCategory: Record<string, number> };
  netProfit: number;
  netProfitCollected: number;
}

const CATEGORIES = [
  { value: 'hosting', label: 'Sunucu / Hosting' },
  { value: 'reklam', label: 'Reklam / Pazarlama' },
  { value: 'kira', label: 'Kira' },
  { value: 'maas', label: 'Maaş / Personel' },
  { value: 'kargo', label: 'Kargo' },
  { value: 'ofis', label: 'Ofis / Kırtasiye' },
  { value: 'yazilim', label: 'Yazılım / Abonelik' },
  { value: 'vergi', label: 'Vergi / Resmi Ödeme' },
  { value: 'diger', label: 'Diğer' },
];
const catLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label ?? v;

// Bu ayın ilk günü / bugün — YYYY-MM-DD
function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ExpensesManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();

  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [pl, setPl] = useState<ProfitLoss | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [filterCat, setFilterCat] = useState('');

  const [form, setForm] = useState({
    title: '', category: 'diger', amount: '', kdvRate: '20',
    supplier: '', documentNo: '', paymentMethod: '', bankName: '',
    expenseDate: today(), notes: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ from, to });
      if (filterCat) q.set('category', filterCat);
      const [exRes, plRes] = await Promise.all([
        fetch(`/api/admin/expenses?${q}`).then(r => r.json()),
        fetch(`/api/admin/profit-loss?from=${from}&to=${to}`).then(r => r.json()),
      ]);
      setExpenses(exRes.expenses ?? []);
      setPl(plRes?.income ? plRes : null);
    } catch {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [from, to, filterCat]);

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/giris'); return; }
    if (status !== 'authenticated') return;
    if ((session?.user as any)?.role !== 'ADMIN') { router.push('/'); return; }
    load();
  }, [status, session, router, load]);

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          kdvRate: parseFloat(form.kdvRate),
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Kaydedilemedi'); return; }
      toast.success('Gider kaydedildi');
      setShowForm(false);
      setForm({ title: '', category: 'diger', amount: '', kdvRate: '20', supplier: '', documentNo: '', paymentMethod: '', bankName: '', expenseDate: today(), notes: '' });
      load();
    } finally { setSaving(false); }
  }

  async function remove(id: string, title: string) {
    if (!confirm(`"${title}" gider kaydı silinecek. Emin misiniz?\n\nBu işlem denetim günlüğüne kaydedilir.`)) return;
    const res = await fetch(`/api/admin/expenses?id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Silindi'); load(); }
    else toast.error('Silinemedi');
  }

  // KDV hariç tutardan toplam hesapla (formda canlı önizleme)
  const previewTotal = (() => {
    const a = parseFloat(form.amount);
    const k = parseFloat(form.kdvRate);
    if (!Number.isFinite(a) || !Number.isFinite(k)) return null;
    return a + a * (k / 100);
  })();

  if (status === 'loading' || loading) {
    return <main className="flex-1 py-10 text-center text-muted-foreground">Yükleniyor…</main>;
  }

  return (
    <main className="flex-1 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold">Giderler ve Kâr/Zarar</h1>
            <p className="text-sm text-muted-foreground">Platformun ödediği masrafları buraya girin; kârınız otomatik hesaplanır.</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] text-black px-4 py-2 text-sm font-medium hover:bg-[#c9a430]">
            <Plus className="h-4 w-4" /> Gider Ekle
          </button>
        </div>

        {/* Dönem seçimi */}
        <div className="flex flex-wrap items-end gap-3 mb-6 rounded-xl border border-border bg-card p-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Başlangıç</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="rounded-lg bg-muted border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Bitiş</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="rounded-lg bg-muted border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Kategori</label>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="rounded-lg bg-muted border border-border px-3 py-2 text-sm">
              <option value="">Tümü</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {/* Kâr / Zarar özeti */}
        {pl && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
              <div className="flex items-center gap-2 text-green-400 mb-1"><TrendingUp className="h-4 w-4" /><span className="text-xs font-medium">Gelir</span></div>
              <p className="text-xl font-bold font-mono">{formatPrice(pl.income.total)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Alıcı primi {formatPrice(pl.income.buyerPremium)} · Satıcı kom. {formatPrice(pl.income.sellerCommission)}
              </p>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
              <div className="flex items-center gap-2 text-red-400 mb-1"><TrendingDown className="h-4 w-4" /><span className="text-xs font-medium">Gider</span></div>
              <p className="text-xl font-bold font-mono">{formatPrice(pl.expense.total)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{pl.expense.count} kayıt · KDV {formatPrice(pl.expense.kdv)}</p>
            </div>
            <div className={`rounded-xl border p-4 ${pl.netProfit >= 0 ? 'border-[#d4af37]/40 bg-[#d4af37]/5' : 'border-red-500/40 bg-red-500/10'}`}>
              <div className="flex items-center gap-2 mb-1 text-[#d4af37]"><Wallet className="h-4 w-4" /><span className="text-xs font-medium">Net Kâr</span></div>
              <p className={`text-xl font-bold font-mono ${pl.netProfit >= 0 ? '' : 'text-red-400'}`}>{formatPrice(pl.netProfit)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Tahsil edilmemiş gelir dahil</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground"><Wallet className="h-4 w-4" /><span className="text-xs font-medium">Kasaya Giren Net</span></div>
              <p className={`text-xl font-bold font-mono ${pl.netProfitCollected >= 0 ? '' : 'text-red-400'}`}>{formatPrice(pl.netProfitCollected)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Sadece tahsil edilen gelir − gider</p>
            </div>
          </div>
        )}

        {pl && pl.income.pending > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 mb-6 text-sm">
            <strong className="text-amber-400">{formatPrice(pl.income.pending)}</strong>
            <span className="text-muted-foreground"> gelir henüz tahsil edilmedi. Bu tutar &quot;Net Kâr&quot;a dahil, &quot;Kasaya Giren&quot;e değil.</span>
          </div>
        )}

        {/* Gider listesi */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[#d4af37]" />
            <h2 className="font-medium">Gider Kayıtları</h2>
            <span className="text-xs text-muted-foreground">({expenses.length})</span>
          </div>
          {expenses.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Bu dönemde gider kaydı yok. &quot;Gider Ekle&quot; ile başlayın.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Tarih</th>
                    <th className="text-left p-3">Açıklama</th>
                    <th className="text-left p-3">Kategori</th>
                    <th className="text-left p-3">Tedarikçi</th>
                    <th className="text-right p-3">KDV Hariç</th>
                    <th className="text-right p-3">KDV</th>
                    <th className="text-right p-3">Toplam</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id} className="border-t border-border hover:bg-muted/20">
                      <td className="p-3 whitespace-nowrap text-muted-foreground">
                        {new Date(e.expenseDate).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{e.title}</div>
                        {e.documentNo && <div className="text-[11px] text-muted-foreground">Belge: {e.documentNo}</div>}
                      </td>
                      <td className="p-3"><span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{catLabel(e.category)}</span></td>
                      <td className="p-3 text-muted-foreground">{e.supplier ?? '—'}</td>
                      <td className="p-3 text-right font-mono">{formatPrice(e.amount)}</td>
                      <td className="p-3 text-right font-mono text-muted-foreground">{formatPrice(e.kdvAmount)}</td>
                      <td className="p-3 text-right font-mono font-semibold">{formatPrice(e.totalAmount)}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => remove(e.id, e.title)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Gider ekleme formu */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold">Yeni Gider</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={addExpense} className="p-5 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Açıklama *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Örn: Vercel Pro aboneliği - Temmuz"
                  className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Kategori</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm">
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tarih</label>
                  <input type="date" value={form.expenseDate} onChange={e => setForm({ ...form, expenseDate: e.target.value })}
                    className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tutar (KDV hariç) *</label>
                  <input required type="number" step="0.01" min="0" value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0,00"
                    className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">KDV Oranı (%)</label>
                  <select value={form.kdvRate} onChange={e => setForm({ ...form, kdvRate: e.target.value })}
                    className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm">
                    <option value="0">%0 (KDV yok)</option>
                    <option value="1">%1</option>
                    <option value="10">%10</option>
                    <option value="20">%20</option>
                  </select>
                </div>
              </div>

              {previewTotal !== null && (
                <div className="rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30 px-3 py-2 text-sm">
                  Ödenecek toplam: <strong className="font-mono">{formatPrice(previewTotal)}</strong>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tedarikçi / Firma</label>
                  <input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}
                    className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Belge / Fatura No</label>
                  <input value={form.documentNo} onChange={e => setForm({ ...form, documentNo: e.target.value })}
                    className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Ödeme Yöntemi</label>
                  <select value={form.paymentMethod} onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                    className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm">
                    <option value="">Belirtilmedi</option>
                    <option value="havale">Havale</option>
                    <option value="eft">EFT</option>
                    <option value="kredi_karti">Kredi Kartı</option>
                    <option value="nakit">Nakit</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Banka</label>
                  <input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })}
                    className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Not</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm resize-none" />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving}
                  className="flex-1 rounded-lg bg-[#d4af37] text-black py-2 text-sm font-medium hover:bg-[#c9a430] disabled:opacity-60">
                  {saving ? 'Kaydediliyor…' : 'Kaydet'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">Vazgeç</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
