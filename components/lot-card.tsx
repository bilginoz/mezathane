'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, Eye, Gavel, Clock, Timer } from 'lucide-react';
import { formatPrice, getMinBidIncrement } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BidConfirmModal } from './bid-confirm-modal';

interface LotCardProps {
  lot: any;
  index?: number;
  showQuickBid?: boolean;
  showSoldBadge?: boolean;
}

export function LotCard({ lot, index = 0, showQuickBid = false, showSoldBadge = false }: LotCardProps) {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const imageUrl = lot?.images?.[0]?.imageUrl ?? 'https://cdn.abacus.ai/images/46235948-79f3-4f4e-aab0-cdfd81b98b42.png';
  const categoryName = lot?.lotCategories?.length ? lot.lotCategories.map((lc: any) => lc.category?.name).filter(Boolean).join(', ') : (lot?.category?.name ?? '');
  const bidCount = lot?._count?.bids ?? lot?.bidCount ?? 0;
  const watchCount = lot?._count?.watchlist ?? lot?.watchCount ?? 0;
  const startingPrice = lot?.startingPrice ?? 0;
  const currentPrice = lot?.currentPrice ?? startingPrice;

  const [showBidInput, setShowBidInput] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidding, setBidding] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingBidAmount, setPendingBidAmount] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  // Müzayede durumu ve kalan süre
  const auctionStatus = lot?.auction?.status;
  const auctionEndDate = lot?.auction?.endDate ?? lot?.liveEndTime;
  const auctionStartDate = lot?.auction?.startDate;
  const isLiveOnly = lot?.auction?.liveOnly === true;

  // Süre dolmuş mu kontrol et (cron henüz çalışmamış olabilir)
  const isTimeExpired = mounted && auctionEndDate ? new Date(auctionEndDate).getTime() < Date.now() : false;
  const isAuctionEnded = auctionStatus === 'COMPLETED' || auctionStatus === 'CANCELLED' || isTimeExpired;
  const canBid = !isAuctionEnded && (isLiveOnly ? auctionStatus === 'LIVE' : (auctionStatus === 'ACTIVE' || auctionStatus === 'LIVE'));

  // Kalan süre hesapla
  const getTimeLeft = () => {
    if (!auctionEndDate) return null;
    const diff = new Date(auctionEndDate).getTime() - Date.now();
    if (diff <= 0) return 'Bitti';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}g ${hours}s`;
    if (hours > 0) return `${hours}s ${mins}dk`;
    return `${mins}dk`;
  };

  const minBid = currentPrice + getMinBidIncrement(currentPrice, lot?.customBidIncrement);

  const handleQuickBid = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      toast.error('Teklif vermek için giriş yapın');
      return;
    }

    if (!showBidInput) {
      setShowBidInput(true);
      setBidAmount(minBid.toString());
      return;
    }

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < minBid) {
      toast.error(`Minimum teklif: ${formatPrice(minBid)}`);
      return;
    }

    // Onay modal'ını göster
    setPendingBidAmount(amount);
    setShowConfirmModal(true);
  };

  const handleConfirmQuickBid = async () => {
    setShowConfirmModal(false);
    setBidding(true);
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotId: lot.id, amount: pendingBidAmount }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.needsVerification) {
          toast.error('Teklif verebilmek için e-posta adresinizi doğrulamanız gerekiyor.');
          router.push('/dogrulama');
          return;
        }
        throw new Error(data?.error ?? 'Hata');
      }
      toast.success('Teklif verildi!');
      setShowBidInput(false);
      setBidAmount('');
    } catch (err: any) {
      toast.error(err?.message ?? 'Teklif verilemedi');
    } finally {
      setBidding(false);
    }
  };

  const timeLeft = mounted ? getTimeLeft() : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
    >
      <Link href={`/lot/${lot?.id ?? ''}`} onClick={(e) => { if (showBidInput) { e.preventDefault(); } }}>
        <div className="group rounded-xl overflow-hidden bg-card border border-border/50 hover:border-[#d4af37]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#d4af37]/5">
          <div className="relative aspect-square bg-muted overflow-hidden">
            <Image
              src={imageUrl}
              alt={lot?.title ?? 'Lot'}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 50vw, 25vw"
              loading="lazy"
              quality={75}
            />
            <div className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5">
              <span className="text-[10px] font-bold text-[#d4af37]">Lot {lot?.lotNumber ?? 0}</span>
            </div>
            {categoryName && (
              <div className="absolute top-2 right-2 rounded-full bg-black/70 px-2 py-0.5">
                <span className="text-[10px] text-white font-medium">{categoryName}</span>
              </div>
            )}
            {/* Kalan süre badge */}
            {mounted && timeLeft && timeLeft !== 'Bitti' && canBid && (
              <div className="absolute bottom-2 left-2 rounded-full bg-red-600/90 px-2 py-0.5 flex items-center gap-1">
                <Timer className="h-2.5 w-2.5 text-white" />
                <span className="text-[10px] font-bold text-white">{timeLeft}</span>
              </div>
            )}
            {/* SATILDI overlay */}
            {/* Süre Doldu overlay (henüz SOLD/UNSOLD değilse ama süre bittiyse) */}
            {mounted && isTimeExpired && lot?.status !== 'SOLD' && lot?.status !== 'UNSOLD' && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                <span className="bg-amber-600 text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-wider uppercase shadow-lg">Süre Doldu</span>
                {bidCount > 0 && (
                  <span className="mt-2 text-white/90 text-[11px] font-medium bg-black/60 px-3 py-1 rounded-full">
                    Kazanan Teklif: {formatPrice(currentPrice)}
                  </span>
                )}
              </div>
            )}
            {showSoldBadge && lot?.status === 'SOLD' && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                <span className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-wider uppercase shadow-lg">Satıldı</span>
                {lot?.winnerName && (
                  <span className="mt-2 text-white/90 text-[11px] font-medium bg-black/60 px-3 py-1 rounded-full">
                    🏆 {lot.winnerName} kazandı
                  </span>
                )}
              </div>
            )}
            {showSoldBadge && lot?.status === 'UNSOLD' && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="bg-gray-600 text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-wider uppercase shadow-lg">Satılamadı</span>
              </div>
            )}
          </div>
          <div className="p-3 space-y-2">
            <h3 className="text-sm font-medium line-clamp-2 min-h-[2.5rem] text-white">
              {lot?.title ?? 'Lot'}
            </h3>

            {/* Açılış fiyatı + Güncel teklif */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#9ca3af]">Açılış:</span>
                <span className="text-[10px] text-[#9ca3af] font-mono">{formatPrice(startingPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#e5e7eb]">Güncel Teklif</span>
                <span className="text-sm font-bold text-[#d4af37] font-mono">{formatPrice(currentPrice)}</span>
              </div>
            </div>

            {/* İstatistikler: Pey | Takip | Görüntülenme */}
            <div className="flex items-center justify-between text-[10px] text-[#9ca3af] border-t border-border/50 pt-2">
              <span className="flex items-center gap-0.5" title="Pey sayısı">
                <Gavel className="h-3 w-3" />
                {bidCount} pey
              </span>
              <span className="flex items-center gap-0.5" title="Takip">
                <Heart className="h-3 w-3" />
                {watchCount}
              </span>
              <span className="flex items-center gap-0.5" title="Görüntülenme">
                <Eye className="h-3 w-3" />
                {lot?.viewCount ?? 0}
              </span>
            </div>

            {/* Hızlı Teklif */}
            {showQuickBid && canBid && !((session?.user as any)?.sellerProfileId && (session?.user as any)?.sellerProfileId === (lot?.auction?.sellerId || lot?.auction?.seller?.id)) && (
              <div className="pt-1" onClick={(e) => e.preventDefault()}>
                <p className="text-[8px] sm:text-[9px] text-muted-foreground text-center mb-0.5">+%7 hizmet bedeli + %20 KDV uygulanır</p>
                {!showBidInput ? (
                  <button
                    onClick={handleQuickBid}
                    className="w-full rounded-lg bg-[#d4af37] py-2 sm:py-1.5 text-xs font-bold text-black hover:bg-[#c9a430] transition-colors flex items-center justify-center gap-1 active:scale-95"
                  >
                    <Gavel className="h-3 w-3" /> Pey Ver
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => { e.stopPropagation(); setBidAmount(e.target.value); }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-xs font-mono focus:border-[#d4af37] focus:outline-none min-w-0"
                      min={minBid}
                      step={getMinBidIncrement(currentPrice, lot?.customBidIncrement)}
                      placeholder={formatPrice(minBid)}
                      autoFocus
                    />
                    <button
                      onClick={handleQuickBid}
                      disabled={bidding}
                      className="rounded-lg bg-[#d4af37] px-3 py-1 text-xs font-bold text-black hover:bg-[#c9a430] transition-colors disabled:opacity-50"
                    >
                      {bidding ? '...' : '✓'}
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowBidInput(false); }}
                      className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/80"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
      {/* Quick Bid Confirm Modal */}
      <BidConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmQuickBid}
        loading={bidding}
        lotTitle={lot?.title ?? 'Lot'}
        lotNumber={lot?.lotNumber ?? 0}
        bidAmount={pendingBidAmount}
        auctionTitle={lot?.auction?.title}
        paymentDays={lot?.auction?.paymentDays ?? 5}
        kdvRate={lot?.kdvRate ?? 20}
      />
    </motion.div>
  );
}
