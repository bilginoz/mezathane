'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Store, Search, Filter, CheckCircle, XCircle,
  Edit, Save, X, Loader2, Building2, Mail, Phone, MapPin,
  FileText, Gavel, Layers, BarChart3, Clock, Ban, UserCheck, Send,
  ChevronDown, AlertCircle, CreditCard, Wallet, TrendingUp, ArrowRight, BadgeCheck,
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface SellerData {
  id: string;
  userId: string;
  companyName: string;
  companyAddress: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  description: string | null;
  logoUrl: string | null;
  iban: string | null;
  taxDocumentUrl: string | null;
  taxDocumentPath: string | null;
  mersisNo: string | null;
  contactEmail: string | null;
  status: string;
  isVerified: boolean;
  commissionRate: number;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    phone: string | null;
    isActive: boolean;
    createdAt: string;
  };
  _stats: {
    auctionCount: number;
    lotCount: number;
    totalBids: number;
  };
  _finance?: {
    soldLotCount: number;
    totalSales: number;
    totalCommission: number;
    sellerPayout: number;
    collectedFromBuyers: number;
    pendingFromBuyers: number;
    pendingPayout: number;
  };
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Beklemede', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  APPROVED: { label: 'Onaylı', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  REJECTED: { label: 'Reddedildi', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
  SUSPENDED: { label: 'Askıya Alındı', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Ban },
  INFO_REQUESTED: { label: 'Düzeltme Bekleniyor', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: AlertCircle },
};

export function SellersManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [sellers, setSellers] = useState<SellerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingSeller, setEditingSeller] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [expandedSeller, setExpandedSeller] = useState<string | null>(null);
  const [infoRequestNote, setInfoRequestNote] = useState('');
  const [showInfoRequestModal, setShowInfoRequestModal] = useState<string | null>(null);
  const [sendingInfoRequest, setSendingInfoRequest] = useState(false);

  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated' && user?.role !== 'ADMIN') { router.replace('/panel'); return; }
  }, [status, router, user?.role]);

  const fetchSellers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      const res = await fetch(`/api/admin/sellers?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSellers(data.sellers ?? []);
    } catch {
      toast.error('Satıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    if (status === 'authenticated' && user?.role === 'ADMIN') {
      setLoading(true);
      fetchSellers();
    }
  }, [status, user?.role, fetchSellers]);

  const handleStatusChange = async (sellerId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Satıcı durumu güncellendi: ${STATUS_MAP[newStatus]?.label}`);
      fetchSellers();
    } catch {
      toast.error('Durum güncellenemedi');
    }
  };

  const startEdit = (seller: SellerData) => {
    setEditingSeller(seller.id);
    setEditForm({
      companyName: seller.companyName,
      companyAddress: seller.companyAddress ?? '',
      taxOffice: seller.taxOffice ?? '',
      taxNumber: seller.taxNumber ?? '',
      description: seller.description ?? '',
      commissionRate: seller.commissionRate,
    });
  };

  const cancelEdit = () => {
    setEditingSeller(null);
    setEditForm({});
  };

  const toggleVerified = async (seller: SellerData) => {
    try {
      const res = await fetch(`/api/admin/sellers/${seller.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: !seller.isVerified }),
      });
      if (!res.ok) throw new Error();
      toast.success(seller.isVerified ? 'Doğrulama kaldırıldı' : 'Satıcı doğrulandı ✅');
      fetchSellers();
    } catch {
      toast.error('İşlem başarısız');
    }
  };

  const saveEdit = async (sellerId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error();
      toast.success('Satıcı bilgileri güncellendi');
      setEditingSeller(null);
      fetchSellers();
    } catch {
      toast.error('Güncelleme hatası');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="h-12 bg-muted rounded-xl" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-28 bg-muted rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  const handleInfoRequest = async (sellerId: string) => {
    if (!infoRequestNote.trim()) { toast.error('Lütfen bir not yazın'); return; }
    setSendingInfoRequest(true);
    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}/info-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: infoRequestNote.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success('Düzeltme isteği gönderildi');
      setShowInfoRequestModal(null);
      setInfoRequestNote('');
      fetchSellers();
    } catch {
      toast.error('İstek gönderilemedi');
    } finally {
      setSendingInfoRequest(false);
    }
  };

  const handleViewDocument = async (filePath: string) => {
    try {
      if (!filePath) { toast.error('Evrak yolu bulunamadı'); return; }
      const res = await fetch('/api/admin/file-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_storage_path: filePath, contentType: 'application/pdf' }),
      });
      if (!res.ok) { toast.error('Evrak yüklenemedi'); return; }
      const { url } = await res.json();
      window.open(url, '_blank');
    } catch { toast.error('Evrak açılırken hata oluştu'); }
  };

  const statusCounts: Record<string, number> = {
    ALL: sellers.length,
    PENDING: sellers.filter(s => s.status === 'PENDING').length,
    APPROVED: sellers.filter(s => s.status === 'APPROVED').length,
    REJECTED: sellers.filter(s => s.status === 'REJECTED').length,
    SUSPENDED: sellers.filter(s => s.status === 'SUSPENDED').length,
    INFO_REQUESTED: sellers.filter(s => s.status === 'INFO_REQUESTED').length,
  };

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1200px] px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Store className="h-6 w-6 text-[#d4af37]" />
            <h1 className="font-display text-2xl font-bold">Satıcı Yönetimi</h1>
            <span className="rounded-full bg-[#d4af37]/20 px-3 py-0.5 text-sm font-medium text-[#d4af37]">
              {sellers.length} satıcı
            </span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Satıcı adı, e-posta veya firma adı ile ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
            />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['ALL', 'PENDING', 'INFO_REQUESTED', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const).map((s) => {
            const isAll = s === 'ALL';
            const info = isAll ? null : STATUS_MAP[s];
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-[#d4af37] text-black'
                    : 'border border-border bg-card hover:bg-muted'
                }`}
              >
                {isAll ? 'Tümü' : info?.label} ({statusCounts[s]})
              </button>
            );
          })}
        </div>

        {/* Sellers List */}
        <div className="space-y-4">
          {sellers.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Bu kriterlere uygun satıcı bulunamadı</p>
            </div>
          ) : (
            sellers.map((seller, idx) => {
              const isExpanded = expandedSeller === seller.id;
              const isEditing = editingSeller === seller.id;
              const statusInfo = STATUS_MAP[seller.status] ?? STATUS_MAP.PENDING;
              const StatusIcon = statusInfo.icon;

              return (
                <motion.div
                  key={seller.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  {/* Seller Card Header */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedSeller(isExpanded ? null : seller.id)}
                  >
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-[#d4af37]/10">
                      <Building2 className="h-6 w-6 text-[#d4af37]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{seller.companyName}</h3>
                        {seller.isVerified && <span className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-2 py-0.5 text-[11px] font-medium text-[#d4af37]"><BadgeCheck className="h-3 w-3" /> Doğrulanmış</span>}
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {seller.user.fullName} • {seller.user.email}
                      </p>
                    </div>
                    <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="text-center">
                        <p className="font-mono font-bold text-foreground">{seller._stats.auctionCount}</p>
                        <p className="text-[11px]">Müzayede</p>
                      </div>
                      <div className="text-center">
                        <p className="font-mono font-bold text-foreground">{seller._stats.lotCount}</p>
                        <p className="text-[11px]">Lot</p>
                      </div>
                      <div className="text-center">
                        <p className="font-mono font-bold text-foreground">%{seller.commissionRate}</p>
                        <p className="text-[11px]">Komisyon</p>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border p-4 space-y-4">
                          {/* Stats on mobile */}
                          <div className="grid grid-cols-3 gap-3 md:hidden">
                            <div className="rounded-lg bg-muted/50 p-3 text-center">
                              <p className="font-mono font-bold">{seller._stats.auctionCount}</p>
                              <p className="text-[11px] text-muted-foreground">Müzayede</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3 text-center">
                              <p className="font-mono font-bold">{seller._stats.lotCount}</p>
                              <p className="text-[11px] text-muted-foreground">Lot</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3 text-center">
                              <p className="font-mono font-bold">%{seller.commissionRate}</p>
                              <p className="text-[11px] text-muted-foreground">Komisyon</p>
                            </div>
                          </div>

                          {isEditing ? (
                            /* Edit Form */
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Firma Adı</label>
                                  <input
                                    type="text"
                                    value={editForm.companyName}
                                    onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Komisyon Oranı (%)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={editForm.commissionRate}
                                    onChange={(e) => setEditForm({ ...editForm, commissionRate: parseFloat(e.target.value) || 0 })}
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Firma Adresi</label>
                                  <input
                                    type="text"
                                    value={editForm.companyAddress}
                                    onChange={(e) => setEditForm({ ...editForm, companyAddress: e.target.value })}
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Vergi Dairesi</label>
                                  <input
                                    type="text"
                                    value={editForm.taxOffice}
                                    onChange={(e) => setEditForm({ ...editForm, taxOffice: e.target.value })}
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Vergi Numarası</label>
                                  <input
                                    type="text"
                                    value={editForm.taxNumber}
                                    onChange={(e) => setEditForm({ ...editForm, taxNumber: e.target.value })}
                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Açıklama</label>
                                <textarea
                                  rows={3}
                                  value={editForm.description}
                                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 resize-none"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={cancelEdit}
                                  className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-1.5"
                                >
                                  <X className="h-4 w-4" /> İptal
                                </button>
                                <button
                                  onClick={() => saveEdit(seller.id)}
                                  disabled={saving}
                                  className="rounded-lg bg-[#d4af37] text-black px-4 py-2 text-sm font-medium hover:bg-[#c4a030] transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                  Kaydet
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Detail View */
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                  <div className="flex items-start gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Firma Adı</p>
                                      <p className="text-sm font-medium">{seller.companyName}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">E-posta</p>
                                      <p className="text-sm">{seller.user.email}</p>
                                    </div>
                                  </div>
                                  {seller.user.phone && (
                                    <div className="flex items-start gap-2">
                                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Telefon</p>
                                        <p className="text-sm">{seller.user.phone}</p>
                                      </div>
                                    </div>
                                  )}
                                  {seller.companyAddress && (
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Adres</p>
                                        <p className="text-sm">{seller.companyAddress}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-3">
                                  {seller.contactEmail && (
                                    <div className="flex items-start gap-2">
                                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Firma E-posta</p>
                                        <p className="text-sm">{seller.contactEmail}</p>
                                      </div>
                                    </div>
                                  )}
                                  {seller.taxOffice && (
                                    <div className="flex items-start gap-2">
                                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Vergi Dairesi</p>
                                        <p className="text-sm">{seller.taxOffice}</p>
                                      </div>
                                    </div>
                                  )}
                                  {seller.taxNumber && (
                                    <div className="flex items-start gap-2">
                                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Vergi No</p>
                                        <p className="text-sm">{seller.taxNumber}</p>
                                      </div>
                                    </div>
                                  )}
                                  {seller.iban && (
                                    <div className="flex items-start gap-2">
                                      <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">IBAN</p>
                                        <p className="text-sm font-mono">{seller.iban}</p>
                                      </div>
                                    </div>
                                  )}
                                  {seller.mersisNo && (
                                    <div className="flex items-start gap-2">
                                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Mersis No</p>
                                        <p className="text-sm font-mono">{seller.mersisNo}</p>
                                      </div>
                                    </div>
                                  )}
                                  {(seller.taxDocumentPath || seller.taxDocumentUrl) && (
                                    <div className="flex items-start gap-2">
                                      <FileText className="h-4 w-4 text-[#d4af37] mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Vergi Levhası</p>
                                        <button
                                          type="button"
                                          className="text-sm text-[#d4af37] hover:underline cursor-pointer"
                                          onClick={async () => {
                                            try {
                                              const path = seller.taxDocumentPath;
                                              if (!path) { toast.error('Evrak yolu bulunamadı'); return; }
                                              const res = await fetch('/api/admin/file-download', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ cloud_storage_path: path, contentType: 'application/pdf' }),
                                              });
                                              if (!res.ok) { toast.error('Evrak yüklenemedi'); return; }
                                              const { url } = await res.json();
                                              window.open(url, '_blank');
                                            } catch { toast.error('Evrak açılırken hata oluştu'); }
                                          }}
                                        >
                                          Görüntüle / İndir
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  {seller.description && (
                                    <div className="flex items-start gap-2">
                                      <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Açıklama</p>
                                        <p className="text-sm">{seller.description}</p>
                                      </div>
                                    </div>
                                  )}
                                  <div className="flex items-start gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <div>
                                      <p className="text-xs text-muted-foreground">Kayıt Tarihi</p>
                                      <p className="text-sm">{formatDate(seller.createdAt)}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Cari / Finans Özeti */}
                              {seller._finance && seller._finance.soldLotCount > 0 && (
                                <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <Wallet className="h-4 w-4 text-[#d4af37]" />
                                      <p className="text-sm font-semibold">Cari Hesap Özeti</p>
                                    </div>
                                    <span className="text-[11px] text-muted-foreground">{seller._finance.soldLotCount} satılan lot</span>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    <div className="rounded-lg bg-card p-3">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                                        <p className="text-[11px] text-muted-foreground">Toplam Satış</p>
                                      </div>
                                      <p className="font-mono font-bold text-sm">{formatPrice(seller._finance.totalSales)}</p>
                                    </div>
                                    <div className="rounded-lg bg-card p-3">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <CreditCard className="h-3.5 w-3.5 text-[#d4af37]" />
                                        <p className="text-[11px] text-muted-foreground">Komisyon (KDV dahil)</p>
                                      </div>
                                      <p className="font-mono font-bold text-sm text-[#d4af37]">{formatPrice(seller._finance.totalCommission)}</p>
                                    </div>
                                    <div className="rounded-lg bg-card p-3">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                                        <p className="text-[11px] text-muted-foreground">Alıcıdan Tahsil</p>
                                      </div>
                                      <p className="font-mono font-bold text-sm text-green-400">{formatPrice(seller._finance.collectedFromBuyers)}</p>
                                    </div>
                                    <div className="rounded-lg bg-card p-3">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <Clock className="h-3.5 w-3.5 text-red-400" />
                                        <p className="text-[11px] text-muted-foreground">Alıcıdan Beklenen</p>
                                      </div>
                                      <p className="font-mono font-bold text-sm text-red-400">{formatPrice(seller._finance.pendingFromBuyers)}</p>
                                    </div>
                                    <div className="rounded-lg bg-card p-3 col-span-2 md:col-span-1">
                                      <div className="flex items-center gap-1.5 mb-1">
                                        <Wallet className="h-3.5 w-3.5 text-amber-400" />
                                        <p className="text-[11px] text-muted-foreground">Satıcıya Ödenecek</p>
                                      </div>
                                      <p className="font-mono font-bold text-sm text-amber-400">{formatPrice(seller._finance.pendingPayout)}</p>
                                    </div>
                                  </div>
                                  <Link
                                    href={`/admin/finans?seller=${seller.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#d4af37] text-black px-3 py-2 text-xs font-medium hover:bg-[#c4a030] transition-colors"
                                  >
                                    Finans Detayına Git <ArrowRight className="h-3.5 w-3.5" />
                                  </Link>
                                </div>
                              )}

                              {/* Admin Note / Seller Response (INFO_REQUESTED flow) */}
                              {(seller as any).adminNote && (
                                <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
                                  <p className="text-xs font-semibold text-blue-400 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> Admin Notu ({(seller as any).adminNoteDate ? new Date((seller as any).adminNoteDate).toLocaleDateString('tr-TR') : ''})</p>
                                  <p className="text-sm text-muted-foreground">{(seller as any).adminNote}</p>
                                  {(seller as any).sellerResponse && (
                                    <div className="mt-2 rounded-lg border border-green-500/30 bg-green-500/5 p-2">
                                      <p className="text-xs font-semibold text-green-400">Satıcı Yanıtı ({(seller as any).sellerResponseDate ? new Date((seller as any).sellerResponseDate).toLocaleDateString('tr-TR') : ''})</p>
                                      <p className="text-sm text-muted-foreground">{(seller as any).sellerResponse}</p>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Ek Belgeler */}
                              {(seller as any).additionalDocs && (seller as any).additionalDocs.length > 0 && (
                                <div className="rounded-lg border border-border p-3">
                                  <p className="text-xs font-semibold text-[#d4af37] mb-2 flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Ek Belgeler</p>
                                  <div className="space-y-1.5">
                                    {(seller as any).additionalDocs.map((doc: any) => (
                                      <div key={doc.id} className="flex items-center justify-between rounded border border-border/50 px-2.5 py-1.5">
                                        <div className="flex items-center gap-2">
                                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                          <span className="text-sm">{doc.label}</span>
                                          {doc.fileName && <span className="text-[10px] text-muted-foreground">({doc.fileName})</span>}
                                        </div>
                                        {doc.filePath && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handleViewDocument(doc.filePath); }}
                                            className="text-xs text-[#d4af37] hover:underline"
                                          >
                                            Görüntüle
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                                <button
                                  onClick={(e) => { e.stopPropagation(); startEdit(seller); }}
                                  className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-1.5"
                                >
                                  <Edit className="h-3.5 w-3.5" /> Düzenle
                                </button>
                                {seller.status === 'APPROVED' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleVerified(seller); }}
                                    className={`rounded-lg px-3 py-2 text-sm transition-colors flex items-center gap-1.5 ${
                                      seller.isVerified
                                        ? 'border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] hover:bg-[#d4af37]/20'
                                        : 'border border-border hover:bg-muted'
                                    }`}
                                  >
                                    <BadgeCheck className="h-3.5 w-3.5" /> {seller.isVerified ? 'Doğrulanmış ✅' : 'Doğrula'}
                                  </button>
                                )}
                                {seller.status !== 'APPROVED' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(seller.id, 'APPROVED'); }}
                                    className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 transition-colors flex items-center gap-1.5"
                                  >
                                    <UserCheck className="h-3.5 w-3.5" /> Onayla
                                  </button>
                                )}
                                {(seller.status === 'PENDING' || seller.status === 'INFO_REQUESTED') && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setInfoRequestNote(''); setShowInfoRequestModal(seller.id); }}
                                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 transition-colors flex items-center gap-1.5"
                                  >
                                    <AlertCircle className="h-3.5 w-3.5" /> Eksik Bilgi / Düzeltme İste
                                  </button>
                                )}
                                {seller.status !== 'REJECTED' && seller.status !== 'SUSPENDED' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(seller.id, 'REJECTED'); }}
                                    className="rounded-lg bg-red-600/80 px-3 py-2 text-sm text-white hover:bg-red-700 transition-colors flex items-center gap-1.5"
                                  >
                                    <XCircle className="h-3.5 w-3.5" /> Reddet
                                  </button>
                                )}
                                {seller.status === 'APPROVED' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(seller.id, 'SUSPENDED'); }}
                                    className="rounded-lg bg-orange-600/80 px-3 py-2 text-sm text-white hover:bg-orange-700 transition-colors flex items-center gap-1.5"
                                  >
                                    <Ban className="h-3.5 w-3.5" /> Askıya Al
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Eksik Bilgi / Düzeltme İste Modal */}
      {showInfoRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowInfoRequestModal(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2"><AlertCircle className="h-5 w-5 text-blue-400" /> Eksik Bilgi / Düzeltme İste</h3>
              <button onClick={() => setShowInfoRequestModal(null)} className="rounded-lg p-1 hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Satıcıya gönderilecek notu yazın. Bu not satıcıya platform bildirimi ve e-posta ile iletilecektir.
              </p>
              <textarea
                value={infoRequestNote}
                onChange={e => setInfoRequestNote(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                placeholder="Örn: Vergi levhanız okunmuyor, lütfen tekrar yükleyin..."
              />
              <div className="flex gap-3">
                <button onClick={() => setShowInfoRequestModal(null)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">İptal</button>
                <button
                  onClick={() => handleInfoRequest(showInfoRequestModal)}
                  disabled={sendingInfoRequest || !infoRequestNote.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {sendingInfoRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Gönder
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
