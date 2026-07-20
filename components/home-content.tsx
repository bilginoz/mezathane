'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Gavel, Shield, Clock, Users, TrendingUp, Star, ChevronRight, Search, CreditCard, Trophy, Radio, Timer, Layers } from 'lucide-react';
import { AuctionCard } from '@/components/auction-card';
import { AuctionBanner } from '@/components/auction-banner';
import { TonightLiveShowcase } from '@/components/tonight-live-showcase';
import { LotCard } from '@/components/lot-card';
import { useInView } from 'react-intersection-observer';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { getTimeRemaining } from '@/lib/utils';

const CATEGORY_IMAGES: Record<string, string> = {
  'antika': 'https://cdn.abacus.ai/images/a03523e7-5461-4450-b73e-62a3715561a1.png',
  'tesbih': 'https://i.etsystatic.com/18812058/r/il/859531/6897798128/il_fullxfull.6897798128_ao7v.jpg',
  'koleksiyon': 'https://nessbros.s3.amazonaws.com/2024/09/16162241/288.jpg',
  'mucevher': 'https://assets.cdn.filesafe.space/IKsTHgDQrxdlZ6pzpBr0/media/69b03bfcddc8c73cb1e98143.png',
  'resim': 'https://serlachius.fi/wp-content/uploads/kartanon-klassikot-5.jpg',
  'numismatik': 'https://cdn.shopify.com/s/files/1/0714/1792/1822/files/numismatic-coin-collection.png',
};

function AnimatedCounter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView({ triggerOnce: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1500;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end]);

  return <span ref={ref}>{count.toLocaleString('tr-TR')}{suffix}</span>;
}

export function HomeContent({ auctions, completedAuctions, categories, featuredLots, stats, siteSettings }: {
  auctions: any[];
  completedAuctions: any[];
  categories: any[];
  featuredLots: any[];
  stats: { users: number; auctions: number; soldLots: number };
  siteSettings?: any;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Otomatik canlı müzayede geçiş kontrolü ve yaklaşan canlı müzayede bilgisi
  const [upcomingLive, setUpcomingLive] = useState<any[]>([]);

  useEffect(() => {
    // Sayfa yüklenirken otomatik geçiş kontrolü + teslim onayı
    fetch('/api/cron/auto-confirm').catch(() => {});
    fetch('/api/cron/check-live')
      .then(r => r.json())
      .then(d => {
        if (d?.upcomingLive) setUpcomingLive(d.upcomingLive);
        // Geçiş olduysa sayfayı yenile
        if (d?.transitioned > 0) window.location.reload();
      })
      .catch(() => {});
  }, []);

  // Mevcut müzayedelerden yaklaşan canlıları hesapla
  const approachingLive = useMemo(() => {
    if (!mounted) return [];
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    return auctions.filter(a =>
      a.status === 'ACTIVE' &&
      a.endDate &&
      a.liveStartDate &&
      new Date(a.endDate).getTime() - now < oneDay &&
      new Date(a.endDate).getTime() > now
    );
  }, [auctions, mounted]);

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative min-h-[50vh] sm:min-h-[60vh] md:min-h-[70vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src={siteSettings?.heroImageUrl || "https://cdn.abacus.ai/images/67c2b70f-927c-4a36-8f9e-8edc1a05d101.png"}
            alt="Premium müzayede salonu"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
        </div>
        <div className="relative z-10 mx-auto max-w-[1200px] px-4 py-10 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <Gavel className="h-5 w-5 sm:h-8 sm:w-8 text-[#d4af37]" />
              <span className="text-[#d4af37] font-display text-[10px] sm:text-sm font-medium tracking-widest uppercase">
                {siteSettings?.heroSubtitle || "Türkiye'nin Premium Açık Artırma Platformu"}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight mb-4 sm:mb-6">
              {(() => {
                const title = siteSettings?.heroTitle || 'Eşsiz Parçalar, Eşsiz Fırsatlar';
                const parts = title.split(',');
                if (parts.length >= 2) {
                  return <>{parts[0].trim()},<br /><span className="gold-text">{parts.slice(1).join(',').trim()}</span></>;
                }
                return title;
              })()}
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-white/70 mb-6 sm:mb-8 leading-relaxed">
              {siteSettings?.heroDescription || "Antika ve koleksiyon ürünlerinin güvenli ve şeffaf açık artırma ile satışı. Canlı müzayedelere katılın, eşsiz parçalara sahip olun."}
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <Link href={siteSettings?.heroCta1Link || "/muzayedeler"} className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-6 py-3 font-bold text-black hover:bg-[#c9a430] transition-colors">
                {siteSettings?.heroCta1Text || "Müzayedeleri Keşfet"} <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={siteSettings?.heroCta2Link || "/satici-basvuru"} className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-6 py-3 font-medium text-white hover:bg-white/10 transition-colors">
                {siteSettings?.heroCta2Text || "Satıcı Ol"}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bu Akşam / Bugün Canlı Vitrin */}
      <TonightLiveShowcase auctions={auctions ?? []} />

      {/* Müzayedeler (Tabs) */}
      {((auctions?.length ?? 0) > 0 || (completedAuctions?.length ?? 0) > 0) && (
        <AuctionTabsSection auctions={auctions ?? []} completedAuctions={completedAuctions ?? []} />
      )}

      {/* Öne Çıkan Lotlar */}
      {(featuredLots?.length ?? 0) > 0 && (
        <section className="py-10 sm:py-16">
          <div className="mx-auto max-w-[1200px] px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight">Öne Çıkan Lotlar</h2>
                <p className="text-sm text-muted-foreground mt-1">En çok teklif alan ürünler</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(featuredLots ?? []).map((lot: any, i: number) => (
                <LotCard key={lot?.id ?? i} lot={lot} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Yaklaşan Müzayedeler */}
      {(auctions?.length ?? 0) > 0 && (
        <section className="border-b border-border/40 bg-gradient-to-r from-card/80 to-card/50">
          <div className="mx-auto max-w-[1200px] px-4 py-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-[#d4af37]" />
                <h2 className="font-display text-lg font-bold">Yaklaşan Müzayedeler</h2>
              </div>
              <Link href="/muzayedeler" className="text-xs text-[#d4af37] hover:underline flex items-center gap-1">
                Tümü <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {(auctions ?? []).slice(0, 5).map((auction: any) => {
                const endDate = auction?.endDate;
                const isLive = auction?.status === 'LIVE';
                return (
                  <Link key={auction.id} href={`/muzayede/${auction.id}`}>
                    <div className="group rounded-xl border border-border/50 bg-card hover:border-[#d4af37]/50 transition-all overflow-hidden">
                      <div className="relative aspect-video bg-muted overflow-hidden">
                        <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-500">
                          <AuctionBanner
                            logoUrl={auction?.seller?.logoUrl}
                            companyName={auction?.seller?.companyName}
                            lotImages={(auction?.lots ?? []).map((l: any) => l?.images?.[0]?.imageUrl).filter(Boolean)}
                            title={auction?.title}
                          />
                        </div>
                        {isLive && (
                          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                            <span className="text-[9px] font-bold text-white">CANLI</span>
                          </div>
                        )}
                      </div>
                      <div className="p-2.5 space-y-1">
                        <h3 className="text-xs font-semibold line-clamp-1">{auction?.title ?? ''}</h3>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Layers className="h-2.5 w-2.5" />
                            {auction?._count?.lots ?? 0} lot
                          </span>
                          <span className="flex items-center gap-0.5 text-[#d4af37]">
                            <Clock className="h-2.5 w-2.5" />
                            {mounted ? getTimeRemaining(endDate ?? auction?.liveStartDate ?? auction?.startDate) : '--'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Yaklaşan Canlı Müzayede Banner */}
      {approachingLive.length > 0 && (
        <section className="py-6 bg-gradient-to-r from-red-950/30 via-amber-950/20 to-red-950/30 border-y border-red-500/20">
          <div className="mx-auto max-w-[1200px] px-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/20 border border-red-500/30">
                <Radio className="h-4 w-4 text-red-400 animate-pulse" />
                <span className="text-sm font-bold text-red-400">CANLI MÜZAYEDE YAKLAŞIYOR</span>
              </div>
              <p className="text-sm text-muted-foreground">Aşağıdaki müzayedeler yakında canlıya geçecek!</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {approachingLive.map((auction: any) => {
                const endTime = new Date(auction.endDate);
                const liveTime = new Date(auction.liveStartDate);
                const hoursLeft = Math.max(0, Math.floor((endTime.getTime() - Date.now()) / (1000 * 60 * 60)));
                const minsLeft = Math.max(0, Math.floor(((endTime.getTime() - Date.now()) % (1000 * 60 * 60)) / (1000 * 60)));
                return (
                  <Link key={auction.id} href={`/muzayede/${auction.id}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-red-500/20 bg-card/50 p-4 hover:border-red-500/40 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm truncate flex-1">{auction.title}</h3>
                        <span className="text-[10px] font-mono bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full ml-2 whitespace-nowrap">
                          {hoursLeft}s {minsLeft}dk
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Canlı başlangıç: {liveTime.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                      </div>
                      <p className="text-[10px] text-amber-400 mt-2">Teklif süresi doluyor, ardından canlı müzayede başlayacak →</p>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Kategoriler */}
      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight">Kategoriler</h2>
              <p className="text-sm text-muted-foreground mt-1">Aradığınızı kolayca bulun</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {(categories ?? []).map((cat: any, i: number) => (
              <motion.div
                key={cat?.id ?? i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/muzayedeler?category=${cat?.slug ?? ''}&view=lots`}>
                  <div className="group relative rounded-xl overflow-hidden aspect-[4/3] bg-muted">
                    <Image
                      src={cat?.imageUrl ?? CATEGORY_IMAGES[cat?.slug ?? ''] ?? 'https://cdn.abacus.ai/images/46235948-79f3-4f4e-aab0-cdfd81b98b42.png'}
                      alt={`${cat?.name ?? 'Kategori'} kategorisi - Mezathane.tr açık artırma`}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                      sizes="(max-width: 768px) 50vw, 16vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/20 group-hover:from-black/90 transition-all" />
                    <div className="absolute bottom-0 inset-x-0 p-3">
                      <h3 className="text-sm font-medium text-white text-center">{cat?.name ?? ''}</h3>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* İstatistikler */}
      <section className="border-b border-border/40 bg-card/50">
        <div className="mx-auto max-w-[1200px] px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Users, label: 'Kayıtlı Kullanıcı', value: stats?.users ?? 0, suffix: '' },
              { icon: Gavel, label: 'Müzayede', value: stats?.auctions ?? 0, suffix: '' },
              { icon: TrendingUp, label: 'Satılan Lot', value: stats?.soldLots ?? 0, suffix: '' },
              { icon: Shield, label: 'Güvenli İşlem', value: 100, suffix: '%' },
            ].filter(stat => stat.value > 0).map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <stat.icon className="h-6 w-6 text-[#d4af37] mx-auto mb-2" />
                <p className="text-2xl md:text-3xl font-bold font-mono">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Nasıl Çalışır */}
      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">Nasıl Çalışır?</h2>
            <p className="text-sm text-muted-foreground mt-2">Dört kolay adımda müzayede deneyimi</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            {[
              { icon: Search, step: '1', title: 'Keşfet', desc: 'Müzayedeleri ve lotları inceleyin, ilgi alanınıza göre filtreleyin.' },
              { icon: Users, step: '2', title: 'Kayıt Ol', desc: 'Ücretsiz hesap oluşturun ve ödeme yönteminizi tanımlayın.' },
              { icon: Gavel, step: '3', title: 'Teklif Ver', desc: 'Beğendiğiniz ürünlere teklif verin veya otomatik teklif kurun.' },
              { icon: Trophy, step: '4', title: 'Kazanın', desc: 'Müzayedeyi kazanın, ödemenizi yapın ve ürününüzü teslim alın.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative text-center p-6 rounded-xl border border-border/50 bg-card hover:border-[#d4af37]/30 transition-all group"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#d4af37] w-7 h-7 flex items-center justify-center text-black text-xs font-bold">{item.step}</div>
                <item.icon className="h-8 w-8 text-[#d4af37] mx-auto mb-3 mt-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-display font-semibold mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - Become Seller */}
      <section className="py-10 sm:py-16 bg-muted/30">
        <div className="mx-auto max-w-[1200px] px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a] p-8 md:p-12 flex flex-col md:flex-row items-center gap-8"
          >
            <div className="flex-1 text-center md:text-left">
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-white mb-4">
                Siz de <span className="gold-text">Satıcı</span> Olun
              </h2>
              <p className="text-white/60 mb-6 text-sm sm:text-base">
                Platformumuza katılın, müzayedelerinizi oluşturun ve binlerce alıcıya ulaşın.
                Canlı müzayede yönetimi, otomatik teklif sistemi ve daha fazlası.
              </p>
              <Link href="/satici-basvuru" className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-6 py-3 font-bold text-black hover:bg-[#c9a430] transition-colors">
                Hemen Başvurun <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="hidden md:grid grid-cols-2 gap-4">
              {[
                { icon: Gavel, text: 'Canlı Müzayede' },
                { icon: Clock, text: 'Adil Bekleme' },
                { icon: Shield, text: 'Güvenli Ödeme' },
                { icon: Star, text: 'Premium Destek' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-white/70">
                  <f.icon className="h-4 w-4 text-[#d4af37]" />
                  <span className="text-sm">{f.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Empty State */}
      {(auctions?.length ?? 0) === 0 && (featuredLots?.length ?? 0) === 0 && (
        <section className="py-12 sm:py-20">
          <div className="mx-auto max-w-[1200px] px-4 text-center">
            <Gavel className="h-12 w-12 sm:h-16 sm:w-16 text-[#d4af37] mx-auto mb-4 sm:mb-6 opacity-50" />
            <h2 className="font-display text-2xl font-bold mb-3">Henüz Aktif Müzayede Yok</h2>
            <p className="text-muted-foreground mb-6">Yeni müzayedeler yakında başlayacak. Takipte kalın!</p>
            <Link href="/satici-basvuru" className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-6 py-3 font-bold text-black hover:bg-[#c9a430] transition-colors">
              Satıcı Olarak Başlayın <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

function AuctionTabsSection({ auctions, completedAuctions }: { auctions: any[]; completedAuctions: any[] }) {
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed'>('active');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const now = mounted ? new Date() : new Date(0);

  const activeAuctions = useMemo(() => {
    if (!mounted) return auctions;
    return auctions.filter((a: any) => {
      const start = new Date(a.startDate);
      return start <= now && (a.status === 'ACTIVE' || a.status === 'LIVE');
    });
  }, [auctions, mounted]);

  const upcomingAuctions = useMemo(() => {
    if (!mounted) return [];
    return auctions.filter((a: any) => {
      const start = new Date(a.startDate);
      return start > now || a.status === 'SCHEDULED';
    });
  }, [auctions, mounted]);

  const tabs = [
    { key: 'active' as const, label: 'Güncel Müzayedeler', count: activeAuctions.length, icon: '🔴' },
    { key: 'upcoming' as const, label: 'Gelecek Müzayedeler', count: upcomingAuctions.length, icon: '📅' },
    { key: 'completed' as const, label: 'Tamamlanan Müzayedeler', count: completedAuctions.length, icon: '✅' },
  ];

  // Auto-select first tab with content
  useEffect(() => {
    if (!mounted) return;
    if (activeAuctions.length > 0) setActiveTab('active');
    else if (upcomingAuctions.length > 0) setActiveTab('upcoming');
    else if (completedAuctions.length > 0) setActiveTab('completed');
  }, [mounted, activeAuctions.length, upcomingAuctions.length, completedAuctions.length]);

  const currentAuctions = activeTab === 'active' ? activeAuctions
    : activeTab === 'upcoming' ? upcomingAuctions
    : completedAuctions;

  return (
    <section className="py-10 sm:py-16 bg-muted/30">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">Müzayedeler</h2>
            <p className="text-sm text-muted-foreground mt-1">Tüm müzayedeleri keşfedin</p>
          </div>
          <Link href="/muzayedeler" className="flex items-center gap-1 text-sm text-[#d4af37] hover:underline">
            Tümünü Gör <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? 'bg-[#d4af37] text-black shadow-md'
                  : 'bg-card border border-border text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === tab.key ? 'bg-black/20 text-black' : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {currentAuctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentAuctions.map((auction: any, i: number) => (
              <AuctionCard key={auction?.id ?? i} auction={auction} index={i} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <p className="text-muted-foreground">
              {activeTab === 'active' && 'Şu anda aktif müzayede bulunmuyor.'}
              {activeTab === 'upcoming' && 'Yaklaşan müzayede bulunmuyor.'}
              {activeTab === 'completed' && 'Tamamlanan müzayede bulunmuyor.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}