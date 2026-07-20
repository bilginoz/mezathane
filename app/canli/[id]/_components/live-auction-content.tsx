'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, Clock, Users, TrendingUp, CheckCircle, XCircle, ArrowRight, ArrowLeft, Radio, Zap, ChevronLeft, ChevronRight, X, ZoomIn, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';
import { getMinBidIncrement } from '@/lib/utils';
import { SwipeToBid } from '@/components/swipe-to-bid';

export function LiveAuctionContent({ auctionId }: { auctionId: string }) {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [lastBidError, setLastBidError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [inspectLot, setInspectLot] = useState<any>(null);
  const [showTimeExtended, setShowTimeExtended] = useState(false);
  const prevTimeLeftRef = useRef(0);
  const [pauseLeft, setPauseLeft] = useState(0);

  const fetchLiveData = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${auctionId}`);
      const d = await res.json();
      setData(d);
      if (d.currentLot?.liveEndTime) {
        const left = new Date(d.currentLot.liveEndTime).getTime() - Date.now();
        const newTimeLeft = Math.max(0, Math.ceil(left / 1000));
        // Süre uzatma tespiti: önceki süre azalırken aniden arttıysa
        if (prevTimeLeftRef.current > 0 && newTimeLeft > prevTimeLeftRef.current + 2) {
          setShowTimeExtended(true);
          setTimeout(() => setShowTimeExtended(false), 4000);
        }
        prevTimeLeftRef.current = newTimeLeft;
        setTimeLeft(newTimeLeft);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  // Poll every 2 seconds
  useEffect(() => {
    fetchLiveData();
    pollRef.current = setInterval(fetchLiveData, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchLiveData]);

  // Timer countdown
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            fetchLiveData(); // Trigger lot transition
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timeLeft, fetchLiveData]);

  // SATILDI ara ekranı geri sayımı
  useEffect(() => {
    if (data?.isPaused && data?.pauseUntil) {
      const tick = () => {
        const left = Math.max(0, Math.ceil((new Date(data.pauseUntil).getTime() - Date.now()) / 1000));
        setPauseLeft(left);
        if (left <= 0) fetchLiveData(); // Duraklama bitti, sonraki lota geç
      };
      tick();
      const iv = setInterval(tick, 250);
      return () => clearInterval(iv);
    } else {
      setPauseLeft(0);
    }
  }, [data?.isPaused, data?.pauseUntil, fetchLiveData]);

  // Swipe-to-bid: send the system-calculated next minimum bid
  const handleSwipeBid = async () => {
    if (!session?.user) { toast.error('Giriş yapmalısınız'); return; }
    if (!data?.currentLot) return;
    if (bidding) return; // double-tap guard

    const cp = data.currentLot.currentPrice || data.currentLot.startingPrice;
    const inc = getMinBidIncrement(cp, data.currentLot.customBidIncrement);
    const swipeAmount = cp + inc;

    setBidding(true);
    setLastBidError(null);
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotId: data.currentLot.id, amount: swipeAmount, type: 'MANUAL', source: 'live' }),
      });
      const result = await res.json();
      if (!res.ok) {
        if (result?.needsVerification) {
          toast.error('Teklif verebilmek için e-posta adresinizi doğrulamanız gerekiyor.');
          router.push('/dogrulama');
          return;
        }
        // Price changed while swiping — show inline error & auto-refresh
        if (result.error?.includes('düşük') || result.error?.includes('az') || result.error?.includes('minimum')) {
          setLastBidError('Fiyat değişti — güncel tutar aşağıda.');
          toast.error('Fiyat değişti, güncel tutar güncellendi');
          fetchLiveData();
          return;
        }
        toast.error(result.error ?? 'Teklif verilemedi');
        return;
      }
      toast.success(`${formatPrice(swipeAmount)} teklif verildi!`);
      setLastBidError(null);
      fetchLiveData();
    } catch {
      toast.error('Hata oluştu');
    } finally {
      setBidding(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="h-96 bg-muted rounded-xl" />
          </div>
        </div>
      </main>
    );
  }

  if (!data?.isLive && !data?.isCompleted) {
    return (
      <main className="flex-1 py-16">
        <div className="mx-auto max-w-[600px] px-4 text-center">
          <Radio className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h1 className="font-display text-2xl font-bold mb-2">Müzayede Henüz Canlı Değil</h1>
          <p className="text-muted-foreground">
            {data?.auction?.liveStartDate
              ? `Canlı müzayede ${new Date(data.auction.liveStartDate).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} tarihinde başlayacak.`
              : 'Bu müzayede henüz canlıya geçmedi.'}
          </p>
        </div>
      </main>
    );
  }

  if (data?.isCompleted) {
    return (
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="text-center mb-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold mb-2">Müzayede Tamamlandı</h1>
            <p className="text-muted-foreground">{data.auction?.title}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(data.completedLots ?? []).map((lot: any) => (
              <div key={lot.id} className="rounded-xl border border-border bg-card overflow-hidden">
                {lot.image && (
                  <div className="relative aspect-square bg-muted">
                    <Image src={lot.image} alt={lot.title ?? ''} fill className="object-cover" />
                  </div>
                )}
                <div className="p-3">
                  <p className="text-xs text-muted-foreground">Lot #{lot.lotNumber}</p>
                  <p className="text-sm font-medium truncate">{lot.title}</p>
                  <p className={`text-sm font-bold mt-1 ${lot.status === 'SOLD' ? 'text-green-400' : 'text-red-400'}`}>
                    {lot.status === 'SOLD' ? formatPrice(lot.soldPrice ?? 0) : 'Satılmadı'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const currentLot = data?.currentLot;
  const currentPrice = currentLot?.currentPrice || currentLot?.startingPrice || 0;
  const minIncrement = getMinBidIncrement(currentPrice, currentLot?.customBidIncrement);
  const minBid = currentPrice + minIncrement;
  const timerPercent = data?.auction?.liveTimePerLot ? (timeLeft / data.auction.liveTimePerLot) * 100 : 0;
  const isUrgent = timeLeft <= 10;

  return (
    <main className="flex-1 py-6">
      {/* SATILDI ara ekranı (yalnızca satılan lotlarda) */}
      <AnimatePresence>
        {data?.isPaused && data?.soldLot && (
          <motion.div
            key="sold-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.6, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="relative w-full max-w-md rounded-2xl border-2 border-[#d4af37] bg-gradient-to-b from-[#1a1a1a] to-[#0d0d0d] p-8 text-center shadow-2xl"
            >
              <motion.div
                initial={{ rotate: -25, scale: 0.5 }}
                animate={{ rotate: [-25, 8, -6, 0], scale: 1 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="mx-auto mb-3 text-6xl"
              >
                🔨
              </motion.div>
              <motion.h2
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
                className="font-display text-4xl font-extrabold tracking-wide text-[#d4af37] drop-shadow"
              >
                SATILDI!
              </motion.h2>

              {data.soldLot.image && (
                <div className="relative mx-auto mt-4 h-28 w-28 overflow-hidden rounded-xl border border-[#d4af37]/40 bg-muted">
                  <Image src={data.soldLot.image} alt={data.soldLot.title ?? ''} fill className="object-cover" />
                </div>
              )}

              <p className="mt-4 text-sm text-white/70">Lot #{data.soldLot.lotNumber}</p>
              <p className="mt-0.5 line-clamp-2 text-lg font-semibold text-white">{data.soldLot.title}</p>
              <p className="mt-3 text-3xl font-extrabold text-green-400">{formatPrice(data.soldLot.soldPrice ?? 0)}</p>
              <p className="mt-2 text-sm text-white/80">Kazanan: <span className="font-semibold text-[#d4af37]">{data.soldLot.winnerName}</span></p>

              <p className="mt-5 text-xs text-white/50">
                {pauseLeft > 0 ? `Sıradaki lot ${pauseLeft} sn içinde...` : 'Sıradaki lota geçiliyor...'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tek seferlik katılım onayı overlay */}
      <AnimatePresence>
        {data?.isLive && session?.user && !hasConsented && !((session?.user as any)?.sellerProfileId && (session?.user as any)?.sellerProfileId === data?.auction?.sellerId) && (
          <motion.div
            key="consent-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md rounded-2xl border border-[#d4af37]/40 bg-gradient-to-b from-card to-background p-6 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#d4af37]/15">
                  <ShieldCheck className="h-8 w-8 text-[#d4af37]" />
                </div>
                <h2 className="font-display text-xl font-bold mb-1">Canlı Müzayedeye Katılım</h2>
                <p className="text-sm text-muted-foreground mb-5">{data?.auction?.title}</p>

                <label className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-left cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={e => setConsentChecked(e.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded border-[#d4af37] text-[#d4af37] focus:ring-[#d4af37] accent-[#d4af37] flex-shrink-0"
                  />
                  <span className="text-sm leading-relaxed text-foreground">
                    Bu canlı müzayedede kaydırarak vereceğim tekliflerin <strong>bağlayıcı</strong> olduğunu, geri alınamayacağını ve cayma hakkımın bulunmadığını, <a href="/yasal/muzayede-kurallari" target="_blank" className="text-[#d4af37] underline hover:text-[#c4a030]">Müzayede Şartnamesi</a> hükümlerini kabul ettiğimi onaylıyorum.
                  </span>
                </label>

                <div className="flex gap-3 w-full mt-5">
                  <button
                    onClick={() => router.back()}
                    className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    Geri Dön
                  </button>
                  <button
                    onClick={() => { if (consentChecked) setHasConsented(true); }}
                    disabled={!consentChecked}
                    className="flex-1 rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black hover:bg-[#c4a030] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Onaylıyorum ve Katıl
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-[1200px] px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="rounded-lg border border-border p-2 hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600 text-white text-sm font-bold animate-pulse">
            <Radio className="h-4 w-4" /> CANLI
          </div>
          <h1 className="font-display text-xl font-bold">{data?.auction?.title}</h1>
          <span className="text-sm text-muted-foreground ml-auto">
            Lot {(data?.completedLots?.length ?? 0) + 1} / {data?.auction?.totalLots ?? 0}
          </span>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Current Lot - Main View */}
          <div className="lg:col-span-2">
            {currentLot ? (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Timer Bar */}
                <div className="relative h-2 bg-muted">
                  <motion.div
                    className={`h-full ${isUrgent ? 'bg-red-500' : 'bg-[#d4af37]'}`}
                    animate={{ width: `${timerPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                <div className="grid md:grid-cols-2">
                  {/* Image with Gallery */}
                  <div className="relative aspect-square bg-muted">
                    {(currentLot.images?.length > 0 || currentLot.image) ? (
                      <>
                        <Image
                          src={currentLot.images?.[selectedImageIdx]?.imageUrl ?? currentLot.image ?? ''}
                          alt={currentLot.title ?? ''}
                          fill
                          className="object-contain cursor-zoom-in"
                          onClick={() => setLightboxOpen(true)}
                        />
                        {/* Gallery Navigation */}
                        {currentLot.images?.length > 1 && (
                          <>
                            <button
                              onClick={() => setSelectedImageIdx(p => p > 0 ? p - 1 : (currentLot.images?.length ?? 1) - 1)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 hover:bg-black/80 transition-colors"
                            >
                              <ChevronLeft className="h-4 w-4 text-white" />
                            </button>
                            <button
                              onClick={() => setSelectedImageIdx(p => p < (currentLot.images?.length ?? 1) - 1 ? p + 1 : 0)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-1.5 hover:bg-black/80 transition-colors"
                            >
                              <ChevronRight className="h-4 w-4 text-white" />
                            </button>
                            {/* Dots */}
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                              {currentLot.images.map((_: any, i: number) => (
                                <button key={i} onClick={() => setSelectedImageIdx(i)}
                                  className={`h-1.5 w-1.5 rounded-full transition-colors ${i === selectedImageIdx ? 'bg-[#d4af37]' : 'bg-white/50'}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                        {/* Zoom button */}
                        <button
                          onClick={() => setLightboxOpen(true)}
                          className="absolute bottom-3 right-3 rounded-lg bg-black/60 p-2 hover:bg-black/80 transition-colors"
                        >
                          <ZoomIn className="h-4 w-4 text-white" />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Gavel className="h-16 w-16 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 rounded-lg bg-black/70 px-3 py-1 text-sm font-bold text-white">
                      Lot #{currentLot.lotNumber}
                    </div>
                  </div>

                  {/* Info & Bidding */}
                  <div className="p-6 flex flex-col">
                    <h2 className="font-display text-xl font-bold mb-2">{currentLot.title}</h2>
                    {currentLot.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{currentLot.description}</p>
                    )}

                    {/* Timer */}
                    <div className={`flex items-center gap-3 mb-2 p-3 rounded-lg transition-all duration-300 ${isUrgent ? 'bg-red-500/20 border border-red-500/50' : 'bg-muted/50'} ${showTimeExtended ? 'ring-2 ring-[#d4af37] ring-offset-1 ring-offset-background' : ''}`}>
                      <Clock className={`h-6 w-6 ${isUrgent ? 'text-red-500 animate-pulse' : 'text-[#d4af37]'}`} />
                      <span className={`text-3xl font-mono font-bold ${isUrgent ? 'text-red-500' : 'text-foreground'}`}>
                        {timeLeft}s
                      </span>
                      {isUrgent && !showTimeExtended && <span className="text-xs text-red-400 animate-pulse">Son saniyeler!</span>}
                    </div>
                    <AnimatePresence>
                      {showTimeExtended && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          className="mb-2 flex items-center gap-2 rounded-lg bg-[#d4af37]/20 border border-[#d4af37]/50 px-3 py-2"
                        >
                          <Zap className="h-4 w-4 text-[#d4af37] animate-pulse" />
                          <span className="text-sm font-bold text-[#d4af37]">⚡ Süre uzatıldı!</span>
                          <span className="text-xs text-[#d4af37]/80 ml-auto">Son dakika teklifi</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Current Price */}
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground">Güncel Fiyat</p>
                      <p className="text-2xl font-bold font-mono text-[#d4af37]">{formatPrice(currentPrice)}</p>
                      <p className="text-xs text-muted-foreground">{currentLot.bidCount} teklif</p>
                    </div>

                    {/* Swipe-to-Bid */}
                    <div className="mt-auto space-y-2">
                      {((session?.user as any)?.sellerProfileId && (session?.user as any)?.sellerProfileId === data?.auction?.sellerId) ? (
                        <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                          <p className="text-xs text-muted-foreground">Kendi ilanınıza teklif veremezsiniz.</p>
                        </div>
                      ) : !session?.user ? (
                        <button
                          onClick={() => router.push('/giris')}
                          className="w-full rounded-lg bg-[#d4af37] py-3 text-sm font-bold text-black hover:bg-[#c4a030] transition-colors"
                        >
                          Teklif Vermek İçin Giriş Yapın
                        </button>
                      ) : !hasConsented ? (
                        <button
                          onClick={() => {}} // noop — overlay handles consent
                          className="w-full rounded-lg border-2 border-[#d4af37]/50 py-3 text-sm font-medium text-[#d4af37]/70 cursor-default"
                        >
                          Teklif vermek için müzayedeye katılın
                        </button>
                      ) : (
                        <>
                          {lastBidError && (
                            <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-xs text-red-400 font-medium text-center">
                              {lastBidError}
                            </div>
                          )}
                          <SwipeToBid
                            amount={minBid}
                            onSwipeComplete={handleSwipeBid}
                            disabled={timeLeft === 0}
                            loading={bidding}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recent Bids */}
                <div className="border-t border-border p-4">
                  <h3 className="text-sm font-semibold mb-2">Son Teklifler</h3>
                  <div className="space-y-1">
                    {(currentLot.topBids ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">Henüz teklif yok</p>
                    ) : (
                      (currentLot.topBids ?? []).map((bid: any, i: number) => (
                        <div key={i} className={`flex items-center gap-2 text-sm rounded-lg px-2 py-1 ${i === 0 ? 'bg-[#d4af37]/10' : ''}`}>
                          <span className={`font-mono font-bold ${i === 0 ? 'text-[#d4af37]' : 'text-muted-foreground'}`}>
                            {formatPrice(bid.amount)}
                          </span>
                          <span className="text-muted-foreground text-xs">{bid.userName}</span>
                          {i === 0 && <TrendingUp className="h-3 w-3 text-[#d4af37] ml-auto" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Sonraki lot hazırlanıyor...</p>
              </div>
            )}
          </div>

          {/* Sidebar - Lots Queue */}
          <div className="space-y-4">
            {/* Upcoming Lots */}
            <div className="rounded-xl border border-border bg-card">
              <div className="p-3 border-b border-border">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-[#d4af37]" /> Sıradaki Lotlar
                </h3>
              </div>
              <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                {(data?.nextLots ?? []).length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">Son lot</p>
                ) : (
                  (data?.nextLots ?? []).map((lot: any) => (
                    <div key={lot.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setInspectLot(lot)}>
                      {lot.image && (
                        <div className="relative h-10 w-10 rounded bg-muted overflow-hidden shrink-0">
                          <Image src={lot.image} alt="" fill className="object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Lot #{lot.lotNumber}</p>
                        <p className="text-sm font-medium truncate">{lot.title}</p>
                        <p className="text-xs text-muted-foreground">{formatPrice(lot.startingPrice)}</p>
                      </div>
                      <ZoomIn className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Completed Lots */}
            <div className="rounded-xl border border-border bg-card">
              <div className="p-3 border-b border-border">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" /> Tamamlanan
                </h3>
              </div>
              <div className="divide-y divide-border max-h-[300px] overflow-y-auto">
                {(data?.completedLots ?? []).length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">Henüz yok</p>
                ) : (
                  (data?.completedLots ?? []).map((lot: any) => (
                    <div key={lot.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setInspectLot(lot)}>
                      {lot.image && (
                        <div className="relative h-10 w-10 rounded bg-muted overflow-hidden shrink-0">
                          <Image src={lot.image} alt="" fill className="object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Lot #{lot.lotNumber}</p>
                        <p className="text-sm font-medium truncate">{lot.title}</p>
                      </div>
                      <div className="text-right">
                        {lot.status === 'SOLD' ? (
                          <p className="text-sm font-bold text-green-400">{formatPrice(lot.soldPrice ?? 0)}</p>
                        ) : (
                          <p className="text-xs text-red-400">Satılmadı</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lightbox for current lot images */}
        <AnimatePresence>
          {lightboxOpen && currentLot && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
              onClick={() => setLightboxOpen(false)}
            >
              <button className="absolute top-4 right-4 rounded-full bg-white/10 p-2 hover:bg-white/20 transition-colors" onClick={() => setLightboxOpen(false)}>
                <X className="h-6 w-6 text-white" />
              </button>
              <div className="relative max-w-4xl w-full aspect-square" onClick={e => e.stopPropagation()}>
                <Image
                  src={currentLot.images?.[selectedImageIdx]?.imageUrl ?? currentLot.image ?? ''}
                  alt={currentLot.title ?? ''}
                  fill
                  className="object-contain"
                />
                {currentLot.images?.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImageIdx(p => p > 0 ? p - 1 : (currentLot.images?.length ?? 1) - 1)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 hover:bg-black/80"
                    >
                      <ChevronLeft className="h-6 w-6 text-white" />
                    </button>
                    <button
                      onClick={() => setSelectedImageIdx(p => p < (currentLot.images?.length ?? 1) - 1 ? p + 1 : 0)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 hover:bg-black/80"
                    >
                      <ChevronRight className="h-6 w-6 text-white" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inspect Lot Modal */}
        <AnimatePresence>
          {inspectLot && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
              onClick={() => setInspectLot(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-card rounded-xl border border-border max-w-lg w-full max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-display font-semibold">Lot #{inspectLot.lotNumber} - {inspectLot.title}</h3>
                  <button onClick={() => setInspectLot(null)} className="rounded-full p-1 hover:bg-muted transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {(inspectLot.images?.length > 0 || inspectLot.image) && (
                  <div className="relative aspect-[4/3] bg-muted">
                    <Image
                      src={inspectLot.images?.[0]?.imageUrl ?? inspectLot.image ?? ''}
                      alt={inspectLot.title ?? ''}
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
                <div className="p-4 space-y-3">
                  {inspectLot.description && (
                    <p className="text-sm text-muted-foreground">{inspectLot.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Başlangıç Fiyatı</p>
                      <p className="font-bold font-mono text-[#d4af37]">{formatPrice(inspectLot.startingPrice)}</p>
                    </div>
                    {inspectLot.estimatedPrice && (
                      <div>
                        <p className="text-xs text-muted-foreground">Tahmini Değer</p>
                        <p className="font-bold font-mono">{formatPrice(inspectLot.estimatedPrice)}</p>
                      </div>
                    )}
                    {inspectLot.status === 'SOLD' && (
                      <div>
                        <p className="text-xs text-muted-foreground">Satış Fiyatı</p>
                        <p className="font-bold font-mono text-green-400">{formatPrice(inspectLot.soldPrice)}</p>
                      </div>
                    )}
                  </div>
                  {/* Thumbnails */}
                  {inspectLot.images?.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                      {inspectLot.images.map((img: any, i: number) => (
                        <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-border">
                          <Image src={img.imageUrl} alt="" fill className="object-cover" sizes="64px" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
