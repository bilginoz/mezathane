'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Gavel, Heart, Trophy, CreditCard, Clock, ArrowRight, Eye, ArrowLeft, Wallet, Gift } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';

export function BuyerDashboard() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/giris');
      return;
    }
    if (status === 'authenticated') {
      fetch('/api/buyer/dashboard')
        .then(r => r.json())
        .then(d => setData(d))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === 'loading' || loading) {
    return (
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
            </div>
          </div>
        </div>
      </main>
    );
  }

  const user = session?.user as any;
  const stats = data?.stats ?? {};

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => router.back()} className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></button>
            <h1 className="font-display text-2xl font-bold">Hoş Geldiniz, <span className="gold-text">{user?.name ?? 'Kullanıcı'}</span></h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Müzayede aktivitelerinizi yönetin</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Gavel, label: 'Aktif Teklifler', value: stats?.activeBids ?? 0, color: 'text-blue-400', href: '/panel/tekliflerim' },
            { icon: Trophy, label: 'Kazanılan Lotlar', value: stats?.wonLots ?? 0, color: 'text-[#d4af37]', href: '/panel/siparislerim' },
            { icon: Heart, label: 'Favorilerim', value: stats?.watchlistCount ?? 0, color: 'text-red-400', href: '/panel/favorilerim' },
            { icon: CreditCard, label: 'Bekleyen Ödeme', value: stats?.pendingPayments ?? 0, color: 'text-green-400', href: '/panel/siparislerim' },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={stat.href} className="block rounded-xl border border-border bg-card p-4 hover:border-[#d4af37]/50 transition-colors cursor-pointer">
                <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
                <p className="text-2xl font-bold font-mono">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/panel/siparislerim" className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 hover:border-green-500/50 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Siparişlerim</h3>
                <p className="text-xs text-muted-foreground">Kazandığınız ürünler & faturalar</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-green-400 transition-colors" />
            </div>
          </Link>
          <Link href="/panel/hesabim" className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-4 hover:border-[#d4af37]/60 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Hesap Özetim</h3>
                <p className="text-xs text-muted-foreground">Toplam alış, ödenen & bekleyen borç</p>
              </div>
              <Wallet className="h-4 w-4 text-muted-foreground group-hover:text-[#d4af37] transition-colors" />
            </div>
          </Link>
          <Link href="/panel/davet" className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 hover:border-purple-500/50 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Arkadaşını Davet Et</h3>
                <p className="text-xs text-muted-foreground">Davet linki paylaş & ödül kazan</p>
              </div>
              <Gift className="h-4 w-4 text-muted-foreground group-hover:text-purple-400 transition-colors" />
            </div>
          </Link>
          <Link href="/panel/tekliflerim" className="rounded-xl border border-border bg-card p-4 hover:border-[#d4af37]/50 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Tekliflerim</h3>
                <p className="text-xs text-muted-foreground">Tüm teklif geçmişiniz</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-[#d4af37] transition-colors" />
            </div>
          </Link>
          <Link href="/panel/favorilerim" className="rounded-xl border border-border bg-card p-4 hover:border-[#d4af37]/50 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Favorilerim</h3>
                <p className="text-xs text-muted-foreground">Takip ettiğiniz lotlar</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-[#d4af37] transition-colors" />
            </div>
          </Link>
          <Link href="/panel/aramalarim" className="rounded-xl border border-border bg-card p-4 hover:border-[#d4af37]/50 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Kayıtlı Aramalarım</h3>
                <p className="text-xs text-muted-foreground">Yeni lot çıkınca haber alın</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-[#d4af37] transition-colors" />
            </div>
          </Link>
          <Link href="/panel/anlasmazliklar" className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 hover:border-red-500/50 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Anlaşmazlıklar</h3>
                <p className="text-xs text-muted-foreground">Şikayet ve itirazlar</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-red-400 transition-colors" />
            </div>
          </Link>
          <Link href="/panel/ayarlar" className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 hover:border-purple-500/50 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Bildirim Ayarları</h3>
                <p className="text-xs text-muted-foreground">E-posta & bildirim tercihleri</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-purple-400 transition-colors" />
            </div>
          </Link>
          <Link href="/muzayedeler" className="rounded-xl border border-border bg-card p-4 hover:border-[#d4af37]/50 transition-colors group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Müzayedeleri Keşfet</h3>
                <p className="text-xs text-muted-foreground">Aktif müzayedelere göz atın</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-[#d4af37] transition-colors" />
            </div>
          </Link>
        </div>

        {/* Recent Bids */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-4 border-b border-border">
            <h2 className="font-display font-semibold">Son Tekliflerim</h2>
          </div>
          <div className="divide-y divide-border">
            {(data?.recentBids ?? []).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Gavel className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Henüz teklif vermediniz</p>
              </div>
            ) : (
              (data?.recentBids ?? []).map((bid: any) => (
                <Link key={bid?.id} href={`/lot/${bid?.lotId ?? ''}`} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <Image
                      src={bid?.lot?.images?.[0]?.imageUrl ?? 'https://cdn.abacus.ai/images/46235948-79f3-4f4e-aab0-cdfd81b98b42.png'}
                      alt="" fill className="object-cover" sizes="48px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{bid?.lot?.title ?? 'Lot'}</p>
                    <p className="text-xs text-muted-foreground">{bid?.lot?.auction?.title ?? ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono text-[#d4af37]">{formatPrice(bid?.amount ?? 0)}</p>
                    <p className={`text-xs ${bid?.isWinning ? 'text-green-400' : 'text-red-400'}`}>
                      {bid?.isWinning ? 'Önde' : 'Geçildi'}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}