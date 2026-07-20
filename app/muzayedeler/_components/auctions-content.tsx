'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Filter, Gavel, Grid3X3, LayoutList, SlidersHorizontal, ArrowUpDown, X, ArrowLeft } from 'lucide-react';
import { AuctionCard } from '@/components/auction-card';
import { LotCard } from '@/components/lot-card';

export function AuctionsPageContent() {
  const searchParams = useSearchParams();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams?.get('search') ?? '');
  const [category, setCategory] = useState(searchParams?.get('category') ?? '');
  const [status, setStatus] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sellers, setSellers] = useState<any[]>([]);
  const [sellerFilter, setSellerFilter] = useState('');
  const [viewMode, setViewMode] = useState<'auctions' | 'lots'>(
    (searchParams?.get('view') === 'lots' || searchParams?.get('category')) ? 'lots' : 'auctions'
  );

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (status) params.set('status', status);
      const res = await fetch(`/api/auctions?${params.toString()}`);
      const data = await res.json();
      setAuctions(data?.auctions ?? []);
    } catch {
      setAuctions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLots = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (sort) params.set('sort', sort);
      if (sellerFilter) params.set('sellerId', sellerFilter);
      const res = await fetch(`/api/lots?${params.toString()}`);
      const data = await res.json();
      setLots(data?.lots ?? []);
    } catch {
      setLots([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(d => setCategories(d?.categories ?? [])).catch(() => {});
    fetch('/api/sellers').then(r => r.json()).then(d => setSellers(d?.sellers ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (viewMode === 'lots') {
      fetchLots();
    } else {
      fetchAuctions();
    }
  }, [category, status, viewMode, sort, minPrice, maxPrice, sellerFilter]);

  const clearFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setSort('');
    setSellerFilter('');
    setCategory('');
    setSearch('');
    setStatus('');
  };

  const hasActiveFilters = minPrice || maxPrice || sort || sellerFilter || category || search || status;

  const handleCategoryChange = (slug: string) => {
    setCategory(slug);
    if (slug) {
      setViewMode('lots');
    } else {
      // "Hepsi" seçildiğinde müzayede görünümüne dön
      setViewMode('auctions');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (viewMode === 'lots') fetchLots();
    else fetchAuctions();
  };

  const selectedCategoryName = categories.find((c: any) => c?.slug === category)?.name;

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => window.history.back()} className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></button>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              {selectedCategoryName ? selectedCategoryName : 'Müzayedeler'}
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            {selectedCategoryName
              ? `${selectedCategoryName} kategorisindeki ürünler`
              : 'Tüm aktif ve yaklaşan müzayedeleri keşfedin'
            }
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={viewMode === 'lots' ? 'Ürün ara...' : 'Müzayede ara...'}
                className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
              />
            </div>
          </form>
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm focus:border-[#d4af37] focus:outline-none"
          >
            <option value="">Tüm Kategoriler</option>
            {(categories ?? []).map((cat: any) => (
              <option key={cat?.id} value={cat?.slug ?? ''}>{cat?.name ?? ''}</option>
            ))}
          </select>
          {viewMode === 'auctions' && (
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm focus:border-[#d4af37] focus:outline-none"
            >
              <option value="">Tüm Durumlar</option>
              <option value="SCHEDULED">Planlandı</option>
              <option value="ACTIVE">Aktif</option>
              <option value="LIVE">Canlı</option>
              <option value="COMPLETED">Tamamlandı</option>
            </select>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37]'
                : 'border-border bg-card text-muted-foreground hover:bg-accent'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtreler
            {hasActiveFilters && (
              <span className="rounded-full bg-[#d4af37] text-black text-[10px] w-4 h-4 flex items-center justify-center font-bold">!</span>
            )}
          </button>
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode('auctions')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                viewMode === 'auctions' ? 'bg-[#d4af37] text-black' : 'bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              <LayoutList className="h-4 w-4" />
              Müzayedeler
            </button>
            <button
              onClick={() => setViewMode('lots')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                viewMode === 'lots' ? 'bg-[#d4af37] text-black' : 'bg-card text-muted-foreground hover:bg-accent'
              }`}
            >
              <Grid3X3 className="h-4 w-4" />
              Ürünler
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="rounded-xl border border-border bg-card p-4 mb-6 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#d4af37]" />
                Gelişmiş Filtreler
              </h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <X className="h-3 w-3" /> Filtreleri Temizle
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Min. Fiyat (₺)</label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Max. Fiyat (₺)</label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                  placeholder="∞"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Satıcı</label>
                <select
                  value={sellerFilter}
                  onChange={e => setSellerFilter(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                >
                  <option value="">Tüm Satıcılar</option>
                  {(sellers ?? []).map((s: any) => (
                    <option key={s?.id} value={s?.id ?? ''}>{s?.companyName ?? ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Sıralama</label>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                >
                  <option value="">Varsayılan</option>
                  <option value="price_asc">Fiyat: Düşükten Yükseğe</option>
                  <option value="price_desc">Fiyat: Yüksekten Düşüğe</option>
                  <option value="bids_desc">En Çok Teklif Alan</option>
                  <option value="date_desc">En Yeni</option>
                  <option value="date_asc">En Eski</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Aktif Filtre Badge'leri */}
        {showFilters && hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {search && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#d4af37]/10 text-[#d4af37] text-xs">
                Arama: &quot;{search}&quot;
                <button onClick={() => setSearch('')} className="hover:bg-[#d4af37]/20 rounded-full p-0.5"><X className="h-3 w-3" /></button>
              </span>
            )}
            {category && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs">
                {selectedCategoryName}
                <button onClick={() => handleCategoryChange('')} className="hover:bg-blue-500/20 rounded-full p-0.5"><X className="h-3 w-3" /></button>
              </span>
            )}
            {minPrice && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-xs">
                Min: {minPrice}₺
                <button onClick={() => setMinPrice('')} className="hover:bg-green-500/20 rounded-full p-0.5"><X className="h-3 w-3" /></button>
              </span>
            )}
            {maxPrice && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-xs">
                Max: {maxPrice}₺
                <button onClick={() => setMaxPrice('')} className="hover:bg-green-500/20 rounded-full p-0.5"><X className="h-3 w-3" /></button>
              </span>
            )}
            {sellerFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs">
                {sellers.find((s: any) => s?.id === sellerFilter)?.companyName ?? 'Satıcı'}
                <button onClick={() => setSellerFilter('')} className="hover:bg-purple-500/20 rounded-full p-0.5"><X className="h-3 w-3" /></button>
              </span>
            )}
          </div>
        )}

        {/* Category pills */}
        <div className="flex gap-2 flex-wrap mb-8">
          <button onClick={() => handleCategoryChange('')} className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${!category ? 'bg-[#d4af37] text-black' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
            Hepsi
          </button>
          {(categories ?? []).map((cat: any) => (
            <button
              key={cat?.id}
              onClick={() => handleCategoryChange(cat?.slug ?? '')}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${category === cat?.slug ? 'bg-[#d4af37] text-black' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {cat?.name ?? ''}
            </button>
          ))}
        </div>

        {/* Sonuç Sayısı */}
        {!loading && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {viewMode === 'lots'
                ? `${lots?.length ?? 0} ürün bulundu`
                : `${auctions?.length ?? 0} müzayede bulundu`
              }
            </p>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className={`grid gap-6 ${viewMode === 'lots' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {Array.from({ length: viewMode === 'lots' ? 8 : 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card border border-border/50 animate-pulse">
                <div className={`${viewMode === 'lots' ? 'aspect-square' : 'aspect-[16/9]'} bg-muted rounded-t-xl`} />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === 'lots' ? (
          (lots?.length ?? 0) > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(lots ?? []).map((lot: any, i: number) => (
                <LotCard key={lot?.id ?? i} lot={lot} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Grid3X3 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Ürün bulunamadı</p>
              <p className="text-sm text-muted-foreground">Filtrelerinizi değiştirmeyi deneyin</p>
            </div>
          )
        ) : (
          (auctions?.length ?? 0) > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(auctions ?? []).map((auction: any, i: number) => (
                <AuctionCard key={auction?.id ?? i} auction={auction} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Müzayede bulunamadı</p>
              <p className="text-sm text-muted-foreground">Filtrelerinizi değiştirmeyi deneyin</p>
            </div>
          )
        )}
      </div>
    </main>
  );
}