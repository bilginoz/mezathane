'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Shield, ShieldOff, ShieldCheck, ChevronLeft, ChevronRight, Pencil, X, Ban, CheckCircle, UserCheck, Store, ArrowLeft, Eye, Package, Gavel, XCircle, RefreshCw, Loader2, AlertTriangle, Wallet, CreditCard, Clock } from 'lucide-react';
import { formatDate, formatPrice } from '@/lib/utils';
import Image from 'next/image';
import { toast } from 'sonner';

interface UserData {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  memberNumber: number | null;
  twoFactorEnabled?: boolean;
  sellerProfile: { companyName: string; status: string } | null;
  _count: { bids: number };
}

export function UsersManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', phone: '' });
  const [detailUser, setDetailUser] = useState<UserData | null>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saleAction, setSaleAction] = useState<{ lotId: string; title: string; action: 'cancel' | 'transfer' } | null>(null);
  const [saleBanBuyer, setSaleBanBuyer] = useState(false);
  const [saleBusy, setSaleBusy] = useState(false);

  const user = session?.user as any;

  const openDetail = useCallback(async (u: UserData) => {
    setDetailUser(u);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Detay yüklenemedi'); setDetailUser(null); return; }
      setDetailData(data);
    } catch {
      toast.error('Detay yüklenemedi');
      setDetailUser(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const submitSaleAction = async () => {
    if (!saleAction) return;
    setSaleBusy(true);
    try {
      const res = await fetch('/api/admin/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotId: saleAction.lotId, action: saleAction.action, banBuyer: saleBanBuyer }),
      });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error ?? 'İşlem başarısız'); return; }
      toast.success(result.message ?? 'İşlem tamamlandı');
      setSaleAction(null);
      setSaleBanBuyer(false);
      if (detailUser) await openDetail(detailUser);
      fetchUsers();
    } catch {
      toast.error('İşlem başarısız');
    } finally {
      setSaleBusy(false);
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    } catch {
      toast.error('Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated' && user?.role !== 'ADMIN') { router.replace('/panel'); return; }
    if (status === 'authenticated') fetchUsers();
  }, [status, router, user?.role, fetchUsers]);

  const handleAction = async (userId: string, action: string, data?: any) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, data }),
      });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error ?? 'Hata oluştu'); return; }
      toast.success(
        action === 'ban' ? 'Kullanıcı engellendi' :
        action === 'unban' ? 'Engel kaldırıldı' :
        action === 'updateRole' ? 'Rol güncellendi' :
        'Kullanıcı güncellendi'
      );
      fetchUsers();
      setEditingUser(null);
    } catch {
      toast.error('İşlem başarısız');
    }
  };

  const openEdit = (u: UserData) => {
    setEditingUser(u);
    setEditForm({ fullName: u.fullName, email: u.email, phone: u.phone ?? '' });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const roleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Admin';
      case 'SELLER': return 'Satıcı';
      default: return 'Alıcı';
    }
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-[#d4af37]/20 text-[#d4af37]';
      case 'SELLER': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (status === 'loading' || (status === 'authenticated' && loading && users.length === 0)) {
    return (
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-12 bg-muted rounded" />
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-muted rounded" />)}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></Link>
          <Users className="h-6 w-6 text-[#d4af37]" />
          <h1 className="font-display text-2xl font-bold">Kullanıcı Yönetimi</h1>
          <span className="ml-2 text-sm text-muted-foreground">({total} kullanıcı)</span>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Ad veya e-posta ile ara..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
              />
            </div>
            <select
              value={roleFilter}
              onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
            >
              <option value="">Tüm Roller</option>
              <option value="BUYER">Alıcı</option>
              <option value="SELLER">Satıcı</option>
              <option value="ADMIN">Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
            >
              <option value="">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="banned">Engelli</option>
            </select>
            <button type="submit" className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-medium text-black hover:bg-[#c4a030] transition-colors">
              Ara
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-3">Üye No</th>
                  <th className="p-3">Kullanıcı</th>
                  <th className="p-3">E-posta</th>
                  <th className="p-3">Telefon</th>
                  <th className="p-3">Rol</th>
                  <th className="p-3">Teklifler</th>
                  <th className="p-3">Durum</th>
                  <th className="p-3">Kayıt</th>
                  <th className="p-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/50 transition-colors">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{u.memberNumber ?? '-'}</td>
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{u.fullName}</p>
                        {u.sellerProfile && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Store className="h-3 w-3" /> {u.sellerProfile.companyName}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3 text-muted-foreground">{u.phone ?? '-'}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleBadge(u.role)}`}>
                        {roleLabel(u.role)}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-muted-foreground">{u._count?.bids ?? 0}</td>
                    <td className="p-3">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400">
                          <CheckCircle className="h-3 w-3" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400">
                          <Ban className="h-3 w-3" /> Engelli
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{formatDate(u.createdAt)}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openDetail(u)} title="Detay" className="rounded-lg p-1.5 hover:bg-[#d4af37]/10 transition-colors">
                          <Eye className="h-3.5 w-3.5 text-[#d4af37]" />
                        </button>
                        <Link href={`/admin/finans/alici/${u.id}`} title="Cari Hesap" className="rounded-lg p-1.5 hover:bg-green-500/10 transition-colors">
                          <Wallet className="h-3.5 w-3.5 text-green-400" />
                        </Link>
                        <button onClick={() => openEdit(u)} title="Düzenle" className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        {u.isActive ? (
                          <button onClick={() => handleAction(u.id, 'ban')} title="Engelle" className="rounded-lg p-1.5 hover:bg-red-500/10 transition-colors">
                            <ShieldOff className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        ) : (
                          <button onClick={() => handleAction(u.id, 'unban')} title="Engeli Kaldır" className="rounded-lg p-1.5 hover:bg-green-500/10 transition-colors">
                            <UserCheck className="h-3.5 w-3.5 text-green-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Kullanıcı bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border p-3">
              <p className="text-xs text-muted-foreground">Sayfa {page} / {totalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg p-1.5 hover:bg-muted disabled:opacity-30 transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg p-1.5 hover:bg-muted disabled:opacity-30 transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        <AnimatePresence>
          {editingUser && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              onClick={() => setEditingUser(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md rounded-xl border border-border bg-card p-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display font-semibold text-lg">Kullanıcı Düzenle</h3>
                  <button onClick={() => setEditingUser(null)} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Ad Soyad</label>
                    <input
                      type="text" value={editForm.fullName}
                      onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">E-posta</label>
                    <input
                      type="email" value={editForm.email}
                      onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Telefon</label>
                    <input
                      type="text" value={editForm.phone}
                      onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Rol</label>
                    <select
                      value={editingUser.role}
                      onChange={e => handleAction(editingUser.id, 'updateRole', { role: e.target.value })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                    >
                      <option value="BUYER">Alıcı</option>
                      <option value="SELLER">Satıcı</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={() => handleAction(editingUser.id, 'update', editForm)}
                    className="flex-1 rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-medium text-black hover:bg-[#c4a030] transition-colors"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => setEditingUser(null)}
                    className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    İptal
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buyer Detail Modal */}
        <AnimatePresence>
          {detailUser && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4"
              onClick={() => setDetailUser(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="my-8 w-full max-w-3xl rounded-xl border border-border bg-card p-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-[#d4af37]" /> {detailUser.fullName}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm text-muted-foreground">{detailUser.email}</p>
                      {detailUser.memberNumber && (
                        <span className="text-[10px] font-mono bg-[#d4af37]/15 text-[#d4af37] px-1.5 py-0.5 rounded">Üye #{detailUser.memberNumber}</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${roleBadge(detailUser.role)}`}>{roleLabel(detailUser.role)}</span>
                      {detailUser.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400"><CheckCircle className="h-3 w-3" /> Aktif</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400"><Ban className="h-3 w-3" /> Engelli</span>
                      )}
                      {detailUser.twoFactorEnabled && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-400"><ShieldCheck className="h-3 w-3" /> 2FA Açık</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {detailUser.twoFactorEnabled && (
                      <button
                        onClick={() => {
                          if (!confirm(`${detailUser.fullName} kullanıcısının iki adımlı doğrulaması KAPATILACAK.\n\nBunu sadece kullanıcı telefonuna ve yedek kodlarına erişemiyorsa yapın. İşlem denetim günlüğüne kaydedilir.\n\nDevam edilsin mi?`)) return;
                          handleAction(detailUser.id, 'reset2fa');
                          setDetailUser(u => u ? { ...u, twoFactorEnabled: false } : u);
                        }}
                        title="Kullanıcı telefonunu/yedek kodlarını kaybettiyse 2FA'yı sıfırlar"
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/10 transition-colors"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> 2FA Sıfırla
                      </button>
                    )}
                    {detailUser.isActive ? (
                      <button onClick={() => { handleAction(detailUser.id, 'ban'); setDetailUser(u => u ? { ...u, isActive: false } : u); }} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors">
                        <ShieldOff className="h-3.5 w-3.5" /> Engelle
                      </button>
                    ) : (
                      <button onClick={() => { handleAction(detailUser.id, 'unban'); setDetailUser(u => u ? { ...u, isActive: true } : u); }} className="inline-flex items-center gap-1 rounded-lg border border-green-500/30 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/10 transition-colors">
                        <UserCheck className="h-3.5 w-3.5" /> Engeli Kaldır
                      </button>
                    )}
                    <button onClick={() => setDetailUser(null)} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
                  </div>
                </div>

                {detailLoading || !detailData ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" /></div>
                ) : (
                  <div className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-[11px] text-muted-foreground">Toplam Teklif</p>
                        <p className="text-lg font-bold font-mono">{detailData.stats.totalBids}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-[11px] text-muted-foreground">Kazandığı Ürün</p>
                        <p className="text-lg font-bold font-mono">{detailData.stats.wonCount}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-[11px] text-muted-foreground">Ödemeyen</p>
                        <p className={`text-lg font-bold font-mono ${detailData.stats.unpaidCount > 0 ? 'text-red-400' : ''}`}>{detailData.stats.unpaidCount}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-[11px] text-muted-foreground">Toplam Harcama</p>
                        <p className="text-lg font-bold font-mono text-[#d4af37]">{formatPrice(detailData.stats.totalSpent)}</p>
                      </div>
                    </div>

                    {/* Alıcı Cari Hesabı */}
                    {detailData.cari && detailData.cari.soldCount > 0 && (
                      <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Wallet className="h-4 w-4 text-[#d4af37]" />
                          <h4 className="font-semibold text-sm">Alıcı Cari Hesabı</h4>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="rounded-lg bg-card p-3">
                            <p className="text-[11px] text-muted-foreground mb-1">Toplam Alışveriş</p>
                            <p className="font-mono font-bold text-sm">{formatPrice(detailData.cari.totalPurchased)}</p>
                          </div>
                          <div className="rounded-lg bg-card p-3">
                            <div className="flex items-center gap-1 mb-1"><CheckCircle className="h-3 w-3 text-green-400" /><p className="text-[11px] text-muted-foreground">Ödenen</p></div>
                            <p className="font-mono font-bold text-sm text-green-400">{formatPrice(detailData.cari.totalPaid)}</p>
                          </div>
                          <div className="rounded-lg bg-card p-3">
                            <div className="flex items-center gap-1 mb-1"><Clock className="h-3 w-3 text-red-400" /><p className="text-[11px] text-muted-foreground">Bekleyen Borç</p></div>
                            <p className="font-mono font-bold text-sm text-red-400">{formatPrice(detailData.cari.pendingDebt)}</p>
                          </div>
                          <div className="rounded-lg bg-card p-3">
                            <div className="flex items-center gap-1 mb-1"><AlertTriangle className="h-3 w-3 text-amber-400" /><p className="text-[11px] text-muted-foreground">Gecikmiş</p></div>
                            <p className={`font-mono font-bold text-sm ${detailData.cari.overdueAmount > 0 ? 'text-amber-400' : ''}`}>{formatPrice(detailData.cari.overdueAmount)}</p>
                            {detailData.cari.overdueCount > 0 && <p className="text-[10px] text-amber-400/80">{detailData.cari.overdueCount} gecikmiş ödeme</p>}
                          </div>
                        </div>
                        <Link href={`/admin/finans/alici/${detailUser.id}`} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#d4af37]/40 px-4 py-2 text-sm font-medium text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors">
                          <CreditCard className="h-4 w-4" /> Cari Hesap Detayına Git
                        </Link>
                      </div>
                    )}

                    {/* Purchases */}
                    <div>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Package className="h-4 w-4 text-[#d4af37]" /> Kazandığı / Satın Aldığı Ürünler</h4>
                      {detailData.purchases.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center rounded-lg border border-border bg-muted/20">Kazandığı ürün yok</p>
                      ) : (
                        <div className="space-y-2">
                          {detailData.purchases.map((p: any) => (
                            <div key={p.lotId} className="flex items-center gap-3 rounded-lg border border-border bg-background p-2.5">
                              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                                {p.image ? (
                                  <Image src={p.image} alt={p.title} fill className="object-cover" sizes="48px" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center"><Package className="h-5 w-5 text-muted-foreground" /></div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">#{p.lotNumber} {p.title}</p>
                                <p className="truncate text-xs text-muted-foreground">{p.auctionTitle}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold font-mono text-[#d4af37]">{p.salePrice != null ? formatPrice(p.salePrice) : '-'}</p>
                                {p.lotStatus === 'UNSOLD' || p.lotStatus === 'CANCELLED' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"><XCircle className="h-3 w-3" /> Satılmadı</span>
                                ) : p.isPaid ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400"><CheckCircle className="h-3 w-3" /> Ödendi</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400"><AlertTriangle className="h-3 w-3" /> Ödeme Bekliyor</span>
                                )}
                              </div>
                              {p.lotStatus === 'SOLD' && !p.isPaid && (
                                <div className="flex flex-col gap-1">
                                  <button onClick={() => { setSaleBanBuyer(false); setSaleAction({ lotId: p.lotId, title: `#${p.lotNumber} ${p.title}`, action: 'cancel' }); }} className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/10 transition-colors whitespace-nowrap">
                                    <XCircle className="h-3 w-3" /> Satışı İptal Et
                                  </button>
                                  <button onClick={() => { setSaleBanBuyer(false); setSaleAction({ lotId: p.lotId, title: `#${p.lotNumber} ${p.title}`, action: 'transfer' }); }} className="inline-flex items-center gap-1 rounded-lg border border-[#d4af37]/40 px-2 py-1 text-[11px] font-medium text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors whitespace-nowrap">
                                    <RefreshCw className="h-3 w-3" /> 2. Teklife Devret
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent Bids */}
                    <div>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Gavel className="h-4 w-4 text-[#d4af37]" /> Son Teklifler</h4>
                      {detailData.recentBids.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center rounded-lg border border-border bg-muted/20">Teklif yok</p>
                      ) : (
                        <div className="space-y-1.5">
                          {detailData.recentBids.map((b: any) => (
                            <div key={b.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm">#{b.lotNumber} {b.lotTitle}</p>
                                <p className="truncate text-xs text-muted-foreground">{b.auctionTitle} · {formatDate(b.createdAt)}</p>
                              </div>
                              {b.isWinning && <span className="rounded-full bg-[#d4af37]/20 px-2 py-0.5 text-[10px] font-medium text-[#d4af37]">Kazanan</span>}
                              <p className="text-sm font-bold font-mono">{formatPrice(b.amount)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sale Action Confirm Modal */}
        <AnimatePresence>
          {saleAction && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
              onClick={() => !saleBusy && setSaleAction(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md rounded-xl border border-border bg-card p-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className={`h-5 w-5 ${saleAction.action === 'cancel' ? 'text-red-400' : 'text-[#d4af37]'}`} />
                  <h3 className="font-display font-semibold text-lg">{saleAction.action === 'cancel' ? 'Satışı İptal Et' : '2. Teklife Devret'}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{saleAction.title}</p>
                <p className="text-sm mb-4">
                  {saleAction.action === 'cancel'
                    ? 'Ürün “Satılmadı” durumuna alınacak ve alıcıyla bağlantısı kaldırılacak. Daha sonra tekrar müzayedeye koyabilirsiniz. Bekleyen ödeme kaydı silinecek.'
                    : 'Ürün, bir sonraki en yüksek teklifi veren alıcıya devredilecek ve o alıcı için yeni bir ödeme kaydı oluşturulacak. Mevcut alıcının ödeme kaydı silinecek.'}
                </p>
                <label className="flex items-center gap-2 mb-5 cursor-pointer select-none">
                  <input type="checkbox" checked={saleBanBuyer} onChange={e => setSaleBanBuyer(e.target.checked)} className="h-4 w-4 rounded border-border accent-[#d4af37]" />
                  <span className="text-sm">Ödemeyen alıcıyı da engelle</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={submitSaleAction}
                    disabled={saleBusy}
                    className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${saleAction.action === 'cancel' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-[#d4af37] text-black hover:bg-[#c4a030]'}`}
                  >
                    {saleBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {saleAction.action === 'cancel' ? 'Satışı İptal Et' : 'Devret'}
                  </button>
                  <button onClick={() => setSaleAction(null)} disabled={saleBusy} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50">
                    Vazgeç
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
