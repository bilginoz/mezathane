'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, TrendingUp, Users, Gavel, DollarSign, ArrowLeft, ShoppingBag, Percent, Trophy, Wallet, HeartPulse, AlertTriangle, Sparkles, ShieldAlert, Network } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';
import { usePaymentMode } from '@/hooks/use-payment-mode';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#d4af37', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b'];

export function ReportsManagement() {
  const paymentMode = usePaymentMode();
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [sellerHealth, setSellerHealth] = useState<any[]>([]);
  const [healthLoading, setHealthLoading] = useState(true);
  const [shillData, setShillData] = useState<any>(null);
  const [shillLoading, setShillLoading] = useState(true);

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

  // Satıcı sağlığı dönemden bağımsız (tüm zamanlar), bu yüzden ayrı ve tek seferlik çekiliyor.
  useEffect(() => {
    if (status === 'authenticated' && user?.role === 'ADMIN') {
      fetch('/api/admin/seller-health')
        .then(r => r.json())
        .then(d => setSellerHealth(d?.sellers ?? []))
        .catch(() => {})
        .finally(() => setHealthLoading(false));
    }
  }, [status, user?.role]);

  // Şüpheli teklif (shill-bid) taraması da dönemden bağımsız.
  useEffect(() => {
    if (status === 'authenticated' && user?.role === 'ADMIN') {
      fetch('/api/admin/shill-detection')
        .then(r => r.json())
        .then(d => setShillData(d))
        .catch(() => {})
        .finally(() => setShillLoading(false));
    }
  }, [status, user?.role]);

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

        {paymentMode === 'DIRECT' && (
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 mb-4 text-xs text-muted-foreground">
            <strong className="text-foreground">Doğrudan ödeme modeli aktif:</strong> Bu modelde platform üründen komisyon almaz;
            aşağıdaki "Komisyon Geliri" gibi kalemler yalnızca eski (ESCROW) kayıtları yansıtır. Platform geliri Müzayede Hakkı'dır
            (Finans sayfasında görülür). Teklif/kullanıcı istatistikleri her iki modelde de geçerlidir.
          </div>
        )}

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
        <div className="rounded-xl border border-border bg-card p-4 mb-6">          <h2 className="font-display font-semibold mb-4">Kategori Dağılımı</h2>
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

        {/* Kategori Arz-Talep Dengesizliği */}
        {(data?.categoryDemand?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-[#d4af37]" />
              <h2 className="font-display font-semibold">Kategori Arz-Talep Dengesi</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Oran = (teklif + favori) / yayındaki lot sayısı. Yüksek oran → alıcı ilgisine göre satıcı arzı
              yetersiz (mevcut satıcıları bu kategoriye yönlendirin veya yeni satıcı arayın). Düşük oran → arz fazlası.
            </p>
            <div className="space-y-2">
              {data.categoryDemand.slice(0, 8).map((c: any, i: number) => {
                const maxRatio = data.categoryDemand[0]?.ratio || 1;
                const pct = maxRatio > 0 ? (c.ratio / maxRatio) * 100 : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground">arz: {c.supply} lot · talep: {c.demand} · oran: <strong className="text-foreground">{c.ratio}</strong></span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-[#d4af37] rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Satıcı Sağlığı */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <HeartPulse className="h-5 w-5 text-red-400" />
            <h2 className="font-display font-semibold">Satıcı Sağlığı</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Skor = satış oranı (%40) + düşük anlaşmazlık (%30) + kalite bilgisi kullanımı — menşe/restorasyon
            beyanı (%30). En riskli/düşen satıcılar üstte; onlara proaktif öneri gönderebilirsiniz. Bu, "kim
            Müzayede Hakkı almadı" listesi değil — o da ROI sütununda tek bir bileşen olarak yer alıyor.
          </p>
          {healthLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>
          ) : sellerHealth.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Henüz onaylı satıcı/satış verisi yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left p-2">Satıcı</th>
                    <th className="text-center p-2">Skor</th>
                    <th className="text-center p-2">Satış Oranı</th>
                    <th className="text-center p-2">Anlaşmazlık</th>
                    <th className="text-center p-2">Son Dk. Rekabeti</th>
                    <th className="text-center p-2">Onboarding</th>
                    <th className="text-center p-2">Hak ROI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sellerHealth.map((s: any) => (
                    <tr key={s.sellerId} className="hover:bg-muted/50">
                      <td className="p-2 font-medium">{s.companyName}</td>
                      <td className="p-2 text-center">
                        {s.healthScore == null ? (
                          <span className="text-muted-foreground text-xs">veri yok</span>
                        ) : (
                          <span className={`font-mono font-bold px-2 py-0.5 rounded-full text-xs ${
                            s.healthScore >= 70 ? 'bg-green-500/20 text-green-400' :
                            s.healthScore >= 40 ? 'bg-amber-500/20 text-amber-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>{s.healthScore}</span>
                        )}
                      </td>
                      <td className="p-2 text-center font-mono">{s.saleRatePct != null ? `%${s.saleRatePct}` : '—'}</td>
                      <td className="p-2 text-center font-mono">
                        {s.disputeCount > 0 ? <span className="text-red-400 inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />%{s.disputeRatePct}</span> : '—'}
                      </td>
                      <td className="p-2 text-center font-mono">{s.lastMinuteRatioPct != null ? `%${s.lastMinuteRatioPct}` : '—'}</td>
                      <td className="p-2 text-center">
                        {!s.isNewSeller ? <span className="text-muted-foreground text-xs">—</span> :
                          s.onboardingHealthy ? <span className="text-green-400 text-xs">Sattı ✓</span> :
                          <span className="text-amber-400 text-xs">Henüz satmadı</span>}
                      </td>
                      <td className="p-2 text-center font-mono">{s.roi != null ? `${s.roi}x` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Şüpheli Teklif (Shill-Bid) Taraması */}
        <div className="rounded-xl border border-border bg-card p-4 mt-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-5 w-5 text-red-400" />
            <h2 className="font-display font-semibold">Şüpheli Teklif Taraması</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Bu bir otomatik engelleme değil — sadece incelemeniz için işaretliyor. Yanlış pozitif olabilir
            (ör. aynı evden/ofisten iki gerçek kullanıcı), karar her zaman sizde.
          </p>

          {shillLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2 mt-4">
                <Network className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold">Aynı IP'yi Paylaşan Hesaplar</h3>
              </div>
              {(shillData?.ipSharing?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground pb-4">Şu an işaretlenmiş bir IP paylaşımı yok.</p>
              ) : (
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left p-2">Hesap 1</th>
                        <th className="text-left p-2">Hesap 2</th>
                        <th className="text-center p-2">Ortak Lot</th>
                        <th className="text-left p-2">Hangi Lotlar / Satıcılar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {shillData.ipSharing.map((p: any, i: number) => (
                        <tr key={i} className={p.sharedLotCount >= 2 ? 'bg-red-500/5' : ''}>
                          <td className="p-2 font-medium">{p.user1}</td>
                          <td className="p-2 font-medium">{p.user2}</td>
                          <td className="p-2 text-center font-mono">{p.sharedLotCount >= 2 ? <span className="text-red-400 font-bold">{p.sharedLotCount}</span> : p.sharedLotCount}</td>
                          <td className="p-2 text-xs text-muted-foreground max-w-[320px] truncate" title={p.lots.map((l: any) => `#${l.lotNumber} ${l.title} (${l.sellerName})`).join(', ')}>
                            {p.lots.slice(0, 2).map((l: any) => `#${l.lotNumber} ${l.title}`).join(', ')}{p.lots.length > 2 ? ` +${p.lots.length - 2} daha` : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-semibold">Tek Satıcıya Yoğunlaşıp Hiç Kazanmayan Alıcılar</h3>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">Tekliflerinin ≥%70'i tek bir satıcıda toplanan ve o satıcıdan hiç lot kazanmamış alıcılar — fiyat şişirip çekilme deseni olabilir.</p>
              {(shillData?.concentrationFlags?.length ?? 0) === 0 ? (
                <p className="text-xs text-muted-foreground">Şu an işaretlenmiş bir konsantrasyon uyarısı yok.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left p-2">Alıcı</th>
                        <th className="text-left p-2">Satıcı</th>
                        <th className="text-center p-2">Bu Satıcıya Teklif</th>
                        <th className="text-center p-2">Toplam Teklifi</th>
                        <th className="text-center p-2">Yoğunlaşma</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {shillData.concentrationFlags.map((c: any, i: number) => (
                        <tr key={i}>
                          <td className="p-2 font-medium">{c.buyerName}</td>
                          <td className="p-2">{c.sellerName}</td>
                          <td className="p-2 text-center font-mono">{c.bidsOnSeller}</td>
                          <td className="p-2 text-center font-mono text-muted-foreground">{c.totalBids}</td>
                          <td className="p-2 text-center font-mono text-amber-400">%{c.concentrationPct}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
