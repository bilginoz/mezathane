'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';
import { Download, Database, Users, Gavel, Layers, Receipt, AlertTriangle, CheckSquare, Square, Loader2, ArrowLeft, Wallet, Shield } from 'lucide-react';

const EXPORT_TYPES = [
  { key: 'users', label: 'Kullanıcılar', icon: Users, desc: 'Tüm kullanıcı bilgileri (ad, e-posta, rol, tarih)' },
  { key: 'auctions', label: 'Müzayedeler', icon: Gavel, desc: 'Tüm müzayede bilgileri (başlık, durum, tarihler)' },
  { key: 'lots', label: 'Lotlar', icon: Layers, desc: 'Tüm lot bilgileri (fiyat, durum, teklif sayısı)' },
  { key: 'sales', label: 'Satışlar', icon: Receipt, desc: 'Ödeme ve satış verileri (tutar, komisyon, durum)' },
  { key: 'disputes', label: 'Anlaşmazlıklar', icon: AlertTriangle, desc: 'Tüm şikayet ve anlaşmazlık kayıtları' },
  { key: 'finance', label: 'Finans Detay', icon: Wallet, desc: 'Komisyon, KDV, hak ediş ve ödeme detayları' },
  { key: 'audit', label: 'Denetim Kayıtları', icon: Shield, desc: 'Admin işlem geçmişi ve değişiklik logları' },
];

export function DataManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [exporting, setExporting] = useState<string | null>(null);

  // Toplu İşlem
  const [bulkType, setBulkType] = useState<string>('auctions');
  const [bulkItems, setBulkItems] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkAction, setBulkAction] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/giris');
    if (status === 'authenticated' && (session?.user as any)?.role !== 'ADMIN') router.push('/panel');
  }, [status, session, router]);

  const handleExport = async (type: string) => {
    setExporting(type);
    try {
      const res = await fetch(`/api/admin/export?type=${type}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Dosya indirildi');
    } catch {
      toast.error('İndirme başarısız');
    } finally {
      setExporting(null);
    }
  };

  const fetchBulkItems = useCallback(async () => {
    setBulkLoading(true);
    try {
      let url = '';
      if (bulkType === 'auctions') url = '/api/auctions?limit=100';
      else if (bulkType === 'lots') url = '/api/lots?limit=100';
      else if (bulkType === 'users') url = '/api/admin/users?limit=100';

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBulkItems(Array.isArray(data) ? data : data.auctions ?? data.lots ?? data.users ?? []);
      }
    } catch {} finally {
      setBulkLoading(false);
      setSelectedIds([]);
    }
  }, [bulkType]);

  useEffect(() => {
    if (status === 'authenticated') fetchBulkItems();
  }, [status, fetchBulkItems]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === bulkItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(bulkItems.map(i => i.id));
    }
  };

  const handleBulkAction = async () => {
    if (!selectedIds.length || !bulkAction) {
      toast.error('Lütfen öğe ve işlem seçin');
      return;
    }
    try {
      let actionType = '';
      let data: any = {};

      if (bulkType === 'users') {
        actionType = 'toggleActive';
        data = { isActive: bulkAction === 'activate' };
      } else {
        actionType = 'updateStatus';
        data = { status: bulkAction };
      }

      const res = await fetch('/api/admin/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: bulkType, ids: selectedIds, action: actionType, data }),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(`${result.updated} öğe güncellendi`);
        fetchBulkItems();
        setSelectedIds([]);
        setBulkAction('');
      } else {
        toast.error('Toplu işlem başarısız');
      }
    } catch {
      toast.error('Hata oluştu');
    }
  };

  const bulkActionOptions = bulkType === 'auctions'
    ? [{ value: 'ACTIVE', label: 'Aktif Yap' }, { value: 'CANCELLED', label: 'İptal Et' }, { value: 'DRAFT', label: 'Taslak Yap' }]
    : bulkType === 'lots'
    ? [{ value: 'ACTIVE', label: 'Aktif Yap' }, { value: 'CANCELLED', label: 'İptal Et' }]
    : [{ value: 'activate', label: 'Aktif Yap' }, { value: 'deactivate', label: 'Pasif Yap' }];

  return (
    <main className="flex-1 py-8">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></Link>
          <Database className="h-6 w-6 text-[#d4af37]" />
          <h1 className="font-display text-2xl font-bold">Veri Yönetimi</h1>
        </div>

        {/* Veri Dışa Aktarma */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Download className="h-5 w-5 text-[#d4af37]" />
            <h2 className="font-semibold text-lg">Veri Dışa Aktarma (CSV)</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {EXPORT_TYPES.map((et) => (
              <motion.button
                key={et.key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleExport(et.key)}
                disabled={exporting !== null}
                className="bg-muted/50 border border-border rounded-xl p-4 text-left hover:border-[#d4af37]/30 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <et.icon className="h-5 w-5 text-[#d4af37] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{et.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{et.desc}</p>
                  </div>
                  {exporting === et.key ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" />
                  ) : (
                    <Download className="h-4 w-4 text-muted-foreground group-hover:text-[#d4af37] transition-colors" />
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Toplu İşlemler */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare className="h-5 w-5 text-[#d4af37]" />
            <h2 className="font-semibold text-lg">Toplu İşlemler</h2>
          </div>

          {/* Tip Seçimi */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[{ key: 'auctions', label: 'Müzayedeler' }, { key: 'lots', label: 'Lotlar' }, { key: 'users', label: 'Kullanıcılar' }].map(t => (
              <button
                key={t.key}
                onClick={() => setBulkType(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  bulkType === t.key ? 'bg-[#d4af37] text-black' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* İşlem Çubuğu */}
          {selectedIds.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-3 mb-4 p-3 bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-lg">
              <span className="text-sm text-[#d4af37] font-medium">
                {selectedIds.length} öğe seçili
              </span>
              <div className="flex gap-2 flex-1">
                <select
                  value={bulkAction}
                  onChange={e => setBulkAction(e.target.value)}
                  className="bg-black/50 border border-white/20 rounded-lg px-3 py-1.5 text-sm text-white flex-1 sm:flex-none"
                >
                  <option value="">İşlem seçin...</option>
                  {bulkActionOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                  className="px-4 py-1.5 rounded-lg bg-[#d4af37] text-black text-sm font-medium hover:bg-[#c4a030] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Uygula
                </button>
              </div>
            </div>
          )}

          {/* Liste */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 p-3 bg-muted/50 border-b border-border">
              <button onClick={toggleAll} className="text-muted-foreground hover:text-[#d4af37]">
                {selectedIds.length === bulkItems.length && bulkItems.length > 0
                  ? <CheckSquare className="h-4 w-4 text-[#d4af37]" />
                  : <Square className="h-4 w-4" />}
              </button>
              <span className="text-xs text-muted-foreground font-medium">
                {bulkType === 'auctions' ? 'Müzayede' : bulkType === 'lots' ? 'Lot' : 'Kullanıcı'}
              </span>
              <span className="text-xs text-muted-foreground font-medium ml-auto">Durum</span>
            </div>

            {bulkLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#d4af37]" /></div>
            ) : bulkItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Veri bulunamadı</div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
                {bulkItems.map((item: any) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors ${
                      selectedIds.includes(item.id) ? 'bg-[#d4af37]/5' : ''
                    }`}
                    onClick={() => toggleSelect(item.id)}
                  >
                    {selectedIds.includes(item.id)
                      ? <CheckSquare className="h-4 w-4 text-[#d4af37] flex-shrink-0" />
                      : <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.title ?? item.fullName ?? item.name ?? 'Bilinmiyor'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.email ?? (item.seller?.user?.fullName ? `Satıcı: ${item.seller.user.fullName}` : '')}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      (item.status === 'ACTIVE' || item.isActive === true) ? 'bg-green-500/20 text-green-400'
                      : (item.status === 'DRAFT' || item.isActive === false) ? 'bg-gray-500/20 text-gray-400'
                      : item.status === 'LIVE' ? 'bg-red-500/20 text-red-400'
                      : item.status === 'COMPLETED' ? 'bg-blue-500/20 text-blue-400'
                      : item.status === 'CANCELLED' ? 'bg-orange-500/20 text-orange-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {item.status ?? (item.isActive ? 'Aktif' : 'Pasif')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
