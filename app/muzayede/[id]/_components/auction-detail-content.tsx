'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, CalendarPlus, Clock, Eye, Layers, Search, Store, Radio, Share2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowLeft, Info, CreditCard } from 'lucide-react';
import { AuctionBanner } from '@/components/auction-banner';
import { formatDate, formatDateTime, formatPrice } from '@/lib/utils';
import { CountdownTimer } from '@/components/countdown-timer';
import { LotCard } from '@/components/lot-card';
import { SellerRating } from '@/components/seller-rating';
import { SocialShare } from '@/components/social-share';
import { VerifiedBadge } from '@/components/verified-badge';

const LOTS_PER_PAGE = 20;

type SortOption = 'lot-asc' | 'lot-desc' | 'price-asc' | 'price-desc' | 'bids-desc' | 'newest';

export function AuctionDetailContent({ auction }: { auction: any }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>('lot-asc');

  // Otomatik canlı geçiş kontrolü
  useEffect(() => {
    fetch('/api/cron/check-live').then(r => r.json()).then(d => {
      if (d?.transitioned > 0) window.location.reload();
    }).catch(() => {});
  }, []);
  const [selectedCategory, setSelectedCategory] = useState('');
  const lots = auction?.lots ?? [];
  const categories = [...new Set((lots ?? []).flatMap((l: any) => l?.lotCategories?.length ? l.lotCategories.map((lc: any) => lc.category?.name) : [l?.category?.name]).filter(Boolean))] as string[];

  const filteredAndSortedLots = useMemo(() => {
    let result = (lots ?? []).filter((lot: any) => {
      const matchSearch = !search || (lot?.title ?? '').toLowerCase().includes(search.toLowerCase());
      const matchCat = !selectedCategory || (lot?.lotCategories?.length ? lot.lotCategories.some((lc: any) => lc.category?.name === selectedCategory) : lot?.category?.name === selectedCategory);
      return matchSearch && matchCat;
    });

    // Sıralama
    result = [...result].sort((a: any, b: any) => {
      switch (sortBy) {
        case 'lot-asc': return (a?.sortOrder ?? a?.lotNumber ?? 0) - (b?.sortOrder ?? b?.lotNumber ?? 0);
        case 'lot-desc': return (b?.sortOrder ?? b?.lotNumber ?? 0) - (a?.sortOrder ?? a?.lotNumber ?? 0);
        case 'price-asc': return (a?.currentPrice ?? a?.startingPrice ?? 0) - (b?.currentPrice ?? b?.startingPrice ?? 0);
        case 'price-desc': return (b?.currentPrice ?? b?.startingPrice ?? 0) - (a?.currentPrice ?? a?.startingPrice ?? 0);
        case 'bids-desc': return (b?._count?.bids ?? 0) - (a?._count?.bids ?? 0);
        case 'newest': return new Date(b?.createdAt ?? 0).getTime() - new Date(a?.createdAt ?? 0).getTime();
        default: return 0;
      }
    });

    return result;
  }, [lots, search, selectedCategory, sortBy]);

  // Sayfalama
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedLots.length / LOTS_PER_PAGE));
  const paginatedLots = filteredAndSortedLots.slice((currentPage - 1) * LOTS_PER_PAGE, currentPage * LOTS_PER_PAGE);

  // Filtre/arama değiştiğinde sayfa 1'e dön
  useEffect(() => { setCurrentPage(1); }, [search, selectedCategory, sortBy]);

  // Süre dolmuş mu kontrol et
  const auctionEndDate = auction?.endDate;
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  useEffect(() => {
    if (!auctionEndDate) return;
    const check = () => setIsTimeExpired(new Date(auctionEndDate).getTime() < Date.now());
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [auctionEndDate]);
  const isAuctionEnded = auction?.status === 'COMPLETED' || auction?.status === 'CANCELLED' || isTimeExpired;
  const isLive = auction?.status === 'LIVE' && !isAuctionEnded;
  const canBid = !isAuctionEnded && (auction?.status === 'ACTIVE' || auction?.status === 'LIVE');
  const lotImages = (auction?.lots ?? []).slice(0, 4).map((l: any) => l?.images?.[0]?.imageUrl).filter(Boolean);

  return (
    <main className="flex-1">
      {/* Geri Butonu */}
      <div className="mx-auto max-w-[1200px] px-4 pt-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Geri
        </button>
      </div>
      {/* Hero Banner */}
      <div className="relative h-64 md:h-80 overflow-hidden mt-3">
        <AuctionBanner
          logoUrl={auction?.seller?.logoUrl}
          companyName={auction?.seller?.companyName}
          lotImages={lotImages}
          title={auction?.title}
        />
        <div className="absolute bottom-0 inset-x-0">
          <div className="mx-auto max-w-[1200px] px-4 pb-6">
            <div className="flex items-center gap-3 mb-3">
              <Store className="h-5 w-5 text-[#d4af37]" />
              <Link href={`/muzayede-evi/${auction?.sellerId ?? ''}`} className="text-white/70 text-sm hover:text-[#d4af37] transition-colors flex items-center gap-1">{auction?.seller?.companyName ?? ''}{auction?.seller?.isVerified && <VerifiedBadge size="sm" />}</Link>
              {isLive && (
                <span className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-0.5 text-xs font-bold text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> CANLI
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-white flex-1">{auction?.title ?? ''}</h1>
              <a
                href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(auction?.title ?? '')}&dates=${auction?.startDate ? new Date(auction.startDate).toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'') : ''}/${auction?.endDate ? new Date(auction.endDate).toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'') : ''}&details=${encodeURIComponent((auction?.description ?? '').substring(0, 200))}&location=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                target="_blank" rel="noopener noreferrer"
                className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 backdrop-blur-sm transition-colors"
                title="Google Takvime Ekle"
              >
                <CalendarPlus className="h-5 w-5" />
              </a>
              <div className="relative">
                <button onClick={() => setShowShareMenu(!showShareMenu)} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 backdrop-blur-sm transition-colors">
                  <Share2 className="h-5 w-5" />
                </button>
                {showShareMenu && (
                  <div className="absolute right-0 top-full mt-2 z-50">
                    <SocialShare
                      title={auction?.title ?? 'Müzayede'}
                      text={`${auction?.title ?? ''} - ${auction?.seller?.companyName ?? ''}`}
                      compact
                      onClose={() => setShowShareMenu(false)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 py-8">
        {/* Live Auction CTA */}
        {isLive && (
          <Link
            href={`/canli/${auction?.id ?? ''}`}
            className="mb-6 flex items-center justify-center gap-3 rounded-xl bg-red-600 p-4 text-white font-bold text-lg hover:bg-red-700 transition-colors animate-pulse"
          >
            <Radio className="h-6 w-6" />
            Canlı Müzayedeye Katıl
            <Radio className="h-6 w-6" />
          </Link>
        )}

        {/* Approaching Live */}
        {!isLive && auction?.status === 'ACTIVE' && auction?.endDate && auction?.liveStartDate && (() => {
          const endTime = new Date(auction.endDate).getTime();
          const now = Date.now();
          const diff = endTime - now;
          if (diff > 0 && diff < 24 * 60 * 60 * 1000) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            return (
              <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-center gap-3">
                  <Radio className="h-5 w-5 text-amber-400 animate-pulse" />
                  <div>
                    <p className="text-sm font-bold text-amber-400">Canlı Müzayede Yaklaşıyor!</p>
                    <p className="text-xs text-muted-foreground">
                      Teklif süresi {hours > 0 ? `${hours} saat ` : ''}{mins} dakika sonra doluyor. 
                      Ardından 10 dakika içinde canlı müzayede otomatik başlayacak.
                    </p>
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 mb-6 sm:mb-8">
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <Calendar className="h-4 w-4 text-[#d4af37] mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Başlangıç</p>
            <p className="text-sm font-medium">{formatDate(auction?.startDate)}</p>
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <Clock className="h-4 w-4 text-[#d4af37] mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">{isAuctionEnded ? 'Durum' : 'Kalan Süre'}</p>
            {isAuctionEnded ? (
              <p className="text-sm font-medium text-red-400">Tamamlandı</p>
            ) : (
              <CountdownTimer endDate={auction?.endDate ?? auction?.liveStartDate ?? new Date()} className="text-sm font-medium justify-center" />
            )}
          </div>
          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <Layers className="h-4 w-4 text-[#d4af37] mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Lot Sayısı</p>
            <p className="text-sm font-bold">{auction?._count?.lots ?? 0}</p>
          </div>

          <div className="rounded-lg bg-card border border-border p-3 text-center">
            <Eye className="h-4 w-4 text-[#d4af37] mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">Görüntülenme</p>
            <p className="text-sm font-bold">{auction?.viewCount ?? 0}</p>
          </div>
        </div>

        {/* Description */}
        {auction?.description && (
          <div className="rounded-lg bg-card border border-border p-4 mb-8">
            <p className="text-sm text-muted-foreground leading-relaxed">{auction.description}</p>
          </div>
        )}

        {/* Komisyon Açıklama Kutusu */}
        {(auction?.status === 'ACTIVE' || auction?.status === 'LIVE' || auction?.status === 'UPCOMING') && (
          <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-4 sm:p-5 mb-6 sm:mb-8">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-[#d4af37] mt-0.5 flex-shrink-0" />
              <div className="space-y-3 flex-1">
                <p className="text-sm text-foreground">
                  Alıcılardan çekiç fiyatı üzerine <strong className="text-[#d4af37]">%10 hizmet bedeli</strong> ve bu bedel üzerine <strong className="text-[#d4af37]">KDV</strong> (lotün KDV oranına göre %1 / %10 / %20) ilave alınacaktır.
                </p>
                <div className="rounded-lg bg-card/80 border border-border p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Örnek hesaplama (%20 KDV):</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Çekiç Fiyatı (KDV dahil)</span>
                      <span className="font-mono">100 ₺</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Komisyon %10</span>
                      <span className="font-mono">10 ₺</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Komisyon KDV %20</span>
                      <span className="font-mono">2 ₺</span>
                    </div>
                    <div className="border-t border-border pt-1 mt-1 flex justify-between font-bold">
                      <span>Toplam</span>
                      <span className="text-[#d4af37] font-mono">112 ₺</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">KDV oranı lot bazında değişebilir. Teklif verirken gerçek tutarı göreceksiniz.</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Ödeme süresi müzayede bitiminden sonra <strong className="text-foreground">{auction?.paymentDays ?? 5} gündür</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lot Filters + Sort */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Lot içinde ara..."
              className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm focus:border-[#d4af37] focus:outline-none"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm"
          >
            <option value="">Tüm Kategoriler</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm"
          >
            <option value="lot-asc">Lot No (Küçükten Büyüğe)</option>
            <option value="lot-desc">Lot No (Büyükten Küçüğe)</option>
            <option value="price-asc">Fiyat (Düşükten Yüksek)</option>
            <option value="price-desc">Fiyat (Yüsekten Düşük)</option>
            <option value="bids-desc">En Çok Teklif</option>
            <option value="newest">En Yeni</option>
          </select>
        </div>

        {/* Lot sayısı bilgisi */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredAndSortedLots.length} lot {search || selectedCategory ? '(filtrelenmiş)' : ''}
          </p>
          {totalPages > 1 && (
            <p className="text-sm text-muted-foreground">
              Sayfa {currentPage} / {totalPages}
            </p>
          )}
        </div>

        {/* Seller Rating */}
        {auction?.sellerId && (
          <div className="mb-8">
            <SellerRating sellerId={auction.sellerId} sellerName={auction?.seller?.companyName ?? ''} />
          </div>
        )}

        {/* Lots Grid */}
        {paginatedLots.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {paginatedLots.map((lot: any, i: number) => (
              <LotCard
                key={lot?.id ?? i}
                lot={{
                  ...lot,
                  auction: lot.auction ?? {
                    id: auction?.id,
                    title: auction?.title,
                    status: auction?.status,
                    startDate: auction?.startDate,
                    endDate: auction?.endDate,
                    sellerId: auction?.sellerId,
                  },
                }}
                index={i}
                showQuickBid={canBid}
                showSoldBadge={isAuctionEnded}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Bu müzayedede henüz lot eklenmemiş</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-border bg-card p-2 text-sm hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                if (totalPages <= 7) return true;
                if (page === 1 || page === totalPages) return true;
                if (Math.abs(page - currentPage) <= 1) return true;
                return false;
              })
              .map((page, idx, arr) => (
                <span key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && (
                    <span className="px-1 text-muted-foreground">...</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(page)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      page === currentPage
                        ? 'bg-[#d4af37] text-black'
                        : 'border border-border bg-card hover:bg-muted'
                    }`}
                  >
                    {page}
                  </button>
                </span>
              ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-border bg-card p-2 text-sm hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
