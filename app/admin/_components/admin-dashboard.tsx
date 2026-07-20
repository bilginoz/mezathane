'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Users, Store, Gavel, Layers, BarChart3, TrendingUp, Shield, CheckCircle, XCircle, Clock, ArrowRight, Receipt, Settings, FileText, Tag, MessageSquare, AlertTriangle, Calendar, Database, ArrowLeft, Ticket, PenTool, Gift } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export function AdminDashboard() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated' && user?.role !== 'ADMIN') { router.replace('/panel'); return; }
    if (status === 'authenticated') {
      fetch('/api/admin/dashboard')
        .then(r => r.json())
        .then(d => setData(d))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [status, router, user?.role]);

  const handleSellerAction = async (sellerId: string, action: string) => {
    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      const result = await res.json();
      if (result?.seller) {
        toast.success(`Satıcı ${action === 'APPROVED' ? 'onaylandı' : 'reddedildi'}`);
        const d = await fetch('/api/admin/dashboard').then(r => r.json());
        setData(d);
      }
    } catch {
      toast.error('Hata oluştu');
    }
  };

  if (status === 'loading' || loading) {
    return <main className="flex-1 py-8"><div className="mx-auto max-w-[1200px] px-4"><div className="animate-pulse space-y-6"><div className="h-8 bg-muted rounded w-48" /><div className="grid grid-cols-3 gap-4">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}</div></div></div></main>;
  }

  const stats = data?.stats ?? {};

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => router.back()} className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></button>
          <Shield className="h-6 w-6 text-[#d4af37]" />
          <h1 className="font-display text-2xl font-bold">Admin Paneli</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Users, label: 'Kullanıcılar', value: stats?.totalUsers ?? 0 },
            { icon: Store, label: 'Satıcılar', value: stats?.totalSellers ?? 0 },
            { icon: Gavel, label: 'Müzayedeler', value: stats?.totalAuctions ?? 0 },
            { icon: Layers, label: 'Lotlar', value: stats?.totalLots ?? 0 },
            { icon: BarChart3, label: 'Teklifler', value: stats?.totalBids ?? 0 },
            { icon: TrendingUp, label: 'Gelir', value: formatPrice(stats?.totalRevenue ?? 0), isStr: true },
            { icon: Clock, label: 'Bekleyen Satıcı', value: stats?.pendingSellers ?? 0 },
            { icon: Gavel, label: 'Aktif Müzayede', value: stats?.activeAuctions ?? 0 },
          ].map((stat: any, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-border bg-card p-4">
              <stat.icon className="h-5 w-5 text-[#d4af37] mb-2" />
              <p className="text-xl font-bold font-mono">{stat.isStr ? stat.value : stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <Link href="/admin/kullanicilar" className="rounded-xl border border-border bg-card px-5 py-3 hover:bg-muted transition-colors flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-[#d4af37]" />
            Kullanıcı Yönetimi
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/admin/saticilar" className="rounded-xl border border-border bg-card px-5 py-3 hover:bg-muted transition-colors flex items-center gap-2 text-sm font-medium">
            <Store className="h-4 w-4 text-[#d4af37]" />
            Satıcı Yönetimi
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/admin/mesajlar" className="rounded-xl border border-border bg-card px-5 py-3 hover:bg-muted transition-colors flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="h-4 w-4 text-[#d4af37]" />
            İletişim Mesajları
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/admin/finans" className="rounded-xl border border-border bg-card px-5 py-3 hover:bg-muted transition-colors flex items-center gap-2 text-sm font-medium">
            <Receipt className="h-4 w-4 text-[#d4af37]" />
            Cari Hesaplar & Finans
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/admin/site" className="rounded-xl border border-border bg-card px-5 py-3 hover:bg-muted transition-colors flex items-center gap-2 text-sm font-medium">
            <Settings className="h-4 w-4 text-[#d4af37]" />
            Site Yönetimi
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/admin/sayfalar" className="rounded-xl border border-border bg-card px-5 py-3 hover:bg-muted transition-colors flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-[#d4af37]" />
            Sayfa Yönetimi
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/admin/kategoriler" className="rounded-xl border border-border bg-card px-5 py-3 hover:bg-muted transition-colors flex items-center gap-2 text-sm font-medium">
            <Tag className="h-4 w-4 text-[#d4af37]" />
            Kategori Yönetimi
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/admin/raporlar" className="rounded-xl border border-border bg-card px-5 py-3 hover:bg-muted transition-colors flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4 text-[#d4af37]" />
            Raporlar & Analizler
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/admin/anlasmazliklar" className="rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-3 hover:border-red-500/50 transition-colors flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            Anlaşmazlıklar
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/admin/takvim" className="rounded-xl border border-blue-500/30 bg-blue-500/5 px-5 py-3 hover:border-blue-500/50 transition-colors flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4 text-blue-400" />
            Müzayede Takvimi
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/admin/veri-yonetimi" className="rounded-xl border border-purple-500/30 bg-purple-500/5 px-5 py-3 hover:border-purple-500/50 transition-colors flex items-center gap-2 text-sm font-medium">
            <Database className="h-4 w-4 text-purple-400" />
            Veri Yönetimi & Toplu İşlem
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/admin/denetim" className="rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-3 hover:border-red-500/50 transition-colors flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4 text-red-400" />
            Denetim Kayıtları
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/admin/etiketler" className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-5 py-3 hover:border-cyan-500/50 transition-colors flex items-center gap-2 text-sm font-medium">
            <Tag className="h-4 w-4 text-cyan-400" />
            Etiket Yönetimi
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/admin/email-sablonlari" className="rounded-xl border border-pink-500/30 bg-pink-500/5 px-5 py-3 hover:border-pink-500/50 transition-colors flex items-center gap-2 text-sm font-medium">
            <Receipt className="h-4 w-4 text-pink-400" />
            E-posta Şablonları
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/admin/kuponlar" className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-3 hover:border-amber-500/50 transition-colors flex items-center gap-2 text-sm font-medium">
            <Ticket className="h-4 w-4 text-amber-400" />
            Kupon Yönetimi
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/admin/blog" className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-5 py-3 hover:border-violet-500/50 transition-colors flex items-center gap-2 text-sm font-medium">
            <PenTool className="h-4 w-4 text-violet-400" />
            Blog Yönetimi
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/admin/degisiklik-talepleri" className="rounded-xl border border-orange-500/30 bg-orange-500/5 px-5 py-3 hover:border-orange-500/50 transition-colors flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4 text-orange-400" />
            Bilgi Değişiklik Talepleri
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>

        {/* Pending Sellers */}
        <div className="rounded-xl border border-border bg-card mb-8">
          <div className="p-4 border-b border-border">
            <h2 className="font-display font-semibold">Bekleyen Satıcı Başvuruları</h2>
          </div>
          <div className="divide-y divide-border">
            {(data?.pendingSellerApps ?? []).length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">Bekleyen başvuru yok</div>
            ) : (
              (data?.pendingSellerApps ?? []).map((seller: any) => (
                <div key={seller?.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{seller?.companyName ?? ''}</p>
                    <p className="text-xs text-muted-foreground truncate">{seller?.user?.fullName} - {seller?.user?.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(seller?.createdAt)}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleSellerAction(seller.id, 'APPROVED')} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Onayla
                    </button>
                    <button onClick={() => handleSellerAction(seller.id, 'REJECTED')} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700 flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Reddet
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="rounded-xl border border-border bg-card">
          <div className="p-4 border-b border-border">
            <h2 className="font-display font-semibold">Son Kayıt Olan Kullanıcılar</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="p-3">Ad</th><th className="p-3">E-posta</th><th className="p-3">Rol</th><th className="p-3">Tarih</th></tr></thead>
              <tbody>
                {(data?.recentUsers ?? []).map((u: any) => (
                  <tr key={u?.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="p-3 font-medium">{u?.fullName ?? ''}</td>
                    <td className="p-3 text-muted-foreground">{u?.email ?? ''}</td>
                    <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${u?.role === 'ADMIN' ? 'bg-[#d4af37]/20 text-[#d4af37]' : u?.role === 'SELLER' ? 'bg-blue-500/20 text-blue-400' : 'bg-muted text-muted-foreground'}`}>{u?.role ?? ''}</span></td>
                    <td className="p-3 text-muted-foreground">{formatDate(u?.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}