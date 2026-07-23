'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Share2, ChevronLeft, ChevronRight, Store, Tag, ArrowLeft, Users, Timer, Search, Maximize2, MessageCircle, Gavel, Zap, Clock, CreditCard, Package } from 'lucide-react';
import { VerifiedBadge } from '@/components/verified-badge';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { BidPanel } from '@/components/bid-panel';
import { CountdownTimer } from '@/components/countdown-timer';
import { SocialShare } from '@/components/social-share';
import { Lightbox } from '@/components/lightbox';

import { toast } from 'sonner';

export function LotDetailContent({ lot }: { lot: any }) {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [currentImage, setCurrentImage] = useState(0);
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionSent, setQuestionSent] = useState(false);
  const [watching, setWatching] = useState(false);
  const [liveBids, setLiveBids] = useState<any[]>(lot?.bids ?? []);
  const [liveCurrentPrice, setLiveCurrentPrice] = useState<number>(lot?.currentPrice ?? lot?.startingPrice ?? 0);
  const [liveEndTime, setLiveEndTime] = useState<string | null>(lot?.liveEndTime ?? lot?.auction?.endDate ?? null);
  const images = lot?.images ?? [];
  const [isHovering, setIsHovering] = useState(false);
  const [isCoarse, setIsCoarse] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const mainImgRef = useRef<HTMLImageElement | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isPinching, setIsPinching] = useState(false);
  useEffect(() => {
    setMounted(true);
    // Dokunmatik / kaba işaretçi (telefon-tablet) cihazı tespit et
    if (typeof window !== 'undefined' && window.matchMedia) {
      setIsCoarse(window.matchMedia('(hover: none), (pointer: coarse)').matches);
    }
  }, []);

  // Görsel değişince yükleme durumunu sıfırla; önbellekten gelen (cached) görsellerde
  // mobil tarayıcılarda onLoad tetiklenmeyebildiği için complete bayrağını da kontrol et.
  useEffect(() => {
    setImageLoaded(false);
    const check = () => {
      const el = mainImgRef.current;
      if (el && el.complete && el.naturalWidth > 0) setImageLoaded(true);
    };
    check();
    setIsHovering(false); // yeni görselde yakınlaştırmayı sıfırla
    const t1 = setTimeout(check, 150);
    const t2 = setTimeout(check, 600);
    // Hiçbir olay tetiklenmese bile spinner kalıcı olmasın diye güvenlik ağı
    const safety = setTimeout(() => setImageLoaded(true), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(safety); };
  }, [currentImage]);

  const auctionStatus = lot?.auction?.status;
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
  const isAuctionEnded = auctionStatus === 'COMPLETED' || auctionStatus === 'CANCELLED' || isTimeExpired;
  const canBid = !isAuctionEnded && (auctionStatus === 'ACTIVE' || auctionStatus === 'LIVE');
  const isOwnLot = (session?.user as any)?.sellerProfileId && (session?.user as any)?.sellerProfileId === lot?.auction?.sellerId;
  const showBidBar = mounted && canBid && !isOwnLot;

  // Mobil "Pey Ver" çubuğu görünürken WhatsApp butonunu yukarı taşımak için gövdeye işaret koy
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (showBidBar) document.body.setAttribute('data-bidbar', '1');
    else document.body.removeAttribute('data-bidbar');
    return () => { document.body.removeAttribute('data-bidbar'); };
  }, [showBidBar]);

  // Swipe handlers for mobile gallery
  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    // İki parmak (pinch) algıla — hiçbir şey yapma
    if (e.touches.length >= 2) {
      setIsPinching(true);
      return;
    }
    setIsPinching(false);
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length >= 2) {
      setIsPinching(true);
      return;
    }
    if (isPinching) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (isPinching) {
      setIsPinching(false);
      setTouchStart(null);
      setTouchEnd(null);
      return;
    }
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (Math.abs(distance) >= minSwipeDistance) {
      if (distance > 0) nextImage(); // sola kaydır = sonraki
      else prevImage(); // sağa kaydır = önceki
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Sonraki görselleri arka planda preload et
  useEffect(() => {
    if (!images?.length) return;
    images.forEach((img: any, idx: number) => {
      if (idx === 0) return; // İlk zaten priority ile yükleniyor
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'image';
      link.href = img?.imageUrl ?? '';
      if (link.href) document.head.appendChild(link);
    });
  }, [images]);

  // Teklif listesi ve geri sayım güncelleme
  useEffect(() => {
    if (!lot?.id) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/bids?lotId=${lot.id}`);
        const data = await res.json();
        if (data?.bids) setLiveBids(data.bids);
        if (data?.lot) {
          if (data.lot.currentPrice) setLiveCurrentPrice(data.lot.currentPrice);
          const t = data.lot.liveEndTime ?? data.lot.auction?.endDate ?? null;
          if (t) setLiveEndTime(t);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(poll);
  }, [lot?.id]);
  const hasImages = (images?.length ?? 0) > 0;
  const defaultImg = 'https://cdn.abacus.ai/images/46235948-79f3-4f4e-aab0-cdfd81b98b42.png';

  const handleWatch = async () => {
    if (!session?.user) {
      toast.error('Favori eklemek için giriş yapın');
      return;
    }
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotId: lot.id }),
      });
      const data = await res.json();
      setWatching(data?.watching ?? false);
      toast.success(data?.watching ? 'Favorilere eklendi — müzayede öncesi hatırlatılacak!' : 'Favorilerden çıkarıldı');
    } catch {
      toast.error('Hata oluştu');
    }
  };

  const handleShare = async () => {
    try {
      if (navigator?.share) {
        await navigator.share({ title: lot?.title, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link kopyalandı!');
      }
    } catch {}
  };

  const prevImage = () => { setImageLoaded(false); setCurrentImage((p) => (p > 0 ? p - 1 : (images?.length ?? 1) - 1)); };
  const nextImage = () => { setImageLoaded(false); setCurrentImage((p) => (p < (images?.length ?? 1) - 1 ? p + 1 : 0)); };

  return (
    <main className="flex-1 py-6">
      <div className="mx-auto max-w-[1200px] px-4">
        {/* Breadcrumb + Geri */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Geri
          </button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/muzayede/${lot?.auction?.id ?? ''}`} className="hover:text-[#d4af37] transition-colors">
              {lot?.auction?.title ?? 'Müzayede'}
            </Link>
            <span>/</span>
            <span>Lot {lot?.lotNumber ?? 0}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-8">
          {/* Left - Images */}
          <div className="lg:col-span-3 space-y-4">
            <div
              className="relative aspect-square rounded-xl overflow-hidden bg-muted group touch-manipulation"
              onMouseEnter={() => { if (!isCoarse) setIsHovering(true); }}
              onMouseLeave={() => { if (!isCoarse) setIsHovering(false); }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onClick={(e) => {
                // Pinch sonrası tetiklenen click'i atla
                if (isPinching) return;
                // Mobil/dokunmatik: tek dokunuş yakınlaştır, tekrar dokunuş uzaklaştır.
                if (!isCoarse) return;
                if ((e.target as HTMLElement).closest('button, a')) return; // ikon/butonlara dokunulduysa atla
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setZoomPos({ x: isNaN(x) ? 50 : x, y: isNaN(y) ? 50 : y });
                setIsHovering((p) => !p);
              }}
              onMouseMove={(e) => {
                if (isCoarse) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                setZoomPos({ x, y });
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0"
                >
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                      <div className="text-center">
                        <div className="h-8 w-8 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Yükleniyor...</p>
                      </div>
                    </div>
                  )}
                  <Image
                    src={images?.[currentImage]?.imageUrl ?? defaultImg}
                    alt={lot?.title ?? 'Lot'}
                    fill
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className={`object-contain transition-opacity duration-300 ${isHovering ? 'opacity-0' : imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    priority={currentImage === 0}
                    ref={mainImgRef}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageLoaded(true)}
                  />
                </motion.div>
              </AnimatePresence>
              {/* Hover Zoom - arka plan olarak büyütülmüş görüntü */}
              {isHovering && (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${images?.[currentImage]?.imageUrl ?? defaultImg})`,
                    backgroundSize: '250%',
                    backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                    backgroundRepeat: 'no-repeat',
                    cursor: 'crosshair',
                  }}
                />
              )}
              {/* Zoom göstergesi - sadece masaüstünde */}
              <div className="absolute bottom-3 left-3 rounded-full bg-black/50 backdrop-blur-sm px-2.5 py-1 text-[10px] text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none hidden md:flex">
                <Search className="h-3 w-3" /> Yakınlaştırmak için fare ile gezdirin
              </div>
              {/* Dokunma ipucu - sadece mobilde */}
              <div className="absolute bottom-3 left-3 rounded-full bg-black/50 backdrop-blur-sm px-2.5 py-1 text-[10px] text-white flex items-center gap-1 md:hidden pointer-events-none">
                <Search className="h-3 w-3" /> {isHovering ? 'Küçültmek için dokun' : 'Yakınlaştırmak için dokun'}{(images?.length ?? 0) > 1 ? ' • kaydır' : ''}
              </div>
              {/* Tam ekran butonu */}
              <button
                onClick={() => setLightboxOpen(true)}
                className="absolute top-3 left-3 rounded-full bg-black/50 p-2.5 text-white hover:bg-black/70 backdrop-blur-sm md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                title="Tam ekran görüntüle"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
              {hasImages && (images?.length ?? 0) > 1 && (
                <>
                  <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1">
                    {(images ?? []).map((_: any, idx: number) => (
                      <button key={idx} onClick={() => { setImageLoaded(false); setCurrentImage(idx); }} className={`h-2 w-2 rounded-full transition-colors ${idx === currentImage ? 'bg-[#d4af37]' : 'bg-white/50'}`} />
                    ))}
                  </div>
                </>
              )}
              {/* Action buttons */}
              <div className="absolute top-3 right-3 flex gap-2">
                <button onClick={handleWatch} className={`rounded-full p-2.5 backdrop-blur-sm transition-colors ${watching ? 'bg-[#d4af37] text-black' : 'bg-black/50 text-white hover:bg-black/70'}`} title={watching ? 'Favorilerden çıkar' : 'Favorilere ekle & hatırlat'}>
                  <Heart className={`h-4 w-4 ${watching ? 'fill-current' : ''}`} />
                </button>
                {watching && (
                  <span className="absolute -bottom-6 right-0 whitespace-nowrap text-[10px] bg-[#d4af37] text-black px-2 py-0.5 rounded-full font-medium shadow">
                    🔔 Hatırlatma aktif
                  </span>
                )}
                <div className="relative">
                  <button onClick={() => setShowShareMenu(!showShareMenu)} className="rounded-full bg-black/50 p-2.5 text-white hover:bg-black/70 backdrop-blur-sm">
                    <Share2 className="h-4 w-4" />
                  </button>
                  {showShareMenu && (
                    <div className="absolute right-0 top-full mt-2 z-50">
                      <SocialShare
                        title={lot?.title ?? 'Lot'}
                        text={`${lot?.title ?? ''} - ${lot?.auction?.title ?? 'Müzayede'}`}
                        compact
                        onClose={() => setShowShareMenu(false)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Thumbnails */}
            {hasImages && (images?.length ?? 0) > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {(images ?? []).map((img: any, idx: number) => (
                  <button
                    key={img?.id ?? idx}
                    onClick={() => { setImageLoaded(false); setCurrentImage(idx); }}
                    className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden border-2 transition-colors ${idx === currentImage ? 'border-[#d4af37]' : 'border-transparent hover:border-border'}`}
                  >
                    <div className="relative w-full h-full">
                      <Image src={img?.imageUrl ?? defaultImg} alt="" fill className="object-cover" sizes="64px" loading="lazy" quality={50} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Store className="h-4 w-4 text-[#d4af37]" />
                <Link href={`/muzayede-evi/${lot?.auction?.sellerId ?? ''}`} className="hover:text-[#d4af37] transition-colors flex items-center gap-1">{lot?.auction?.seller?.companyName ?? ''}{lot?.auction?.seller?.isVerified && <VerifiedBadge size="sm" />}</Link>
                <span className="mx-1">·</span>
                <Link href={`/muzayede/${lot?.auction?.id ?? ''}`} className="hover:text-[#d4af37] transition-colors">{lot?.auction?.title ?? ''}</Link>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#d4af37]/10 px-3 py-0.5 text-xs font-medium text-[#d4af37]">Lot {lot?.lotNumber ?? 0}</span>
                {(lot?.lotCategories?.length ? lot.lotCategories : (lot?.category ? [{ category: lot.category }] : [])).map((lc: any, i: number) => (
                  <span key={i} className="rounded-full bg-muted px-3 py-0.5 text-xs text-muted-foreground flex items-center gap-1">
                    <Tag className="h-3 w-3" /> {lc.category?.name}
                  </span>
                ))}
              </div>
              <h1 className="font-display text-lg sm:text-xl md:text-2xl font-bold">{lot?.title ?? ''}</h1>
              {lot?.description && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{lot.description}</p>
              )}
              {lot?.notes && (
                <p className="text-xs text-muted-foreground italic border-t border-border pt-3">{lot.notes}</p>
              )}
              {(lot?.condition || lot?.provenance) && (
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-3 mt-1 space-y-2">
                  {lot?.condition && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">Durum / Kondisyon</span>
                      <span className="text-sm font-semibold">{lot.condition}</span>
                    </div>
                  )}
                  {lot?.provenance && (
                    <div className="border-t border-border pt-2">
                      <span className="text-xs text-muted-foreground block mb-1">Menşe / Köken</span>
                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{lot.provenance}</p>
                    </div>
                  )}
                </div>
              )}
              {lot?.estimatedPrice != null && lot.estimatedPrice > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/5 px-3 py-2 mt-1">
                  <span className="text-xs text-muted-foreground">Tahmini Değer</span>
                  <span className="text-sm font-bold font-mono text-[#d4af37]">{formatPrice(lot.estimatedPrice)}</span>
                </div>
              )}
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 mt-2">
                <Store className="h-4 w-4 text-[#d4af37] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Kargo: </span>
                  {lot?.shippingType === 'FREE_SELLER' ? (
                    <span className="text-green-400 font-medium">Kargo satıcıdan — ücretsiz gönderim</span>
                  ) : (
                    <span className="text-muted-foreground">Anlaşmalı kargo ile gönderilir; kargo ücreti alıcıya aittir{lot?.estimatedShipping ? ` (tahmini ${new Intl.NumberFormat('tr-TR').format(lot.estimatedShipping)} ₺)` : ''}.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Satıcıya Soru Sor */}
            {session?.user && !isOwnLot && (
              <div className="rounded-xl border border-border bg-card p-4">
                {!showQuestionForm ? (
                  <button
                    onClick={() => setShowQuestionForm(true)}
                    className="flex items-center justify-center gap-2 w-full rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/5 py-2.5 text-sm font-medium text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Satıcıya Soru Sor
                  </button>
                ) : questionSent ? (
                  <div className="text-center py-2">
                    <p className="text-sm text-green-500 font-medium">✓ Mesajınız gönderildi!</p>
                    <button onClick={() => router.push('/panel/mesajlar')} className="text-xs text-[#d4af37] hover:underline mt-1">Mesajlarıma Git</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5">
                        <MessageCircle className="h-4 w-4 text-[#d4af37]" />
                        {lot?.auction?.seller?.companyName} - Soru Sor
                      </h4>
                      <button onClick={() => setShowQuestionForm(false)} className="text-xs text-muted-foreground hover:text-foreground">İptal</button>
                    </div>
                    <textarea
                      value={questionText}
                      onChange={e => setQuestionText(e.target.value)}
                      placeholder="Sorunuzu buraya yazın..."
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37] resize-none"
                    />
                    <button
                      onClick={async () => {
                        if (!questionText.trim() || askingQuestion) return;
                        setAskingQuestion(true);
                        try {
                          const res = await fetch('/api/conversations', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              sellerId: lot?.auction?.sellerId,
                              lotId: lot?.id,
                              subject: `${lot?.title} hakkında soru`,
                              message: questionText.trim(),
                            }),
                          });
                          if (res.ok) {
                            setQuestionSent(true);
                            toast.success('Mesajınız satıcıya iletildi!');
                          } else {
                            const data = await res.json();
                            toast.error(data.error || 'Mesaj gönderilemedi');
                          }
                        } catch {
                          toast.error('Bir hata oluştu');
                        } finally {
                          setAskingQuestion(false);
                        }
                      }}
                      disabled={!questionText.trim() || askingQuestion}
                      className="w-full rounded-lg bg-[#d4af37] py-2 text-sm font-semibold text-black hover:bg-[#c9a430] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {askingQuestion ? 'Gönderiliyor...' : 'Gönder'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Müzayede Sayacı */}
            {(() => {
              const isLive = lot?.auction?.status === 'LIVE';
              const startDate = lot?.auction?.startDate;
              const hasStarted = mounted && startDate ? new Date() >= new Date(startDate) : false;
              const target = liveEndTime ?? lot?.auction?.endDate ?? (hasStarted ? null : startDate) ?? null;
              if (!target) return null;
              return (
                <div className="rounded-xl border border-red-500/20 bg-gradient-to-r from-red-500/5 to-transparent p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="rounded-full bg-red-500/10 p-2">
                      <Timer className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{isLive ? '🔴 Canlı Müzayede' : hasStarted ? '⏰ Müzayede Bitimine Kalan Süre' : '📅 Müzayede Başlangıcına Kalan'}</h3>
                      {hasStarted && <p className="text-[10px] text-muted-foreground">Son 60 sn'de teklif gelirse süre 60 sn uzar</p>}
                    </div>
                  </div>
                  <CountdownTimer endDate={target} className="text-3xl font-bold" />
                </div>
              );
            })()}

            {/* Teklif & Lot Geçmişi (Birleşik) */}
            <LotActivityTimeline lotId={lot.id} liveBids={liveBids} />
          </div>

          {/* Right - Bid Panel */}
          <div className="lg:col-span-2" id="bid-panel">
            <div className="sticky top-20">
              {isOwnLot ? (
                <div className="rounded-xl border border-border bg-card p-5 text-center">
                  <p className="text-sm text-muted-foreground">Kendi ilanınıza teklif veremezsiniz.</p>
                  <p className="text-xs text-muted-foreground mt-1">Bu lot size ait olduğu için teklif verilemez.</p>
                </div>
              ) : (
                <BidPanel lot={lot} />
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Mobile Sticky Bid Bar */}
      {showBidBar && (
        <div className="fixed bottom-16 left-0 right-0 z-40 lg:hidden border-t border-border bg-background/95 backdrop-blur-xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground">Güncel Teklif</p>
              <p className="text-lg font-bold gold-text font-mono truncate">{formatPrice(liveCurrentPrice)}</p>
            </div>
            <a
              href="#bid-panel"
              className="flex items-center gap-2 rounded-lg bg-[#d4af37] px-5 py-2.5 text-black font-bold text-sm hover:bg-[#c9a430] transition-colors flex-shrink-0"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('bid-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              <Gavel className="h-4 w-4" /> Pey Ver
            </a>
          </div>
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        images={(images ?? []).map((img: any) => ({
          imageUrl: img?.imageUrl ?? defaultImg,
        }))}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        initialIndex={currentImage}
      />
    </main>
  );
}

// Birleşik Teklif & Lot Geçmişi Bileşeni
function LotActivityTimeline({ lotId, liveBids }: { lotId: string; liveBids: any[] }) {
  const [lotEvents, setLotEvents] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch(`/api/lot-history/${lotId}`)
      .then(r => r.json())
      .then(data => setLotEvents(data.history ?? []))
      .catch(() => {});
  }, [lotId]);

  // Bid olmayan lot olaylarını filtrele (ödeme, kargo, durum vb.)
  const nonBidEvents = lotEvents.filter(e => e.event !== 'BID_PLACED' && e.event !== 'OUTBID');

  const totalCount = liveBids.length + nonBidEvents.length;

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-[#d4af37]" />
          <h3 className="text-sm font-semibold">Teklif & Lot Geçmişi ({totalCount})</h3>
        </div>

        {totalCount === 0 ? (
          <p className="text-xs text-muted-foreground">Henüz aktivite yok</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {/* Teklifler — en yüksek en üstte */}
            {liveBids.slice(0, 20).map((bid: any, idx: number) => (
              <div key={bid?.id ?? `bid-${idx}`} className={`flex items-center justify-between text-xs py-1.5 px-2 rounded-lg ${idx === 0 ? 'bg-[#d4af37]/10 border border-[#d4af37]/20' : 'bg-muted/30'}`}>
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <Gavel className="h-3 w-3 text-[#d4af37]" />
                  {idx === 0 ? '🏆 ' : ''}{(bid?.user?.fullName ?? 'Kullanıcı').slice(0, 2)}***
                  {bid?.type === 'PROXY' && <Zap className="h-2.5 w-2.5 text-purple-400" />}
                </span>
                <span className="font-mono font-bold text-[#d4af37]">{formatPrice(bid?.amount ?? 0)}</span>
              </div>
            ))}

            {/* Lot olayları (ödeme, kargo, durum vb.) */}
            {nonBidEvents.length > 0 && (
              <>
                <div className="border-t border-border my-2" />
                {nonBidEvents.slice(-10).reverse().map((entry: any) => {
                  const iconMap: Record<string, any> = { PAYMENT: CreditCard, SHIPPED: Package, DELIVERED: Package };
                  const colorMap: Record<string, string> = { PAYMENT: 'text-green-500', SHIPPED: 'text-blue-400', DELIVERED: 'text-green-400' };
                  const Icon = iconMap[entry.event] || Clock;
                  const color = colorMap[entry.event] || 'text-muted-foreground';
                  return (
                    <div key={entry.id} className="flex items-start gap-2 text-xs py-1 px-2">
                      <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground truncate">{entry.description || entry.event}</p>
                        {mounted && (
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}