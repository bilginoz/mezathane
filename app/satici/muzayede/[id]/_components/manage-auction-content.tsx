'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { formatPrice, formatDate, formatDateTime } from '@/lib/utils';
import {
  ArrowLeft, Package, Gavel, Eye, Heart, Plus, Edit, Trash2,
  Calendar, Clock, ChevronRight, ImageIcon, Save, X, Loader2, Upload,
  FileDown, UploadCloud, RotateCcw, CheckSquare, Square,
} from 'lucide-react';

interface LotImage {
  id: string;
  imageUrl: string;
}

interface LotData {
  id: string;
  lotNumber: number;
  title: string;
  description: string | null;
  notes: string | null;
  startingPrice: number;
  currentPrice: number;
  estimatedPrice: number | null;
  customBidIncrement: number | null;
  shippingType?: string | null;
  estimatedShipping?: number | null;
  kdvRate?: number | null;
  status: string;
  images: LotImage[];
  category: { id: string; name: string } | null;
  lotCategories?: { categoryId: string; category: { id: string; name: string } }[];
  _count: { bids: number; watchlist: number };
}

interface AuctionData {
  id: string;
  title: string;
  description: string | null;
  bannerUrl: string | null;
  status: string;
  startDate: string;
  liveStartDate: string | null;
  liveOnly: boolean;
  liveDelayMinutes: number;
  waitingTime: number;
  fairWaitingTime: number;
  commissionRate: number;
  paymentDays: number;
  viewCount: number;
  lots: LotData[];
  _count: { lots: number };
}

interface CategoryData {
  id: string;
  name: string;
  slug: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Taslak', color: 'bg-gray-500/20 text-gray-400' },
  SCHEDULED: { label: 'Planlandı', color: 'bg-blue-500/20 text-blue-400' },
  ACTIVE: { label: 'Aktif', color: 'bg-green-500/20 text-green-400' },
  LIVE: { label: 'Canlı', color: 'bg-red-500/20 text-red-400' },
  COMPLETED: { label: 'Tamamlandı', color: 'bg-amber-500/20 text-amber-400' },
  CANCELLED: { label: 'İptal', color: 'bg-red-500/20 text-red-400' },
};

const LOT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Beklemede', color: 'bg-yellow-500/20 text-yellow-400' },
  ACTIVE: { label: 'Aktif', color: 'bg-green-500/20 text-green-400' },
  SOLD: { label: 'Satıldı', color: 'bg-blue-500/20 text-blue-400' },
  UNSOLD: { label: 'Satılmadı', color: 'bg-gray-500/20 text-gray-400' },
  CANCELLED: { label: 'İptal', color: 'bg-red-500/20 text-red-400' },
};

export default function ManageAuctionContent() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession() || {};
  const [auction, setAuction] = useState<AuctionData | null>(null);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddLot, setShowAddLot] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [editingLotId, setEditingLotId] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editingAuction, setEditingAuction] = useState(false);
  const [auctionForm, setAuctionForm] = useState({
    title: '', description: '', startDate: '', liveStartDate: '', liveOnly: false,
    liveDelayMinutes: '15', waitingTime: '30', fairWaitingTime: '10', paymentDays: '3',
  });
  const [auctionSaving, setAuctionSaving] = useState(false);
  const [selectedLotIds, setSelectedLotIds] = useState<Set<string>>(new Set());
  const [transferring, setTransferring] = useState(false);

  // New lot form state
  const [newLot, setNewLot] = useState({
    title: '',
    description: '',
    notes: '',
    categoryIds: [] as string[],
    startingPrice: '',
    estimatedPrice: '',
    customBidIncrement: '',
    shippingType: 'BUYER_PAYS',
    estimatedShipping: '',
    kdvRate: '20',
  });
  const [lotImages, setLotImages] = useState<{ url: string; cloudStoragePath: string; uploading: boolean }[]>([]);
  const [imageUploading, setImageUploading] = useState(false);

  // Görseli sıkıştır (max 1920px, kalite %80, WebP/JPEG)
  const compressImage = (file: File, maxWidth = 1920, quality = 0.8): Promise<{ blob: Blob; type: string }> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve({ blob: file, type: file.type }); return; }
        ctx.drawImage(img, 0, 0, w, h);
        // WebP tercih et, desteklenmiyorsa JPEG
        canvas.toBlob(
          (blob) => {
            if (blob) resolve({ blob, type: 'image/webp' });
            else canvas.toBlob(
              (jpegBlob) => resolve({ blob: jpegBlob || file, type: 'image/jpeg' }),
              'image/jpeg', quality
            );
          },
          'image/webp', quality
        );
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve({ blob: file, type: file.type });
      img.src = URL.createObjectURL(file);
    });
  };

  const handleLotImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = 6 - lotImages.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) {
      toast.error('En fazla 6 görsel yükleyebilirsiniz');
      return;
    }
    setImageUploading(true);
    for (const file of toUpload) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} - Dosya 10MB'dan büyük`);
        continue;
      }
      try {
        // Görseli sıkıştır
        const { blob: compressed, type: compressedType } = await compressImage(file);
        const compressedExt = compressedType === 'image/webp' ? 'webp' : 'jpg';
        const fileName = `lots/${Date.now()}-${Math.random().toString(36).slice(2)}.${compressedExt}`;
        const presignRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName, contentType: compressedType, isPublic: true }),
        });
        const { uploadUrl, publicUrl, cloud_storage_path } = await presignRes.json();
        const headers: Record<string, string> = { 'Content-Type': compressedType };
        if (uploadUrl.includes('content-disposition')) headers['Content-Disposition'] = 'attachment';
        await fetch(uploadUrl, { method: 'PUT', headers, body: compressed });
        setLotImages(prev => [...prev, { url: publicUrl, cloudStoragePath: cloud_storage_path, uploading: false }]);
      } catch {
        toast.error(`${file.name} yüklenemedi`);
      }
    }
    setImageUploading(false);
  };

  const removeLotImage = (idx: number) => {
    setLotImages(prev => prev.filter((_, i) => i !== idx));
  };

  // Edit lot form state
  const [editLot, setEditLot] = useState({
    title: '',
    description: '',
    notes: '',
    categoryIds: [] as string[],
    startingPrice: '',
    estimatedPrice: '',
    customBidIncrement: '',
    shippingType: 'BUYER_PAYS',
    estimatedShipping: '',
    kdvRate: '20',
    imageUrl: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/giris');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated' && params?.id) {
      fetchAuction();
    }
  }, [status, params?.id]);

  const fetchAuction = async () => {
    try {
      const res = await fetch(`/api/seller/auctions/${params?.id}`);
      if (!res.ok) {
        if (res.status === 403) {
          router.replace('/satici-basvuru');
          return;
        }
        if (res.status === 404) {
          toast.error('Müzayede bulunamadı');
          router.replace('/satici');
          return;
        }
        throw new Error('Yüklenemedi');
      }
      const data = await res.json();
      setAuction(data.auction);
      setCategories(data.categories ?? []);
    } catch {
      toast.error('Müzayede bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const startEditLot = (lot: LotData) => {
    setEditingLotId(lot.id);
    setShowAddLot(false);
    setEditLot({
      title: lot.title,
      description: lot.description ?? '',
      notes: lot.notes ?? '',
      categoryIds: lot.lotCategories?.length ? lot.lotCategories.map((lc: any) => lc.categoryId) : (lot.category?.id ? [lot.category.id] : []),
      startingPrice: String(lot.startingPrice),
      estimatedPrice: lot.estimatedPrice ? String(lot.estimatedPrice) : '',
      customBidIncrement: lot.customBidIncrement ? String(lot.customBidIncrement) : '',
      shippingType: lot.shippingType === 'FREE_SELLER' ? 'FREE_SELLER' : 'BUYER_PAYS',
      estimatedShipping: lot.estimatedShipping != null ? String(lot.estimatedShipping) : '',
      kdvRate: lot.kdvRate != null ? String(lot.kdvRate) : '20',
      imageUrl: lot.images[0]?.imageUrl ?? '',
    });
  };

  const handleEditLot = async () => {
    if (!editingLotId || !editLot.title || !editLot.categoryIds.length || !editLot.startingPrice) {
      toast.error('Lot adı, en az bir kategori ve başlangıç fiyatı zorunludur');
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/lots/${editingLotId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editLot.title,
          description: editLot.description || null,
          notes: editLot.notes || null,
          categoryIds: editLot.categoryIds,
          startingPrice: editLot.startingPrice,
          estimatedPrice: editLot.estimatedPrice || null,
          customBidIncrement: editLot.customBidIncrement ? parseFloat(editLot.customBidIncrement) : null,
          shippingType: editLot.shippingType,
          estimatedShipping: editLot.estimatedShipping || null,
          kdvRate: parseFloat(editLot.kdvRate) || 20,
          imageUrl: editLot.imageUrl || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Güncelleme başarısız');
      }
      toast.success('Lot başarıyla güncellendi');
      setEditingLotId(null);
      fetchAuction();
    } catch (err: any) {
      toast.error(err.message || 'Lot güncellenirken hata oluştu');
    } finally {
      setEditSaving(false);
    }
  };

  const startEditAuction = () => {
    if (!auction) return;
    const toLocal = (d: string | null) => {
      if (!d) return '';
      const dt = new Date(d);
      return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0') + 'T' + String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
    };
    setAuctionForm({
      title: auction.title,
      description: auction.description ?? '',
      startDate: toLocal(auction.startDate),
      liveStartDate: toLocal(auction.liveStartDate),
      liveOnly: auction.liveOnly,
      liveDelayMinutes: String(auction.liveDelayMinutes),
      waitingTime: String(auction.waitingTime),
      fairWaitingTime: String(auction.fairWaitingTime),
      paymentDays: String(auction.paymentDays),
    });
    setEditingAuction(true);
  };

  const handleSaveAuction = async () => {
    if (!auctionForm.title.trim()) { toast.error('Müzayede adı zorunludur'); return; }
    setAuctionSaving(true);
    try {
      const payload: any = {
        title: auctionForm.title,
        description: auctionForm.description || null,
        liveOnly: auctionForm.liveOnly,
        liveDelayMinutes: parseInt(auctionForm.liveDelayMinutes) || 15,
        waitingTime: parseInt(auctionForm.waitingTime) || 30,
        fairWaitingTime: parseInt(auctionForm.fairWaitingTime) || 10,
        paymentDays: parseInt(auctionForm.paymentDays) || 3,
      };
      if (!auctionForm.liveOnly && auctionForm.startDate) payload.startDate = new Date(auctionForm.startDate).toISOString();
      if (auctionForm.liveStartDate) payload.liveStartDate = new Date(auctionForm.liveStartDate).toISOString();
      const res = await fetch(`/api/seller/auctions/${params?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d?.error ?? 'Güncelleme başarısız');
        return;
      }
      toast.success('Müzayede bilgileri güncellendi');
      setEditingAuction(false);
      fetchAuction();
    } catch { toast.error('Güncelleme başarısız'); } finally { setAuctionSaving(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/seller/auctions/${params?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Müzayede durumu güncellendi: ${STATUS_MAP[newStatus]?.label ?? newStatus}`);
      fetchAuction();
    } catch {
      toast.error('Durum güncellenemedi');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleAddLot = async () => {
    if (!newLot.title || !newLot.categoryIds.length || !newLot.startingPrice) {
      toast.error('Lot adı, en az bir kategori ve başlangıç fiyatı zorunludur');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/seller/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auctionId: auction?.id,
          title: newLot.title,
          description: newLot.description || null,
          notes: newLot.notes || null,
          categoryIds: newLot.categoryIds,
          startingPrice: parseFloat(newLot.startingPrice),
          estimatedPrice: newLot.estimatedPrice ? parseFloat(newLot.estimatedPrice) : null,
          customBidIncrement: newLot.customBidIncrement ? parseFloat(newLot.customBidIncrement) : null,
          shippingType: newLot.shippingType,
          estimatedShipping: newLot.estimatedShipping || null,
          kdvRate: parseFloat(newLot.kdvRate) || 20,
          images: lotImages.map(img => ({ imageUrl: img.url, cloudStoragePath: img.cloudStoragePath })),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Lot başarıyla eklendi');
      setShowAddLot(false);
      setNewLot({ title: '', description: '', notes: '', categoryIds: [], startingPrice: '', estimatedPrice: '', customBidIncrement: '', shippingType: 'BUYER_PAYS', estimatedShipping: '', kdvRate: '20' });
      setLotImages([]);
      fetchAuction();
    } catch {
      toast.error('Lot eklenirken hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-48 bg-muted rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}
          </div>
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!auction) return null;

  const statusInfo = STATUS_MAP[auction.status] ?? { label: auction.status, color: 'bg-muted text-muted-foreground' };
  const isCompleted = auction.status === 'COMPLETED';
  const unsoldLots = auction.lots.filter(l => l.status === 'UNSOLD' || l.status === 'PENDING');
  const allUnsoldSelected = unsoldLots.length > 0 && unsoldLots.every(l => selectedLotIds.has(l.id));

  const toggleLotSelection = (lotId: string) => {
    setSelectedLotIds(prev => {
      const next = new Set(prev);
      if (next.has(lotId)) next.delete(lotId);
      else next.add(lotId);
      return next;
    });
  };

  const toggleAllUnsold = () => {
    if (allUnsoldSelected) {
      setSelectedLotIds(new Set());
    } else {
      setSelectedLotIds(new Set(unsoldLots.map(l => l.id)));
    }
  };

  const handleTransferLots = async () => {
    if (selectedLotIds.size === 0) return;
    setTransferring(true);
    try {
      const res = await fetch('/api/seller/reauction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lotIds: Array.from(selectedLotIds), sourceAuctionId: auction.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.lotCount} lot yeni müzayedeye aktarıldı`);
      router.push(`/satici/muzayede/${data.auctionId}`);
    } catch (err: any) {
      toast.error(err.message || 'Aktarım başarısız');
    } finally {
      setTransferring(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <Link href="/satici" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Satıcı Paneline Dön
      </Link>

      {/* Auction Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/50 bg-card overflow-hidden mb-8"
      >
        {auction.bannerUrl && (
          <div className="relative aspect-[4/1] bg-muted">
            <Image src={auction.bannerUrl} alt={auction.title} fill className="object-cover" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{auction.title}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              {auction.description && (
                <p className="text-muted-foreground text-sm max-w-2xl">{auction.description}</p>
              )}
              {/* Status Change Buttons */}
              <div className="flex flex-wrap gap-2 mt-3">
                {auction.status === 'DRAFT' && (
                  <button
                    onClick={() => handleStatusChange('ACTIVE')}
                    disabled={changingStatus}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    {changingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                    Yayına Al
                  </button>
                )}
                {auction.status === 'ACTIVE' && (
                  <>
                    <button
                      onClick={() => handleStatusChange('LIVE')}
                      disabled={changingStatus}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700 transition-colors flex items-center gap-1 disabled:opacity-50 animate-pulse"
                    >
                      {changingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                      Canlıya Al
                    </button>
                    <button
                      onClick={() => handleStatusChange('DRAFT')}
                      disabled={changingStatus}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      {changingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                      Taslağa Çevir
                    </button>
                  </>
                )}
                {(auction.status === 'ACTIVE' || auction.status === 'DRAFT') && (
                  <button
                    onClick={() => handleStatusChange('CANCELLED')}
                    disabled={changingStatus}
                    className="rounded-lg bg-red-600/80 px-3 py-1.5 text-xs text-white hover:bg-red-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    {changingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                    İptal Et
                  </button>
                )}
              </div>
              {/* Proforma & Toplu Yükleme */}
              <div className="flex flex-wrap gap-2 mt-2">
                <button onClick={async () => {
                  toast.info('Proforma fatura oluşturuluyor...');
                  try {
                    const res = await fetch('/api/seller/proforma', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ auctionId: auction?.id }),
                    });
                    if (!res.ok) { const d = await res.json(); toast.error(d?.error ?? 'Hata'); return; }
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `proforma-${auction?.title?.slice(0, 20)}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('Proforma fatura indirildi');
                  } catch { toast.error('Proforma oluşturulamadı'); }
                }}
                  className="rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/5 px-3 py-1.5 text-xs text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors flex items-center gap-1">
                  <FileDown className="h-3 w-3" /> Proforma Fatura
                </button>
                {auction.status === 'DRAFT' && (
                  <Link href={`/satici/toplu-yukleme?auctionId=${auction?.id}`}
                    className="rounded-lg border border-blue-500/30 bg-blue-500/5 px-3 py-1.5 text-xs text-blue-400 hover:bg-blue-500/10 transition-colors flex items-center gap-1">
                    <UploadCloud className="h-3 w-3" /> Toplu Lot Yükle
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Package, label: 'Toplam Lot', value: auction.lots.length },
          { icon: Gavel, label: 'Toplam Teklif', value: auction.lots.reduce((s, l) => s + l._count.bids, 0) },
          { icon: Eye, label: 'Görüntülenme', value: auction.viewCount },
          { icon: Calendar, label: 'Başlangıç', value: formatDate(auction.startDate) },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border/50 bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Auction Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-border/50 bg-card p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" /> Müzayede Bilgileri
          </h2>
          {auction.status === 'DRAFT' && !editingAuction && (
            <button onClick={startEditAuction} className="text-xs px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors flex items-center gap-1">
              <Edit className="w-3 h-3" /> Düzenle
            </button>
          )}
          {auction.status !== 'DRAFT' && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">🔒 Yayında — düzenleme kilitli</span>
          )}
        </div>

        {editingAuction ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Müzayede Adı *</label>
              <input value={auctionForm.title} onChange={e => setAuctionForm(p => ({ ...p, title: e.target.value }))} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-amber-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Açıklama</label>
              <textarea value={auctionForm.description} onChange={e => setAuctionForm(p => ({ ...p, description: e.target.value }))} rows={3} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-amber-500 focus:outline-none" placeholder="Müzayede hakkında açıklama, komisyon bilgileri, özel koşullar vs." />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 flex items-center gap-2">
                  <input type="checkbox" checked={auctionForm.liveOnly} onChange={e => setAuctionForm(p => ({ ...p, liveOnly: e.target.checked }))} className="rounded" />
                  Sadece Canlı Müzayede
                </label>
              </div>
              {!auctionForm.liveOnly && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Ön Teklif Başlangıç</label>
                  <input type="datetime-local" value={auctionForm.startDate} onChange={e => setAuctionForm(p => ({ ...p, startDate: e.target.value }))} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-amber-500 focus:outline-none" />
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1 block">Canlı Müzayede Tarihi</label>
                <input type="datetime-local" value={auctionForm.liveStartDate} onChange={e => setAuctionForm(p => ({ ...p, liveStartDate: e.target.value }))} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-amber-500 focus:outline-none" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Lot Süresi (sn)</label>
                <input type="number" value={auctionForm.waitingTime} onChange={e => setAuctionForm(p => ({ ...p, waitingTime: e.target.value }))} min={5} max={120} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Uzatma Süresi (sn)</label>
                <input type="number" value={auctionForm.fairWaitingTime} onChange={e => setAuctionForm(p => ({ ...p, fairWaitingTime: e.target.value }))} min={5} max={15} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              {!auctionForm.liveOnly && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Gecikme (dk)</label>
                  <input type="number" value={auctionForm.liveDelayMinutes} onChange={e => setAuctionForm(p => ({ ...p, liveDelayMinutes: e.target.value }))} min={0} max={1440} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-amber-500 focus:outline-none" />
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1 block">Ödeme Süresi</label>
                <select value={auctionForm.paymentDays} onChange={e => setAuctionForm(p => ({ ...p, paymentDays: e.target.value }))} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-amber-500 focus:outline-none">
                  {[2,3,4,5,6,7].map(d => <option key={d} value={d}>{d} gün</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSaveAuction} disabled={auctionSaving} className="px-4 py-2 rounded-lg bg-amber-500 text-black font-medium text-sm hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center gap-1">
                {auctionSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Kaydet
              </button>
              <button onClick={() => setEditingAuction(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors">Vazgeç</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {auction.description && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">{auction.description}</div>
            )}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div><span className="text-muted-foreground">Tür:</span> <span className="font-medium ml-1">{auction.liveOnly ? '🔴 Sadece Canlı' : '📋 Standart'}</span></div>
              {!auction.liveOnly && (
                <div><span className="text-muted-foreground">Ön Teklif Başlangıç:</span> <span className="font-medium ml-1">{formatDateTime(auction.startDate)}</span></div>
              )}
              <div><span className="text-muted-foreground">Canlı Müzayede:</span> <span className="font-medium ml-1">{auction.liveStartDate ? formatDateTime(auction.liveStartDate) : 'Belirlenmedi'}</span></div>
              <div><span className="text-muted-foreground">Komisyon Oranı:</span> <span className="font-medium ml-1">%{auction.commissionRate}</span></div>
              <div><span className="text-muted-foreground">Lot Süresi:</span> <span className="font-medium ml-1">{auction.waitingTime} sn</span></div>
              <div><span className="text-muted-foreground">Uzatma:</span> <span className="font-medium ml-1">{auction.fairWaitingTime} sn</span></div>
              {!auction.liveOnly && (
                <div><span className="text-muted-foreground">Gecikme:</span> <span className="font-medium ml-1">{auction.liveDelayMinutes} dk</span></div>
              )}
              <div><span className="text-muted-foreground">Ödeme Süresi:</span> <span className="font-medium ml-1">{auction.paymentDays} gün</span></div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Lots Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" /> Lotlar ({auction.lots.length})
          </h2>
          {auction.status !== 'DRAFT' ? (
            <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg flex items-center gap-1">
              🔒 {auction.status === 'ACTIVE' || auction.status === 'LIVE' ? 'Müzayede yayında — lot ekleme/düzenleme kilitli' : 'Müzayede tamamlandı/iptal edildi'}
            </span>
          ) : auction.lots.length >= 100 ? (
            <span className="text-xs text-red-400">Maksimum 100 ürün sınırına ulaşıldı</span>
          ) : (
            <button
              onClick={() => setShowAddLot(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-black font-medium text-sm hover:bg-amber-400 transition-colors"
            >
              <Plus className="w-4 h-4" /> Yeni Lot Ekle ({auction.lots.length}/100)
            </button>
          )}
        </div>

        {/* Add Lot Form */}
        {showAddLot && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="rounded-xl border border-amber-500/30 bg-card p-6 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Yeni Lot Ekle</h3>
              <button onClick={() => setShowAddLot(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Lot Başlığı *</label>
                <input
                  type="text"
                  value={newLot.title}
                  onChange={e => setNewLot(p => ({ ...p, title: e.target.value }))}
                  className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="Ürün adı"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Kategoriler * <span className="text-xs">(birden fazla seçilebilir)</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-lg bg-muted border border-border max-h-48 overflow-y-auto">
                  {categories.map(c => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm hover:text-[#d4af37] transition-colors">
                      <input
                        type="checkbox"
                        checked={newLot.categoryIds.includes(c.id)}
                        onChange={e => {
                          setNewLot(p => ({
                            ...p,
                            categoryIds: e.target.checked
                              ? [...p.categoryIds, c.id]
                              : p.categoryIds.filter(id => id !== c.id),
                          }));
                        }}
                        className="rounded border-border text-[#d4af37] focus:ring-[#d4af37]"
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Örn: Antik bir tesbih hem "Antika" hem "Tesbih" kategorisinde olabilir</p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Başlangıç Fiyatı (₺) *</label>
                <input
                  type="number"
                  value={newLot.startingPrice}
                  onChange={e => setNewLot(p => ({ ...p, startingPrice: e.target.value }))}
                  className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Tahmini Değer (₺)</label>
                <input
                  type="number"
                  value={newLot.estimatedPrice}
                  onChange={e => setNewLot(p => ({ ...p, estimatedPrice: e.target.value }))}
                  className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="Opsiyonel"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Min. Artış Tutarı (₺)</label>
                <input
                  type="number"
                  value={newLot.customBidIncrement}
                  onChange={e => setNewLot(p => ({ ...p, customBidIncrement: e.target.value }))}
                  className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="Otomatik"
                />
                <p className="text-xs text-muted-foreground mt-1">Boş bırakılırsa fiyata göre otomatik belirlenir</p>
                <div className="mt-2 rounded-lg bg-amber-500/5 border border-amber-500/20 p-2.5">
                  <p className="text-[10px] font-medium text-amber-400 mb-1">📋 Otomatik Artırım Tablosu:</p>
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    <p>• 0 – 500 ₺ arası → <span className="text-foreground font-medium">50 ₺</span> artırım</p>
                    <p>• 500 – 1.000 ₺ arası → <span className="text-foreground font-medium">100 ₺</span> artırım</p>
                    <p>• 1.000 – 5.000 ₺ arası → <span className="text-foreground font-medium">250 ₺</span> artırım</p>
                    <p>• 5.000 – 10.000 ₺ arası → <span className="text-foreground font-medium">500 ₺</span> artırım</p>
                    <p>• 10.000 – 50.000 ₺ arası → <span className="text-foreground font-medium">1.000 ₺</span> artırım</p>
                    <p>• 50.000 ₺ üzeri → <span className="text-foreground font-medium">2.500 ₺</span> artırım</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">KDV Oranı</label>
                <select value={newLot.kdvRate} onChange={e => setNewLot(p => ({ ...p, kdvRate: e.target.value }))} className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                  <option value="20">%20 (Genel)</option>
                  <option value="10">%10 (İndirimli)</option>
                  <option value="1">%1 (Özel İndirimli)</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">Ürün türüne göre uygulanacak KDV oranını seçin</p>
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm text-muted-foreground mb-1 block">Kargo / Gönderim</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button type="button" onClick={() => setNewLot(p => ({ ...p, shippingType: 'BUYER_PAYS' }))} className={`text-left rounded-lg border px-3 py-2.5 text-sm transition-colors ${newLot.shippingType === 'BUYER_PAYS' ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                    <span className="font-semibold block">Alıcı ödemeli kargo</span>
                    <span className="text-[11px]">Kargo bedelini alıcı öder</span>
                  </button>
                  <button type="button" onClick={() => setNewLot(p => ({ ...p, shippingType: 'FREE_SELLER', estimatedShipping: '' }))} className={`text-left rounded-lg border px-3 py-2.5 text-sm transition-colors ${newLot.shippingType === 'FREE_SELLER' ? 'border-green-500 bg-green-500/10 text-green-300' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                    <span className="font-semibold block">Ücretsiz kargo</span>
                    <span className="text-[11px]">Kargo bedelini satıcı karşılar</span>
                  </button>
                </div>
                {newLot.shippingType === 'BUYER_PAYS' && (
                  <div className="mt-2">
                    <label className="text-xs text-muted-foreground mb-1 block">Tahmini kargo ücreti (₺) — bilgi amaçlı</label>
                    <input type="number" value={newLot.estimatedShipping} onChange={e => setNewLot(p => ({ ...p, estimatedShipping: e.target.value }))} className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" placeholder="Örn: 200" />
                    <p className="text-[10px] text-muted-foreground mt-1">Bu tutar sadece alıcıyı bilgilendirir. Kargo ücreti platforma yansımaz.</p>
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm text-muted-foreground mb-1 block">Açıklama</label>
                <textarea
                  value={newLot.description}
                  onChange={e => setNewLot(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                  placeholder="Lot hakkında detaylı açıklama"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm text-muted-foreground mb-1 block">Görseller (max 6)</label>
                <div className="space-y-3">
                  {lotImages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {lotImages.map((img, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
                          <Image src={img.url} alt={`Görsel ${idx + 1}`} fill className="object-cover" sizes="80px" />
                          <button
                            type="button"
                            onClick={() => removeLotImage(idx)}
                            className="absolute top-0.5 right-0.5 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                          {idx === 0 && <span className="absolute bottom-0 inset-x-0 bg-[#d4af37] text-black text-[8px] text-center font-bold">Kapak</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  <label className={`flex items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed border-border py-4 cursor-pointer hover:border-amber-500/50 transition-colors ${imageUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleLotImageUpload(e.target.files)}
                      disabled={imageUploading || lotImages.length >= 6}
                    />
                    {imageUploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin text-amber-500" /> <span className="text-sm text-muted-foreground">Yükleniyor...</span></>
                    ) : (
                      <><Upload className="w-4 h-4 text-amber-500" /> <span className="text-sm text-muted-foreground">Fotoğraf Seç ({lotImages.length}/6)</span></>
                    )}
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowAddLot(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleAddLot}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-black font-medium text-sm hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Kaydet
              </button>
            </div>
          </motion.div>
        )}

        {/* Yeni Müzayedeye Aktar Barı */}
        {isCompleted && unsoldLots.length > 0 && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <RotateCcw className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Satılmayan lotları yeni müzayedeye aktarın</p>
                <p className="text-xs text-muted-foreground">
                  {unsoldLots.length} satılmayan lot mevcut
                  {selectedLotIds.size > 0 && ` · ${selectedLotIds.size} lot seçildi`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAllUnsold}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted transition-colors"
              >
                {allUnsoldSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                {allUnsoldSelected ? 'Seçimi Kaldır' : 'Tümünü Seç'}
              </button>
              <button
                onClick={handleTransferLots}
                disabled={selectedLotIds.size === 0 || transferring}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-amber-500 text-black font-medium text-xs hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {transferring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Seçilenleri Yeni Müzayedeye Aktar
              </button>
            </div>
          </div>
        )}

        {/* Lots List */}
        {auction.lots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium mb-1">Henüz lot eklenmemiş</h3>
            <p className="text-sm text-muted-foreground mb-4">Bu müzayedeye lot ekleyerek başlayın.</p>
            <button
              onClick={() => setShowAddLot(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-black font-medium text-sm hover:bg-amber-400 transition-colors"
            >
              <Plus className="w-4 h-4" /> İlk Lotu Ekle
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {auction.lots.map((lot, i) => {
              const lotStatus = LOT_STATUS_MAP[lot.status] ?? { label: lot.status, color: 'bg-muted text-muted-foreground' };
              const isEditing = editingLotId === lot.id;
              return (
                <motion.div
                  key={lot.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`rounded-xl border bg-card transition-all ${
                    isEditing ? 'border-amber-500/50' : 'border-border/50 hover:border-amber-500/30'
                  }`}
                >
                  {/* Normal View */}
                  {!isEditing && (
                    <div className="flex items-center gap-4 p-4">
                      {isCompleted && (lot.status === 'UNSOLD' || lot.status === 'PENDING') && (
                        <button
                          onClick={() => toggleLotSelection(lot.id)}
                          className="flex-shrink-0 text-muted-foreground hover:text-amber-500 transition-colors"
                        >
                          {selectedLotIds.has(lot.id) ? (
                            <CheckSquare className="w-5 h-5 text-amber-500" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      )}
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-amber-500">#{lot.lotNumber}</span>
                      </div>
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {lot.images[0] ? (
                          <Image src={lot.images[0].imageUrl} alt={lot.title} fill className="object-cover" sizes="64px" />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{lot.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{lot.lotCategories?.length ? lot.lotCategories.map((lc: any) => lc.category?.name).filter(Boolean).join(', ') : (lot.category?.name ?? '')}</span>
                          <span>•</span>
                          <span>{formatPrice(lot.startingPrice)}</span>
                          {lot.currentPrice > lot.startingPrice && (
                            <>
                              <span>→</span>
                              <span className="text-amber-500 font-medium">{formatPrice(lot.currentPrice)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1"><Gavel className="w-3.5 h-3.5" /> {lot._count.bids}</div>
                        <div className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {lot._count.watchlist}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${lotStatus.color}`}>{lotStatus.label}</span>
                      {auction.status === 'DRAFT' && (
                        <button
                          onClick={() => startEditLot(lot)}
                          className="text-muted-foreground hover:text-amber-500 transition-colors p-1"
                          title="Düzenle"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      <Link href={`/lot/${lot.id}`} className="text-muted-foreground hover:text-amber-500 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  )}

                  {/* Edit Form */}
                  {isEditing && (
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <Edit className="w-4 h-4 text-amber-500" />
                          Lot #{lot.lotNumber} Düzenle
                        </h3>
                        <button onClick={() => setEditingLotId(null)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-muted-foreground mb-1 block">Lot Başlığı *</label>
                          <input
                            type="text"
                            value={editLot.title}
                            onChange={e => setEditLot(p => ({ ...p, title: e.target.value }))}
                            className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground mb-1 block">Kategoriler *</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-lg bg-muted border border-border max-h-48 overflow-y-auto">
                            {categories.map(c => (
                              <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm hover:text-[#d4af37] transition-colors">
                                <input
                                  type="checkbox"
                                  checked={editLot.categoryIds.includes(c.id)}
                                  onChange={e => {
                                    setEditLot(p => ({
                                      ...p,
                                      categoryIds: e.target.checked
                                        ? [...p.categoryIds, c.id]
                                        : p.categoryIds.filter(id => id !== c.id),
                                    }));
                                  }}
                                  className="rounded border-border text-[#d4af37] focus:ring-[#d4af37]"
                                />
                                {c.name}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground mb-1 block">Başlangıç Fiyatı (₺) *</label>
                          <input
                            type="number"
                            value={editLot.startingPrice}
                            onChange={e => setEditLot(p => ({ ...p, startingPrice: e.target.value }))}
                            className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                          />
                          {lot._count.bids > 0 && (
                            <p className="text-xs text-amber-500 mt-1">Teklif verilmiş — fiyat değişikliği mevcut teklifleri etkilemez</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground mb-1 block">Tahmini Değer (₺)</label>
                          <input
                            type="number"
                            value={editLot.estimatedPrice}
                            onChange={e => setEditLot(p => ({ ...p, estimatedPrice: e.target.value }))}
                            className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            placeholder="Opsiyonel"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground mb-1 block">Min. Artış Tutarı (₺)</label>
                          <input
                            type="number"
                            value={editLot.customBidIncrement}
                            onChange={e => setEditLot(p => ({ ...p, customBidIncrement: e.target.value }))}
                            className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            placeholder="Otomatik"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Boş bırakılırsa otomatik</p>
                        </div>
                        <div>
                          <label className="text-sm text-muted-foreground mb-1 block">KDV Oranı</label>
                          <select value={editLot.kdvRate} onChange={e => setEditLot(p => ({ ...p, kdvRate: e.target.value }))} className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50">
                            <option value="20">%20 (Genel)</option>
                            <option value="10">%10 (İndirimli)</option>
                            <option value="1">%1 (Özel İndirimli)</option>
                          </select>
                          <p className="text-[10px] text-muted-foreground mt-1">Ürün türüne göre uygulanacak KDV oranını seçin</p>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-sm text-muted-foreground mb-1 block">Kargo / Gönderim</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button type="button" onClick={() => setEditLot(p => ({ ...p, shippingType: 'BUYER_PAYS' }))} className={`text-left rounded-lg border px-3 py-2.5 text-sm transition-colors ${editLot.shippingType === 'BUYER_PAYS' ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                              <span className="font-semibold block">Alıcı ödemeli kargo</span>
                              <span className="text-[11px]">Kargo bedelini alıcı öder</span>
                            </button>
                            <button type="button" onClick={() => setEditLot(p => ({ ...p, shippingType: 'FREE_SELLER', estimatedShipping: '' }))} className={`text-left rounded-lg border px-3 py-2.5 text-sm transition-colors ${editLot.shippingType === 'FREE_SELLER' ? 'border-green-500 bg-green-500/10 text-green-300' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                              <span className="font-semibold block">Ücretsiz kargo</span>
                              <span className="text-[11px]">Kargo bedelini satıcı karşılar</span>
                            </button>
                          </div>
                          {editLot.shippingType === 'BUYER_PAYS' && (
                            <div className="mt-2">
                              <label className="text-xs text-muted-foreground mb-1 block">Tahmini kargo ücreti (₺)</label>
                              <input type="number" value={editLot.estimatedShipping} onChange={e => setEditLot(p => ({ ...p, estimatedShipping: e.target.value }))} className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50" placeholder="Örn: 200" />
                            </div>
                          )}
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-sm text-muted-foreground mb-1 block">Açıklama</label>
                          <textarea
                            value={editLot.description}
                            onChange={e => setEditLot(p => ({ ...p, description: e.target.value }))}
                            rows={3}
                            className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-sm text-muted-foreground mb-1 block">Görsel URL</label>
                          <input
                            type="text"
                            value={editLot.imageUrl}
                            onChange={e => setEditLot(p => ({ ...p, imageUrl: e.target.value }))}
                            className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                            placeholder="https://npr.brightspotcdn.com/dims3/default/strip/false/crop/2500x3125+0+0/resize/1100/quality/50/format/jpeg/?url=http%3A%2F%2Fnpr-brightspot.s3.amazonaws.com%2Fd2%2Fc9%2Fa5bc19d74649b30a349d4c8c8913%2F260408-lk-kidcluttter-flowchart.jpg"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 mt-4">
                        <button
                          onClick={() => setEditingLotId(null)}
                          className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
                        >
                          İptal
                        </button>
                        <button
                          onClick={handleEditLot}
                          disabled={editSaving}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-black font-medium text-sm hover:bg-amber-400 transition-colors disabled:opacity-50"
                        >
                          {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Güncelle
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}