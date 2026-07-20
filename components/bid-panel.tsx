'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, TrendingUp, Users, Eye, Zap, Shield, X, Info } from 'lucide-react';
import { formatPrice, getMinBidIncrement } from '@/lib/utils';
import { toast } from 'sonner';
import { CountdownTimer } from './countdown-timer';
import { BidConfirmModal } from './bid-confirm-modal';

interface BidPanelProps {
  lot: any;
  onBidPlaced?: () => void;
}

export function BidPanel({ lot, onBidPlaced }: BidPanelProps) {
  const { data: session, update: updateSession } = useSession() || {};
  const router = useRouter();
  const [bidAmount, setBidAmount] = useState(0);
  const [maxBidAmount, setMaxBidAmount] = useState(0);
  const [isProxy, setIsProxy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(lot?.currentPrice ?? lot?.startingPrice ?? 0);
  const [bidCount, setBidCount] = useState(lot?.bidCount ?? lot?._count?.bids ?? 0);
  const [recentBids, setRecentBids] = useState<any[]>(lot?.bids ?? []);
  const [liveEndTime, setLiveEndTime] = useState<string | null>(lot?.liveEndTime ?? lot?.auction?.endDate ?? null);
  const [isHighestBidder, setIsHighestBidder] = useState(false);
  const [activeProxyBid, setActiveProxyBid] = useState<{ maxAmount: number; isActive: boolean } | null>(null);
  const [hasAuctionStarted, setHasAuctionStarted] = useState(false);
  const [showTimeExtended, setShowTimeExtended] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const prevEndTimeRef = useRef<string | null>(null);

  const minIncrement = getMinBidIncrement(currentPrice, lot?.customBidIncrement);
  const minBid = currentPrice + minIncrement;

  useEffect(() => {
    setBidAmount(minBid);
    setMaxBidAmount(minBid);
  }, [minBid]);

  // Polling for real-time updates
  useEffect(() => {
    if (!lot?.id) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/bids?lotId=${lot.id}`);
        const data = await res.json();
        if (data?.lot) {
          setCurrentPrice(data.lot.currentPrice ?? 0);
          setBidCount(data.lot.bidCount ?? 0);
          const newEndTime = data.lot.liveEndTime ?? data.lot.auction?.endDate ?? null;
          if (newEndTime) {
            // Süre uzatma tespiti
            if (prevEndTimeRef.current && newEndTime !== prevEndTimeRef.current) {
              const prevMs = new Date(prevEndTimeRef.current).getTime();
              const newMs = new Date(newEndTime).getTime();
              if (newMs > prevMs) {
                setShowTimeExtended(true);
                setTimeout(() => setShowTimeExtended(false), 4000);
              }
            }
            prevEndTimeRef.current = newEndTime;
            setLiveEndTime(newEndTime);
          }
        }
        if (data?.bids) {
          setRecentBids(data.bids);
          const userId = (session?.user as any)?.id;
          if (data.bids.length > 0 && userId) {
            setIsHighestBidder(data.bids[0]?.userId === userId);
          }
        }
        if (data?.activeProxyBid) {
          setActiveProxyBid(data.activeProxyBid);
        } else {
          setActiveProxyBid(null);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(poll);
  }, [lot?.id]);

  const handleCancelProxy = async () => {
    try {
      const res = await fetch(`/api/proxy-bid?lotId=${lot.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data?.success) {
        setActiveProxyBid(null);
        toast.success('Otomatik teklif iptal edildi');
      }
    } catch {
      toast.error('Hata oluştu');
    }
  };

  const proceedWithBid = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotId: lot.id,
          amount: bidAmount,
          maxAmount: isProxy ? maxBidAmount : null,
          type: isProxy ? 'PROXY' : 'MANUAL',
        }),
      });
      const data = await res.json();
      if (data?.success) {
        if (data.outbid) {
          toast.error('Teklifiniz geçildi! Daha yüksek proxy mevcut.');
        } else if (data.proxySet) {
          toast.success(data.proxyUpdated ? 'Otomatik teklif limiti güncellendi!' : 'Otomatik teklif aktif edildi!');
          setActiveProxyBid({ maxAmount: maxBidAmount, isActive: true });
        } else {
          toast.success('Teklifiniz başarıyla verildi!');
        }
        setCurrentPrice(data.currentPrice ?? bidAmount);
        setBidCount((p: number) => p + 1);
        setIsProxy(false);
        onBidPlaced?.();
      } else {
        if (data?.needsVerification) {
          toast.error('E-posta doğrulamanız gerekiyor. Doğrulama sayfasına yönlendiriliyorsunuz...');
          setTimeout(() => router.push('/dogrulama'), 1500);
        } else {
          toast.error(data?.error ?? 'Teklif verilemedi');
        }
      }
    } catch {
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleBid = async () => {
    if (!session?.user) {
      router.push('/giris');
      return;
    }
    if (isProxy) {
      if (maxBidAmount < minBid) {
        toast.error(`Maksimum teklif en az: ${formatPrice(minBid)}`);
        return;
      }
    } else {
      if (bidAmount < minBid) {
        toast.error(`Minimum teklif: ${formatPrice(minBid)}`);
        return;
      }
    }
    setShowConfirmModal(true);
  };

  const handleConfirmBid = () => {
    setShowConfirmModal(false);
    proceedWithBid();
  };

  const isLive = lot?.auction?.status === 'LIVE';
  const isLiveOnly = lot?.auction?.liveOnly === true;
  const auctionStartDate = lot?.auction?.startDate ? new Date(lot.auction.startDate) : null;
  useEffect(() => {
    if (auctionStartDate) setHasAuctionStarted(new Date() >= auctionStartDate);
  }, [auctionStartDate]);

  // Süre dolmuş mu kontrol et (cron henüz çalışmamış olabilir)
  const effectiveEndDate = liveEndTime ?? lot?.auction?.endDate ?? null;
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  useEffect(() => {
    if (!effectiveEndDate) return;
    const check = () => setIsTimeExpired(new Date(effectiveEndDate).getTime() < Date.now());
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [effectiveEndDate]);

  const isAuctionEnded = lot?.auction?.status === 'COMPLETED' || lot?.auction?.status === 'CANCELLED' || isTimeExpired;
  // Sadece Canlı müzayedelerde yalnızca LIVE durumunda teklif verilebilir
  const canBid = !isAuctionEnded && (isLiveOnly ? isLive : (hasAuctionStarted || isLive));
  const countdownTarget = liveEndTime ?? lot?.auction?.endDate ?? (hasAuctionStarted ? null : lot?.auction?.startDate) ?? null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3 sm:space-y-4">
      {/* Current Price */}
      <div className="text-center p-3 sm:p-4 rounded-lg bg-muted">
        <p className="text-xs sm:text-sm text-muted-foreground mb-1">Mevcut En Yüksek Teklif</p>
        <p className="text-2xl sm:text-3xl font-bold gold-text font-mono">{formatPrice(currentPrice)}</p>
      </div>

      {/* Countdown Timer */}
      {countdownTarget && (
        <div className="text-center p-2.5 sm:p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400 font-medium mb-2">
            {isLive ? '🔴 CANLI - Kalan Süre' : hasAuctionStarted ? '⏰ Bitiş Sayacı' : '📅 Müzayede Başlangıcına Kalan'}
          </p>
          <CountdownTimer endDate={countdownTarget} className="text-base sm:text-lg" />
          {hasAuctionStarted && !showTimeExtended && (
            <p className="text-[9px] text-muted-foreground mt-1">Son dakikada teklif gelirse süre uzatılır</p>
          )}
        </div>
      )}

      {/* Süre Uzatma Bannerı */}
      <AnimatePresence>
        {showTimeExtended && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="flex items-center gap-2 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/50 px-3 py-2"
          >
            <Zap className="h-4 w-4 text-[#d4af37] animate-pulse" />
            <span className="text-sm font-bold text-[#d4af37]">⚡ Süre uzatıldı!</span>
            <span className="text-xs text-[#d4af37]/70 ml-auto">Son dakika teklifi</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        <div className="text-center p-1.5 sm:p-2 rounded-lg bg-muted">
          <p className="text-sm sm:text-lg font-bold font-mono text-foreground">{formatPrice(lot?.startingPrice ?? 0)}</p>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground">Açılış</p>
        </div>
        <div className="text-center p-1.5 sm:p-2 rounded-lg bg-muted">
          <p className="text-sm sm:text-lg font-bold font-mono text-foreground">{bidCount}</p>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground">Teklif</p>
        </div>
        <div className="text-center p-1.5 sm:p-2 rounded-lg bg-muted">
          <p className="text-sm sm:text-lg font-bold font-mono text-foreground">{lot?.watchCount ?? lot?._count?.watchlist ?? 0}</p>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground">Takip</p>
        </div>
      </div>

      {/* Active Proxy Bid Indicator */}
      <AnimatePresence>
        {activeProxyBid?.isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/30 p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#d4af37]" />
                <div>
                  <p className="text-xs font-medium text-[#d4af37]">Otomatik Teklif Aktif</p>
                  <p className="text-[10px] text-muted-foreground">Maks: {formatPrice(activeProxyBid.maxAmount)}</p>
                </div>
              </div>
              <button
                onClick={handleCancelProxy}
                className="rounded-full p-1 hover:bg-red-500/20 transition-colors"
                title="İptal et"
              >
                <X className="h-3.5 w-3.5 text-red-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bid Input */}
      <div className="space-y-3">
        {!isProxy && (
          <div>
            <label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Teklif Tutarı</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₺</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={bidAmount || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setBidAmount(val ? Number(val) : 0);
                }}
                onFocus={(e) => {
                  if (bidAmount === 0 || bidAmount === minBid) {
                    setBidAmount(0);
                  }
                  setTimeout(() => e.target.select(), 0);
                }}
                onBlur={() => {
                  if (!bidAmount || bidAmount < minBid) setBidAmount(minBid);
                }}
                placeholder={formatPrice(minBid)}
                className="w-full rounded-lg border border-border bg-background py-2.5 sm:py-3 pl-8 pr-4 text-base sm:text-lg font-mono font-bold focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
              />
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Min. artış: {formatPrice(minIncrement)}</p>
            {/* Hizmet Bedeli Hesaplama */}
            {bidAmount > 0 && (
              <div className="mt-2 rounded-lg bg-muted border border-border p-2.5 space-y-1">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Info className="h-3 w-3 text-[#d4af37]" />
                  <span className="text-[10px] sm:text-xs font-medium text-[#d4af37]">Ödenecek Tutar Hesabı</span>
                </div>
                <div className="flex justify-between text-[10px] sm:text-xs">
                  <span className="text-muted-foreground">Çekiç Fiyatı</span>
                  <span className="font-mono">{formatPrice(bidAmount)}</span>
                </div>
                <div className="flex justify-between text-[10px] sm:text-xs">
                  <span className="text-muted-foreground">Hizmet Bedeli (%10)</span>
                  <span className="font-mono">{formatPrice(bidAmount * 0.10)}</span>
                </div>
                <div className="flex justify-between text-[10px] sm:text-xs">
                  <span className="text-muted-foreground">KDV (%{lot?.kdvRate ?? 20}, hizmet bedeli üzerinden)</span>
                  <span className="font-mono">{formatPrice(bidAmount * 0.10 * ((lot?.kdvRate ?? 20) / 100))}</span>
                </div>
                <div className="border-t border-border pt-1 mt-1 flex justify-between text-xs sm:text-sm font-bold">
                  <span className="text-foreground">Toplam Ödenecek</span>
                  <span className="text-[#d4af37] font-mono">{formatPrice(bidAmount + bidAmount * 0.10 + bidAmount * 0.10 * ((lot?.kdvRate ?? 20) / 100))}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Proxy Bidding Toggle */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted cursor-pointer" onClick={() => setIsProxy(!isProxy)}>
          <input
            type="checkbox"
            id="proxy"
            checked={isProxy}
            onChange={(e) => setIsProxy(e.target.checked)}
            className="rounded border-border accent-[#d4af37]"
          />
          <label htmlFor="proxy" className="text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer flex-1">
            <Zap className="h-3.5 w-3.5 text-[#d4af37]" />
            <span className="font-medium">Otomatik Teklif (Proxy)</span>
          </label>
        </div>

        <AnimatePresence>
          {isProxy && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <div className="rounded-lg bg-[#d4af37]/5 border border-[#d4af37]/20 p-3">
                <p className="text-xs text-[#d4af37] font-medium mb-2">Nasıl Çalışır?</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                  Belirlediğiniz maksimum tutara kadar sistem sizin adınıza otomatik olarak en düşük artışla teklif verir. 
                  Başka biri sizi geçerse, maksimum tutarınıza ulaşana kadar otomatik olarak tekrar teklif verilir.
                </p>
              </div>
              <div>
                <label className="text-xs sm:text-sm text-muted-foreground mb-1 block">Maksimum Teklif Tutarı</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₺</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={maxBidAmount || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setMaxBidAmount(val ? Number(val) : 0);
                    }}
                    onFocus={(e) => {
                      if (maxBidAmount === 0 || maxBidAmount === minBid) setMaxBidAmount(0);
                      setTimeout(() => e.target.select(), 0);
                    }}
                    onBlur={() => {
                      if (!maxBidAmount || maxBidAmount < minBid) setMaxBidAmount(minBid);
                    }}
                    placeholder={formatPrice(minBid)}
                    className="w-full rounded-lg border border-[#d4af37]/30 bg-background py-2.5 sm:py-3 pl-8 pr-4 text-base sm:text-lg font-mono font-bold focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Bu tutar gizli tutulur, sadece gerektiğinde kullanılır</p>
                {maxBidAmount > 0 && (
                  <div className="mt-2 rounded-lg bg-muted/50 border border-border p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Info className="h-3 w-3 text-[#d4af37]" />
                      <span className="text-[10px] sm:text-xs font-medium text-[#d4af37]">Maks. Tutar Hesabı</span>
                    </div>
                    <div className="flex justify-between text-[10px] sm:text-xs">
                      <span className="text-muted-foreground">Maks. Çekiç Fiyatı</span>
                      <span className="font-mono">{formatPrice(maxBidAmount)}</span>
                    </div>
                    <div className="border-t border-border pt-1 mt-1 flex justify-between text-xs sm:text-sm font-bold">
                      <span className="text-foreground">Maks. Ödenecek</span>
                      <span className="text-[#d4af37] font-mono">{formatPrice(maxBidAmount + maxBidAmount * 0.10 + maxBidAmount * 0.10 * ((lot?.kdvRate ?? 20) / 100))}</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isLive && lot?.liveEndTime ? (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-center">
            <p className="text-xs sm:text-sm font-medium text-red-400">🔴 Bu lot canlı müzayedede</p>
            <p className="text-[10px] text-muted-foreground mt-1">Teklif vermek için canlı müzayede sayfasına gidin</p>
            <a href={`/canli/${lot?.auction?.id}`} className="inline-block mt-2 text-xs font-medium text-[#d4af37] hover:underline">Canlı Müzayedeye Git →</a>
          </div>
        ) : !canBid ? (
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-center">
            {isAuctionEnded ? (
              <>
                <p className="text-xs sm:text-sm font-medium text-amber-400">⏰ Müzayede Süresi Doldu</p>
                <p className="text-[10px] text-muted-foreground mt-1">Bu müzayede sona ermiştir. Artık teklif verilemez.</p>
                {bidCount > 0 && (
                  <p className="text-sm font-bold text-[#d4af37] mt-2">🏆 Kazanan Teklif: {formatPrice(currentPrice)}</p>
                )}
              </>
            ) : (
              <>
                <p className="text-xs sm:text-sm font-medium text-amber-400">{isLiveOnly ? '🔴 Canlı müzayede henüz başlamadı' : '📅 Müzayede henüz başlamadı'}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{isLiveOnly ? 'Canlı müzayede başladığında teklif verebilirsiniz' : 'Müzayede başladığında teklif verebilirsiniz'}</p>
              </>
            )}
          </div>
        ) : isHighestBidder && !isProxy ? (
          <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-3 text-center">
            <p className="text-xs sm:text-sm font-medium text-green-400">✓ En yüksek teklif sizde</p>
            <p className="text-[10px] text-muted-foreground mt-1">Korumak için Otomatik Teklif özelliğini açın</p>
          </div>
        ) : (
          <button
            onClick={handleBid}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#d4af37] py-2.5 sm:py-3 text-black font-bold text-sm sm:text-base hover:bg-[#c9a430] transition-colors disabled:opacity-50"
          >
            {isProxy ? (
              <><Zap className="h-4 w-4 sm:h-5 sm:w-5" /> {loading ? 'Ayarlanıyor...' : 'Otomatik Teklif Kur'}</>
            ) : (
              <><Gavel className="h-4 w-4 sm:h-5 sm:w-5" /> {loading ? 'Teklif Veriliyor...' : 'Pey Ver'}</>
            )}
          </button>
        )}
      </div>

      {/* Bid Confirm Modal */}
      <BidConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmBid}
        loading={loading}
        lotTitle={lot?.title ?? 'Lot'}
        lotNumber={lot?.lotNumber ?? 0}
        bidAmount={bidAmount}
        isProxy={isProxy}
        maxBidAmount={isProxy ? maxBidAmount : undefined}
        auctionTitle={lot?.auction?.title}
        paymentDays={lot?.auction?.paymentDays ?? 5}
        kdvRate={lot?.kdvRate ?? 20}
      />

    </div>
  );
}
