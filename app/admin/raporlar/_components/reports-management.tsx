'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, TrendingUp, Users, Gavel, DollarSign, ArrowLeft, ShoppingBag, Percent, Trophy, Wallet } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#d4af37', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b'];

export function ReportsManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated' && user?.role !== 'ADMIN') { router.replace('/panel'); return; }
    if (status === 'authenticated') {
      setLoading(true);
      fetch(`/api/admin/reports?period=${period}`)
        .then(r => r.json())
        .then(d => setData(d))
        .catch(() => toast.error('Raporlar yüklenemedi'))
        .finally(() => setLoading(false));
    }
  }, [status, router, user?.role, period]);

  if (status === 'loading' || loading) {
    return (
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}</div>
            <div className="h-64 bg-muted rounded-xl" />
          </div>
        </div>
      </main>
    );
  }

  const summary = data?.summary ?? {};

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></Link>
            <BarChart3 className="h-6 w-6 text-[#d4af37]" />
            <h1 className="font-display text-2xl font-bold">Raporlar & Analizler</h1>
          </div>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
          >
            <option value="7">Son 7 Gün</option>
            <option value="30">Son 30 Gün</option>
            <option value="90">Son 90 Gün</option>
            <option value="365">Son 1 Yıl</option>
          </select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[
            { icon: Gavel, label: 'Toplam Teklif', value: summary.totalBidsInPeriod ?? 0 },
            { icon: DollarSign, label: 'Teklif Hacmi', value: formatPrice(summary.totalVolumeInPeriod ?? 0), isStr: true },
            { icon: Users, label: 'Yeni Kullanıcı', value: summary.totalNewUsers ?? 0 },
            { icon: TrendingUp, label: 'Günlük Ort. Teklif', value: summary.avgDailyBids ?? 0 },
          ].map((stat: any, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <stat.icon className="h-5 w-5 text-[#d4af37] mb-2" />
              <p className="text-xl font-bold font-mono">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Satış & Komisyon Kartları */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { icon: ShoppingBag, label: 'Satılan Lot', value: summary.soldLotsCount ?? 0, color: 'text-green-400' },
            { icon: Wallet, label: 'Satış Geliri', value: formatPrice(summary.totalSalesRevenue ?? 0), isStr: true, color: 'text-emerald-400' },
            { icon: DollarSign, label: 'Komisyon Geliri', value: formatPrice(summary.totalCommission ?? 0), isStr: true, color: 'text-amber-400' },
            { icon: Percent, label: 'Tahsilat Oranı', value: `%${summary.collectionRate ?? 0}`, isStr: true, color: 'text-blue-400' },
            { icon: TrendingUp, label: 'Dönüşüm Oranı', value: `%${summary.conversionRate ?? 0}`, isStr: true, color: 'text-purple-400' },
          ].map((stat: any, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
              <p className="text-xl font-bold font-mono">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Bid Activity Chart */}
        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <h2 className="font-display font-semibold mb-4">Teklif Aktivitesi</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data?.bidChart ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#888" />
              <YAxis tick={{ fontSize: 11 }} stroke="#888" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                labelStyle={{ color: '#d4af37' }}
              />
              <Legend />
              <Area type="monotone" dataKey="teklifler" stroke="#d4af37" fill="#d4af37" fillOpacity={0.2} name="Teklif Sayısı" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Volume Chart */}
        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <h2 className="font-display font-semibold mb-4">Teklif Hacmi (₺)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.bidChart ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#888" />
              <YAxis tick={{ fontSize: 11 }} stroke="#888" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                labelStyle={{ color: '#d4af37' }}
                formatter={(value: any) => [`${Number(value).toLocaleString('tr-TR')} ₺`, 'Hacim']}
              />
              <Bar dataKey="hacim" fill="#d4af37" radius={[4, 4, 0, 0]} name="Hacim (₺)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* User Registration Chart */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-display font-semibold mb-4">Yeni Kullanıcı Kayıtları</h2>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data?.userChart ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#888" />
                <YAxis tick={{ fontSize: 10 }} stroke="#888" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }}
                  labelStyle={{ color: '#3b82f6' }}
                />
                <Area type="monotone" dataKey="kayitlar" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Kayıtlar" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Auction Status Pie */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-display font-semibold mb-4">Müzayede Durumları</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data?.auctionChart ?? []}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }: any) => `${name}: ${value}`}
                >
                  {(data?.auctionChart ?? []).map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Satıcılar */}
        {(data?.topSellers?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-5 w-5 text-amber-400" />
              <h2 className="font-display font-semibold">En Çok Satan Satıcılar</h2>
            </div>
            <div className="space-y-3">
              {data.topSellers.map((seller: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                      i === 0 ? 'bg-amber-500/20 text-amber-400' :
                      i === 1 ? 'bg-gray-300/20 text-gray-300' :
                      i === 2 ? 'bg-amber-700/20 text-amber-600' :
                      'bg-white/10 text-white/60'
                    }`}>{i + 1}</span>
                    <span className="font-medium">{seller.companyName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">{seller.soldCount} satış</span>
                    <span className="font-mono font-semibold text-[#d4af37]">{formatPrice(seller.totalSales)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Distribution */}
        <div className="rounded-xl border border-border bg-card p-4">          <h2 className="font-display font-semibold mb-4">Kategori Dağılımı</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.categoryChart ?? []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="#888" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#888" width={120} />
              <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
              <Bar dataKey="lotSayisi" fill="#d4af37" radius={[0, 4, 4, 0]} name="Lot Sayısı" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </main>
  );
}
