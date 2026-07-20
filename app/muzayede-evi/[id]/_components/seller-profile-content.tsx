'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Store, MapPin, Calendar, Gavel, Layers, Users, ArrowRight, ArrowLeft, Star, CheckCircle } from 'lucide-react';
import { formatDate, formatPrice } from '@/lib/utils';
import { CountdownTimer } from '@/components/countdown-timer';
import { AuctionBanner } from '@/components/auction-banner';
import { VerifiedBadge } from '@/components/verified-badge';

interface SellerProfileContentProps {
  seller: any;
  stats: any;
}

export function SellerProfileContent({ seller, stats }: SellerProfileContentProps) {
  const auctions = seller?.auctions ?? [];
  const defaultLogo = 'https://cdn.abacus.ai/images/46235948-79f3-4f4e-aab0-cdfd81b98b42.png';

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1200px] px-4">
        {/* Geri Butonu */}
        <div className="mb-4">
          <button onClick={() => window.history.back()} className="rounded-lg border border-border p-2 hover:bg-muted transition-colors inline-flex items-center gap-2 text-sm"><ArrowLeft className="h-4 w-4" /> Geri</button>
        </div>
        {/* Profil Başlığı */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card overflow-hidden mb-8"
        >
          {/* Banner */}
          <div className="h-32 md:h-44 bg-gradient-to-r from-[#1a1400] via-[#2a2000] to-[#1a1400] relative">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #d4af37 1px, transparent 1px), radial-gradient(circle at 80% 30%, #d4af37 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
            </div>
          </div>

          {/* Profil Bilgileri */}
          <div className="px-6 pb-6 -mt-12 md:-mt-16 relative">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              {/* Logo */}
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden border-4 border-card bg-muted flex-shrink-0 shadow-xl">
                <div className="relative w-full h-full">
                  <Image
                    src={seller?.logoUrl || defaultLogo}
                    alt={seller?.companyName ?? 'Müzayede Evi'}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>

              {/* Bilgiler */}
              <div className="flex-1 pt-2 md:pt-0">
                <h1 className="font-display text-2xl md:text-3xl font-bold mb-1 flex items-center gap-2">{seller?.companyName}{seller?.isVerified && <VerifiedBadge size="lg" />}</h1>
                {seller?.companyAddress && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span>{(() => {
                      // Tam adresi gizle, sadece şehir göster
                      const parts = seller.companyAddress.split(/[,\/]/).map((p: string) => p.trim()).filter(Boolean);
                      return parts.length > 0 ? parts[parts.length - 1] : 'Türkiye';
                    })()}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(seller?.createdAt)} tarihinden beri üye</span>
                </div>
              </div>
            </div>

            {/* Açıklama */}
            {seller?.description && (
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{seller.description}</p>
            )}
          </div>
        </motion.div>

        {/* İstatistikler */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Müzayede', value: stats?.totalAuctions ?? 0, icon: Gavel, color: 'text-[#d4af37]' },
            { label: 'Toplam Lot', value: stats?.totalLots ?? 0, icon: Layers, color: 'text-blue-400' },
            { label: 'Satılan Lot', value: stats?.soldLots ?? 0, icon: CheckCircle, color: 'text-emerald-400' },
            { label: 'Toplam Teklif', value: stats?.totalBids ?? 0, icon: Users, color: 'text-green-400' },

          ]
            .filter(stat => stat.value > 0)
            .map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-border bg-card p-4 text-center"
              >
                <stat.icon className={`h-5 w-5 ${stat.color} mx-auto mb-2`} />
                <p className="text-2xl font-bold font-mono">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
        </div>

        {/* Müzayedeler */}
        <div className="mb-4">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Store className="h-5 w-5 text-[#d4af37]" />
            Müzayedeler
          </h2>
        </div>

        {auctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {auctions.map((auction: any, i: number) => {
              const isLive = auction?.status === 'LIVE';
              const isActive = auction?.status === 'ACTIVE' || isLive;
              const isEnded = auction?.status === 'COMPLETED';
              const auctionLotImages = (auction?.lots ?? []).map((l: any) => l?.images?.[0]?.imageUrl).filter(Boolean);

              return (
                <motion.div
                  key={auction?.id ?? i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={`/muzayede/${auction?.id}`}
                    className="block rounded-xl border border-border bg-card overflow-hidden hover:border-[#d4af37]/30 transition-colors group"
                  >
                    {/* Kapak Resmi */}
                    <div className="relative aspect-[16/9] bg-muted">
                      <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-500">
                        <AuctionBanner
                          logoUrl={seller?.logoUrl}
                          companyName={seller?.companyName}
                          lotImages={auctionLotImages}
                          title={auction?.title}
                        />
                      </div>

                      {/* Durum Badge */}
                      <div className="absolute top-3 left-3">
                        {isLive ? (
                          <span className="flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> CANLI
                          </span>
                        ) : isEnded ? (
                          <span className="rounded-full bg-gray-600 px-2.5 py-0.5 text-[10px] font-bold text-white">SONA ERDİ</span>
                        ) : (
                          <span className="rounded-full bg-[#d4af37] px-2.5 py-0.5 text-[10px] font-bold text-black">YAKLAŞIYOR</span>
                        )}
                      </div>

                      {/* Lot Sayısı */}
                      <div className="absolute bottom-3 right-3">
                        <span className="rounded-full bg-black/60 backdrop-blur-sm px-2 py-0.5 text-[10px] text-white">
                          {auction?._count?.lots ?? 0} Lot
                        </span>
                      </div>
                    </div>

                    {/* İçerik */}
                    <div className="p-4">
                      <h3 className="font-display font-bold text-sm line-clamp-1 mb-1 group-hover:text-[#d4af37] transition-colors">
                        {auction?.title}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatDate(auction?.startDate)}</span>
                        {isActive && (
                          <span className="flex items-center gap-1 text-[#d4af37]">
                            Detay <ArrowRight className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl border border-border bg-card">
            <Store className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Henüz müzayede eklenmemiş</p>
          </div>
        )}
      </div>
    </main>
  );
}
