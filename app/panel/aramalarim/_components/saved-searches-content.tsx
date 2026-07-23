'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, BellOff, Trash2, Search, Plus } from 'lucide-react';

interface SavedSearch {
  id: string;
  keyword: string | null;
  categoryId: string | null;
  categoryName: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  alertEnabled: boolean;
}

interface Category { id: string; name: string; }

export function SavedSearchesContent() {
  const { status } = useSession();
  const router = useRouter();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/giris'); return; }
    if (status !== 'authenticated') return;
    Promise.all([
      fetch('/api/saved-searches').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
    ]).then(([ss, cat]) => {
      setSearches(ss.searches ?? []);
      setCategories(cat.categories ?? []);
    }).finally(() => setLoading(false));
  }, [status, router]);

  async function addSearch(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keyword.trim() || undefined,
          categoryId: categoryId || undefined,
          minPrice: minPrice ? parseFloat(minPrice) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
          alertEnabled: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Kaydedilemedi'); return; }
      // Kategori adını ekleyerek listeye koy
      const catName = categories.find(c => c.id === data.search.categoryId)?.name ?? null;
      setSearches(prev => [{ ...data.search, categoryName: catName }, ...prev]);
      setKeyword(''); setCategoryId(''); setMinPrice(''); setMaxPrice('');
    } finally {
      setSaving(false);
    }
  }

  async function toggleAlert(id: string, next: boolean) {
    setSearches(prev => prev.map(s => s.id === id ? { ...s, alertEnabled: next } : s));
    await fetch(`/api/saved-searches/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertEnabled: next }),
    }).catch(() => {});
  }

  async function remove(id: string) {
    setSearches(prev => prev.filter(s => s.id !== id));
    await fetch(`/api/saved-searches/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  function describe(s: SavedSearch) {
    const parts: string[] = [];
    if (s.keyword) parts.push(`"${s.keyword}"`);
    if (s.categoryName) parts.push(`Kategori: ${s.categoryName}`);
    if (s.minPrice != null || s.maxPrice != null) {
      parts.push(`${s.minPrice != null ? s.minPrice.toLocaleString('tr-TR') + ' ₺' : '0'} - ${s.maxPrice != null ? s.maxPrice.toLocaleString('tr-TR') + ' ₺' : '∞'}`);
    }
    return parts.join(' · ') || 'Tüm lotlar';
  }

  return (
    <main className="flex-1 container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-2 mb-1">
        <Search className="h-5 w-5 text-[#d4af37]" />
        <h1 className="font-display text-2xl font-bold">Kayıtlı Aramalarım</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Bir arama kriteri kaydedin; kriterinize uyan yeni bir lot eklendiğinde e-posta ve
        uygulama içi bildirim alın. Alarmı istediğiniz zaman kapatabilirsiniz.
      </p>

      {/* Yeni arama formu */}
      <form onSubmit={addSearch} className="rounded-xl border border-border bg-card p-4 mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Anahtar kelime</label>
            <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Örn: tesbih, tablo, sikke"
              className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Kategori</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50">
              <option value="">Farketmez</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">En düşük fiyat (₺)</label>
            <input type="number" min="0" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0"
              className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">En yüksek fiyat (₺)</label>
            <input type="number" min="0" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Sınırsız"
              className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] text-black px-4 py-2 text-sm font-medium hover:bg-[#c19f2e] disabled:opacity-60">
          <Plus className="h-4 w-4" /> {saving ? 'Kaydediliyor…' : 'Aramayı Kaydet'}
        </button>
      </form>

      {/* Liste */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Yükleniyor…</p>
      ) : searches.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>Henüz kayıtlı aramanız yok.</p>
          <Link href="/muzayedeler" className="text-[#d4af37] text-sm hover:underline">Lotlara göz atın →</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {searches.map(s => (
            <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{describe(s)}</p>
                <p className="text-xs text-muted-foreground">{s.alertEnabled ? 'Alarm açık' : 'Alarm kapalı'}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleAlert(s.id, !s.alertEnabled)}
                  title={s.alertEnabled ? 'Alarmı kapat' : 'Alarmı aç'}
                  className={`p-2 rounded-lg hover:bg-muted ${s.alertEnabled ? 'text-[#d4af37]' : 'text-muted-foreground'}`}>
                  {s.alertEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                </button>
                <button onClick={() => remove(s.id)} title="Sil"
                  className="p-2 rounded-lg hover:bg-muted text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
