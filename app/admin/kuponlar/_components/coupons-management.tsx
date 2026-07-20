'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Ticket, Trash2, ToggleLeft, ToggleRight, Copy, Percent, DollarSign, X, Calendar, Users, ShoppingCart } from 'lucide-react';
import { formatDate, formatPrice } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface CouponData {
  id: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minPurchase: number | null;
  maxDiscount: number | null;
  maxUsage: number | null;
  usedCount: number;
  perUserLimit: number;
  assignedUserId: string | null;
  assignedUser: { id: string; fullName: string; email: string; memberNumber: number | null } | null;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { usages: number };
}

export function CouponsManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [coupons, setCoupons] = useState<CouponData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '', description: '', discountType: 'PERCENTAGE', discountValue: '',
    minPurchase: '', maxDiscount: '', maxUsage: '', perUserLimit: '1', validUntil: '',
    assignedUserId: '',
  });
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<{id:string;fullName:string;email:string;memberNumber:number|null}[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{id:string;fullName:string;email:string;memberNumber:number|null}|null>(null);
  const [saving, setSaving] = useState(false);

  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated' && user?.role !== 'ADMIN') { router.replace('/panel'); return; }
    if (status === 'authenticated') fetchCoupons();
  }, [status, router, user?.role]);

  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/admin/coupons');
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch { toast.error('Kuponlar yüklenemedi'); }
    finally { setLoading(false); }
  };

  const searchUsers = async (q: string) => {
    if (q.length < 2) { setUserResults([]); return; }
    setUserSearching(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}&limit=5`);
      const d = await res.json();
      setUserResults((d.users || []).map((u:any) => ({ id: u.id, fullName: u.fullName, email: u.email, memberNumber: u.memberNumber })));
    } catch { setUserResults([]); }
    finally { setUserSearching(false); }
  };

  const handleCreate = async () => {
    if (!form.code || !form.discountValue) {
      toast.error('Kupon kodu ve indirim değeri gerekli');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, assignedUserId: selectedUser?.id || '' };
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success('Kupon oluşturuldu');
      setShowForm(false);
      setForm({ code: '', description: '', discountType: 'PERCENTAGE', discountValue: '', minPurchase: '', maxDiscount: '', maxUsage: '', perUserLimit: '1', validUntil: '', assignedUserId: '' });
      setSelectedUser(null);
      setUserSearch('');
      fetchCoupons();
    } catch { toast.error('Hata oluştu'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (coupon: CouponData) => {
    try {
      await fetch('/api/admin/coupons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: coupon.id, isActive: !coupon.isActive }),
      });
      toast.success(coupon.isActive ? 'Kupon devre dışı bırakıldı' : 'Kupon aktif edildi');
      fetchCoupons();
    } catch { toast.error('Hata'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kuponu silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE' });
      toast.success('Kupon silindi');
      fetchCoupons();
    } catch { toast.error('Hata'); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Kupon kodu kopyalandı');
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-[#d4af37] border-t-transparent rounded-full" /></div>;
  }

  return (
    <main className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Ticket className="h-6 w-6 text-[#d4af37]" />
          <h1 className="text-xl font-bold">Kupon Yönetimi</h1>
          <button onClick={() => setShowForm(true)} className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4af37] text-black font-semibold text-sm hover:bg-[#c5a028] transition-colors">
            <Plus className="h-4 w-4" /> Yeni Kupon
          </button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
              <div className="rounded-xl border border-[#d4af37]/30 bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Yeni Kupon Oluştur</h2>
                  <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Kupon Kodu *</label>
                    <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="HOSGELDIN10" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Açıklama</label>
                    <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="İlk alışverişe özel" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">İndirim Türü</label>
                    <div className="flex gap-2">
                      <button onClick={() => setForm({ ...form, discountType: 'PERCENTAGE' })} className={`flex-1 py-2 rounded-lg text-sm font-medium border ${form.discountType === 'PERCENTAGE' ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37]' : 'border-border'}`}>
                        <Percent className="h-4 w-4 inline mr-1" /> Yüzde
                      </button>
                      <button onClick={() => setForm({ ...form, discountType: 'FIXED' })} className={`flex-1 py-2 rounded-lg text-sm font-medium border ${form.discountType === 'FIXED' ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37]' : 'border-border'}`}>
                        <DollarSign className="h-4 w-4 inline mr-1" /> Sabit TL
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">İndirim Değeri * {form.discountType === 'PERCENTAGE' ? '(%)' : '(₺)'}</label>
                    <input type="number" value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} placeholder={form.discountType === 'PERCENTAGE' ? '10' : '50'} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Min. Alışveriş Tutarı (₺)</label>
                    <input type="number" value={form.minPurchase} onChange={e => setForm({ ...form, minPurchase: e.target.value })} placeholder="Örn: 500" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  </div>
                  {form.discountType === 'PERCENTAGE' && (
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Maks. İndirim Tutarı (₺)</label>
                      <input type="number" value={form.maxDiscount} onChange={e => setForm({ ...form, maxDiscount: e.target.value })} placeholder="Örn: 200" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Toplam Kullanım Limiti</label>
                    <input type="number" value={form.maxUsage} onChange={e => setForm({ ...form, maxUsage: e.target.value })} placeholder="Sınırsız için boş bırakın" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Kişi Başı Limit</label>
                    <input type="number" value={form.perUserLimit} onChange={e => setForm({ ...form, perUserLimit: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Geçerlilik Bitiş Tarihi</label>
                    <input type="datetime-local" value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  </div>
                </div>

                {/* Kullanıcıya özel atama */}
                <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
                  <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> Kullanıcıya Özel Kupon (opsiyonel)
                  </label>
                  {selectedUser ? (
                    <div className="flex items-center justify-between bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-lg px-3 py-2">
                      <div className="text-sm">
                        <span className="font-medium">{selectedUser.fullName}</span>
                        <span className="text-muted-foreground ml-2">{selectedUser.email}</span>
                        {selectedUser.memberNumber && <span className="ml-2 font-mono text-xs text-[#d4af37]">#{selectedUser.memberNumber}</span>}
                      </div>
                      <button onClick={() => { setSelectedUser(null); setUserSearch(''); }} className="p-1 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        value={userSearch}
                        onChange={e => { setUserSearch(e.target.value); searchUsers(e.target.value); }}
                        placeholder="Kullanıcı adı veya e-posta ile ara... (boş bırakırsan herkese açık)"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                      />
                      {userResults.length > 0 && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                          {userResults.map(u => (
                            <button key={u.id} onClick={() => { setSelectedUser(u); setUserResults([]); setUserSearch(''); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between">
                              <span>{u.fullName} <span className="text-muted-foreground">{u.email}</span></span>
                              {u.memberNumber && <span className="font-mono text-xs text-[#d4af37]">#{u.memberNumber}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <button onClick={handleCreate} disabled={saving} className="px-6 py-2 rounded-lg bg-[#d4af37] text-black font-semibold text-sm hover:bg-[#c5a028] disabled:opacity-50">
                    {saving ? 'Kaydediliyor...' : 'Kuponu Oluştur'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {coupons.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Ticket className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Henüz kupon oluşturulmamış</p>
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map(coupon => {
              const isExpired = coupon.validUntil && new Date(coupon.validUntil) < new Date();
              const isExhausted = coupon.maxUsage && coupon.usedCount >= coupon.maxUsage;
              return (
                <motion.div key={coupon.id} layout className={`rounded-xl border bg-card p-4 ${!coupon.isActive || isExpired || isExhausted ? 'opacity-60 border-border' : 'border-[#d4af37]/30'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button onClick={() => copyCode(coupon.code)} className="font-mono text-lg font-bold text-[#d4af37] hover:underline" title="Kopyala">
                          {coupon.code}
                        </button>
                        <Copy className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" onClick={() => copyCode(coupon.code)} />
                        {!coupon.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Pasif</span>}
                        {isExpired && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">Süresi Doldu</span>}
                        {isExhausted && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">Limit Doldu</span>}
                      </div>
                      {coupon.description && <p className="text-sm text-muted-foreground mb-2">{coupon.description}</p>}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {coupon.discountType === 'PERCENTAGE' ? <Percent className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
                          {coupon.discountType === 'PERCENTAGE' ? `%${coupon.discountValue}` : formatPrice(coupon.discountValue)} indirim
                        </span>
                        {coupon.minPurchase && <span><ShoppingCart className="h-3 w-3 inline" /> Min: {formatPrice(coupon.minPurchase)}</span>}
                        {coupon.maxDiscount && <span>Maks: {formatPrice(coupon.maxDiscount)}</span>}
                        <span><Users className="h-3 w-3 inline" /> {coupon.usedCount}{coupon.maxUsage ? `/${coupon.maxUsage}` : ''} kullanım</span>
                        {coupon.assignedUser && (
                          <span className="bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded">
                            Özel: {coupon.assignedUser.fullName} {coupon.assignedUser.memberNumber ? `#${coupon.assignedUser.memberNumber}` : ''}
                          </span>
                        )}
                        {coupon.validUntil && <span><Calendar className="h-3 w-3 inline" /> {formatDate(coupon.validUntil)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleActive(coupon)} className="p-2 rounded-lg hover:bg-muted transition-colors" title={coupon.isActive ? 'Devre dışı bırak' : 'Aktif et'}>
                        {coupon.isActive ? <ToggleRight className="h-5 w-5 text-green-400" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                      </button>
                      <button onClick={() => handleDelete(coupon.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-400" title="Sil">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
