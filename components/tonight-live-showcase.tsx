'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Clock, Flame, ChevronRight, Layers } from 'lucide-react';
import { AuctionBanner } from '@/components/auction-banner';
import { VerifiedBadge } from '@/components/verified-badge';

function LiveCountdown({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const update = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!mounted) return <span className="font-mono text-lg">--:--:--</span>;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-1">
      {timeLeft.hours > 0 && (
        <>
          <span className="inline-flex flex-col items-center">
            <span className="font-mono text-xl sm:text-2xl font-bold text-[#d4af37]">{pad(timeLeft.hours)}</span>
            <span className="text-[9px] text-muted-foreground">SAAT</span>
          </span>
          <span className="text-[#d4af37] text-xl font-bold">:</span>
        </>
      )}
      <span className="inline-flex flex-col items-center">
        <span className="font-mono text-xl sm:text-2xl font-bold text-[#d4af37]">{pad(timeLeft.minutes)}</span>
        <span className="text-[9px] text-muted-foreground">DAKİKA</span>
      </span>
      <span className="text-[#d4af37] text-xl font-bold">:</span>
      <span className="inline-flex flex-col items-center">
        <span className="font-mono text-xl sm:text-2xl font-bold text-[#d4af37]">{pad(timeLeft.seconds)}</span>
        <span className="text-[9px] text-muted-foreground">SANİYE</span>
      </span>
    </div>
  );
}

export function TonightLiveShowcase({ auctions }: { auctions: any[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Find auctions happening today or very soon (within next 24h)
  const todayAuctions = useMemo(() => {
    if (!mounted) return [];
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return auctions.filter(a => {
      // LIVE auctions always show
      if (a.status === 'LIVE') return true;
      // ACTIVE auctions ending within 24h (about to go live)
      if (a.status === 'ACTIVE' && a.endDate) {
        const end = new Date(a.endDate);
        return end > now && end <= in24h;
      }
      // SCHEDULED auctions starting within 24h
      if (a.status === 'SCHEDULED' && a.startDate) {
        const start = new Date(a.startDate);
        return start > now && start <= in24h;
      }
      return false;
    }).sort((a, b) => {
      // LIVE first, then by start/end time
      if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
      if (b.status === 'LIVE' && a.status !== 'LIVE') return 1;
      const aTime = new Date(a.liveStartDate || a.endDate || a.startDate).getTime();
      const bTime = new Date(b.liveStartDate || b.endDate || b.startDate).getTime();
      return aTime - bTime;
    });
  }, [auctions, mounted]);

  if (!mounted || todayAuctions.length === 0) return null;

  const hasLive = todayAuctions.some(a => a.status === 'LIVE');

  // Determine the countdown target for the first non-live auction
  const nextAuction = todayAuctions.find(a => a.status !== 'LIVE') || todayAuctions[0];
  const countdownTarget = nextAuction?.liveStartDate || nextAuction?.endDate || nextAuction?.startDate;

  // Time label for each auction
  const getTimeLabel = (auction: any) => {
    if (auction.status === 'LIVE') return null; // has live badge
    const targetTime = new Date(auction.liveStartDate || auction.endDate || auction.startDate);
    return targetTime.toLocaleString('tr-TR', {
      timeZone: 'Europe/Istanbul',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <section className="relative overflow-hidden border-b border-red-500/20">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-950/40 via-amber-950/20 to-red-950/40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08),transparent_50%)]" />
      
      <div className="relative mx-auto max-w-[1200px] px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${hasLive ? 'bg-red-600/20 border-red-500/50' : 'bg-amber-600/20 border-amber-500/50'}`}>
                {hasLive ? (
                  <>
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                    <span className="text-sm font-bold text-red-400">ŞU AN CANLI</span>
                  </>
                ) : (
                  <>
                    <Flame className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-bold text-amber-400">BUGÜN CANLI</span>
                  </>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground hidden sm:block">
              {hasLive ? 'Canlı müzayede devam ediyor!' : `${todayAuctions.length} müzayede bugün sizi bekliyor`}
            </p>
          </div>

          {/* Countdown for next auction */}
          {!hasLive && countdownTarget && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Başlamaya</span>
              <LiveCountdown targetDate={new Date(countdownTarget)} />
            </div>
          )}
        </div>

        {/* Auction Cards */}
        <div className={`grid gap-4 ${todayAuctions.length === 1 ? 'grid-cols-1 max-w-lg' : todayAuctions.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
          {todayAuctions.slice(0, 3).map((auction: any, i: number) => {
            const isLive = auction.status === 'LIVE';
            const lotImages = (auction?.lots ?? []).map((l: any) => l?.images?.[0]?.imageUrl).filter(Boolean);
            const timeLabel = getTimeLabel(auction);

            return (
              <motion.div
                key={auction.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={`/muzayede/${auction.id}`}>
                  <div className={`group rounded-xl border overflow-hidden transition-all hover:scale-[1.02] ${
                    isLive
                      ? 'border-red-500/50 shadow-lg shadow-red-500/10 bg-card'
                      : 'border-amber-500/30 bg-card hover:border-amber-500/50'
                  }`}>
                    {/* Banner */}
                    <div className="relative aspect-video overflow-hidden">
                      <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-500">
                        <AuctionBanner
                          logoUrl={auction?.seller?.logoUrl}
                          companyName={auction?.seller?.companyName}
                          lotImages={lotImages}
                          title={auction?.title}
                        />
                      </div>
                      {/* Live badge */}
                      {isLive && (
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 shadow-lg">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                          </span>
                          <span className="text-xs font-bold text-white">CANLI</span>
                        </div>
                      )}
                      {/* Time badge for upcoming */}
                      {!isLive && timeLabel && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-sm px-2.5 py-1">
                          <Clock className="h-3 w-3 text-[#d4af37]" />
                          <span className="text-xs font-bold text-white">{timeLabel}</span>
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-3 sm:p-4">
                      <h3 className="font-semibold text-sm sm:text-base line-clamp-1 mb-1.5">{auction?.title}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Layers className="h-3 w-3" />
                          {auction?._count?.lots ?? 0} lot
                        </span>
                        {auction?.seller?.companyName && (
                          <span className="text-xs text-muted-foreground truncate max-w-[150px] flex items-center gap-1">
                            {auction.seller.companyName}{auction?.seller?.isVerified && <VerifiedBadge size="sm" />}
                          </span>
                        )}
                      </div>
                      {/* CTA */}
                      <div className={`mt-3 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors ${
                        isLive
                          ? 'bg-red-600 text-white group-hover:bg-red-700'
                          : 'bg-[#d4af37]/10 text-[#d4af37] group-hover:bg-[#d4af37]/20'
                      }`}>
                        {isLive ? (
                          <><Radio className="h-4 w-4" /> Canlı Katıl</>
                        ) : (
                          <><ChevronRight className="h-4 w-4" /> Detayları Gör</>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* More than 3 */}
        {todayAuctions.length > 3 && (
          <div className="mt-4 text-center">
            <Link href="/muzayedeler" className="text-sm text-[#d4af37] hover:underline">
              +{todayAuctions.length - 3} müzayede daha →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
