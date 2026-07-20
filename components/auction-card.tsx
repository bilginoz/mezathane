'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, Clock, Eye, Layers, Radio } from 'lucide-react';
import { AuctionBanner } from './auction-banner';
import { VerifiedBadge } from './verified-badge';
import { formatDate, getTimeRemaining } from '@/lib/utils';

interface AuctionCardProps {
  auction: any;
  index?: number;
}

export function AuctionCard({ auction, index = 0 }: AuctionCardProps) {
  const lotCount = auction?._count?.lots ?? 0;
  const sellerName = auction?.seller?.companyName ?? 'Satıcı';
  const isLive = auction?.status === 'LIVE';
  const isLiveOnly = auction?.liveOnly === true;
  const endDate = auction?.endDate ? new Date(auction.endDate) : null;
  const [isLiveApproaching, setIsLiveApproaching] = useState(false);
  const lotImages = (auction?.lots ?? []).map((l: any) => l?.images?.[0]?.imageUrl).filter(Boolean);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (!isLive && auction?.status === 'ACTIVE' && endDate && auction?.liveStartDate) {
      const diff = endDate.getTime() - Date.now();
      setIsLiveApproaching(diff < 24 * 60 * 60 * 1000 && diff > 0);
    }
  }, [isLive, auction?.status, endDate, auction?.liveStartDate]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
    >
      <Link href={`/muzayede/${auction?.id ?? ''}`}>
        <div className="group rounded-xl overflow-hidden bg-card border border-border/50 hover:border-[#d4af37]/50 transition-all duration-300 hover:shadow-lg hover:shadow-[#d4af37]/5">
          <div className="relative aspect-[16/9] bg-muted overflow-hidden">
            <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-500">
              <AuctionBanner
                logoUrl={auction?.seller?.logoUrl}
                companyName={sellerName}
                lotImages={lotImages}
                title={auction?.title}
              />
            </div>
            {isLive && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-bold text-white">CANLI</span>
              </div>
            )}
            {!isLive && isLiveOnly && (
              <div className="absolute top-3 right-3 rounded-full bg-red-600/80 px-2 py-0.5">
                <span className="text-[10px] font-medium text-white">🔴 Sadece Canlı</span>
              </div>
            )}
            {mounted && isLiveApproaching && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-amber-600 px-3 py-1">
                <Radio className="h-3 w-3 text-white" />
                <span className="text-[10px] font-bold text-white">CANLI YAKLAŞIYOR</span>
              </div>
            )}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <p className="text-xs text-white/70 flex items-center gap-1">{sellerName}{auction?.seller?.isVerified && <VerifiedBadge size="sm" />}</p>
              <h3 className="text-sm font-semibold text-white line-clamp-1">
                {auction?.title ?? 'Müzayede'}
              </h3>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(auction?.startDate)}
              </span>
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {lotCount} lot
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-[#d4af37]">
                <Clock className="h-3 w-3" />
                {isLive ? (
                  <span className="flex items-center gap-1 font-bold text-red-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    CANLI
                  </span>
                ) : mounted ? getTimeRemaining(auction?.endDate ?? auction?.liveStartDate ?? auction?.startDate) : '--'}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" />
                {auction?.viewCount ?? 0}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
