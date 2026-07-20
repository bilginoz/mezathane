'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Package, FileText, Upload, Eye, EyeOff,
  Loader2, CheckCircle2, Clock, AlertCircle, Truck,
  CreditCard, Building2, Download,
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

interface Order {
  paymentId: string;
  lotId: string;
  lotTitle: string;
  lotNumber: number;
  lotImage: string | null;
  auctionTitle: string;
  salePrice: number;
  commissionRate: number;
  grossCommission: number;
  sellerNet: number;
  invoiceMatrah: number;
  invoiceKDV: number;
  paymentStatus: string;
  paymentMethod: string | null;
  invoiceUrl: string | null;
  invoicePath: string | null;
  paidAt: string | null;
  dueDate: string | null;
  createdAt: string;
  // Kargo takip
  shippingStatus: string;
  trackingNumber: string | null;
  trackingCompany: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  // Escrow
  buyerConfirmedAt: string | null;
  autoConfirmDate: string | null;
  payoutRequestedAt: string | null;
  payoutCompleted: boolean;
  buyer: {
    fullName: string; email: string; phone: string; address: string;
    shippingAddress?: string; billingAddress?: string;
    tcKimlikNo?: string | null; isCompany?: boolean;
    companyName?: string | null; taxOffice?: string | null; taxNumber?: string | null;
    city?: string | null; district?: string | null; postalCode?: string | null;
  } | null;
  buyerHidden: boolean;
}

export function SellerOrders() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [generatingInvoiceId, setGeneratingInvoiceId] = useState<string | null>(null);
  const [shippingEdit, setShippingEdit] = useState<{
    paymentId: string;
    status: string;
    trackingNumber: string;
    trackingCompany: string;
  } | null>(null);
  const [updatingShipping, setUpdatingShipping] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState<string | null>(null);

  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated' && user?.role !== 'SELLER' && user?.role !== 'ADMIN') {
      router.replace('/panel'); return;
    }
  }, [status, router, user?.role]);

  useEffect(() => {
    if (status === 'authenticated' && (user?.role === 'SELLER' || user?.role === 'ADMIN')) {
      fetchOrders();
    }
  }, [status, user?.role]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/seller/orders');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      toast.error('Siparişler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceUpload = async (paymentId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('Dosya 10MB\'dan büyük olamaz'); return; }
    setUploadingId(paymentId);
    try {
      // 1. Presigned URL al
      const presRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: false }),
      });
      const { uploadUrl, cloud_storage_path } = await presRes.json();

      // 2. S3'e yükle
      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });

      // 3. Payment'a kaydet
      const res = await fetch(`/api/seller/orders/${paymentId}/invoice`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceUrl: uploadUrl.split('?')[0], invoicePath: cloud_storage_path }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Fatura başarıyla yüklendi');
        fetchOrders();
      } else {
        toast.error(data.error ?? 'Fatura yüklenemedi');
      }
    } catch {
      toast.error('Fatura yükleme hatası');
    } finally {
      setUploadingId(null);
    }
  };

  const handleDownloadCommissionInvoice = async (paymentId: string) => {
    setGeneratingInvoiceId(paymentId);
    try {
      const res = await fetch('/api/seller/commission-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? 'Fatura oluşturulamadı');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hizmet-faturasi-${paymentId.slice(-6).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Hizmet faturası indirildi');
    } catch {
      toast.error('Fatura indirme hatası');
    } finally {
      setGeneratingInvoiceId(null);
    }
  };

  const handleShippingUpdate = async () => {
    if (!shippingEdit) return;
    if (shippingEdit.status === 'SHIPPED' && !shippingEdit.trackingNumber.trim()) {
      toast.error('Kargoya verildi durumu için takip numarası gereklidir');
      return;
    }
    setUpdatingShipping(true);
    try {
      const res = await fetch('/api/seller/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: shippingEdit.paymentId,
          shippingStatus: shippingEdit.status,
          trackingNumber: shippingEdit.trackingNumber,
          trackingCompany: shippingEdit.trackingCompany,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? 'Kargo durumu güncellenemedi');
        return;
      }
      toast.success('Kargo durumu güncellendi');
      setShippingEdit(null);
      fetchOrders();
    } catch {
      toast.error('Kargo durumu güncellenemedi');
    } finally {
      setUpdatingShipping(false);
    }
  };

  const handlePayoutRequest = async (paymentId: string) => {
    setRequestingPayout(paymentId);
    try {
      const res = await fetch('/api/seller/payout-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? 'Ödeme talebi gönderilemedi');
        return;
      }
      toast.success('Ödeme talebi admin\'e iletildi');
      fetchOrders();
    } catch {
      toast.error('Ödeme talebi gönderilemedi');
    } finally {
      setRequestingPayout(null);
    }
  };

  const getShippingBadge = (status: string) => {
    switch (status) {
      case 'SHIPPED': return { icon: Truck, label: 'Kargoda', color: 'bg-blue-500/20 text-blue-400' };
      case 'DELIVERED': return { icon: CheckCircle2, label: 'Teslim Edildi', color: 'bg-green-500/20 text-green-400' };
      default: return { icon: Package, label: 'Hazırlanıyor', color: 'bg-amber-500/20 text-amber-400' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID': return { icon: CheckCircle2, label: 'Ödendi', color: 'bg-green-500/20 text-green-400' };
      case 'PENDING': return { icon: Clock, label: 'Ödeme Bekleniyor', color: 'bg-amber-500/20 text-amber-400' };
      case 'FAILED': return { icon: AlertCircle, label: 'Başarısız', color: 'bg-red-500/20 text-red-400' };
      default: return { icon: Clock, label: status, color: 'bg-muted text-muted-foreground' };
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="mx-auto max-w-[1200px] px-4">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-48" />
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 bg-muted rounded-xl" />)}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-[1200px] px-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Link href="/satici" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Package className="h-6 w-6 text-[#d4af37]" />
            <h1 className="font-display text-2xl font-bold">Siparişlerim</h1>
          </div>

          {/* KVKK Info */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 mb-6">
            <div className="flex items-start gap-3">
              <EyeOff className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-blue-400">KVKK Veri Gizliliği</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Alıcı bilgileri (ad, adres, telefon) satış gerçekleştikten sonra görüntülenebilir.
                  Bu bilgiler yalnızca fatura kesimi ve kargo gönderimi için kullanılmalıdır.
                </p>
              </div>
            </div>
          </div>

          {/* Orders */}
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Henüz sipariş bulunmuyor</p>
              </div>
            ) : (
              orders.map((order, idx) => {
                const statusInfo = getStatusBadge(order.paymentStatus);
                const StatusIcon = statusInfo.icon;
                return (
                  <motion.div
                    key={order.paymentId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="rounded-xl border border-border bg-card overflow-hidden"
                  >
                    <div className="p-5">
                      {/* Top row */}
                      <div className="flex items-start gap-4 mb-4">
                        {order.lotImage && (
                          <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
                            <Image src={order.lotImage} alt={order.lotTitle} fill className="object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">#{order.lotNumber} {order.lotTitle}</h3>
                          <p className="text-xs text-muted-foreground">{order.auctionTitle}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.color}`}>
                              <StatusIcon className="h-3 w-3" />{statusInfo.label}
                            </span>
                            {order.paymentMethod && (
                              <span className="text-[10px] text-muted-foreground">
                                {order.paymentMethod === 'HAVALE_EFT' ? 'Havale/EFT' : 'Kredi Kartı'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold font-mono text-[#d4af37]">{formatPrice(order.salePrice)}</p>
                          <p className="text-[10px] text-muted-foreground">Satış fiyatı</p>
                        </div>
                      </div>

                      {/* Financial breakdown */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground">Komisyon (%{order.commissionRate} + KDV)</p>
                          <p className="text-sm font-mono font-bold text-amber-500">-{formatPrice(order.grossCommission)}</p>
                          <p className="text-[8px] text-muted-foreground">Matrah: {formatPrice(order.invoiceMatrah)} + KDV: {formatPrice(order.invoiceKDV)}</p>
                        </div>
                        <div className="rounded-lg bg-green-500/10 p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground">Net Elinize Geçen</p>
                          <p className="text-sm font-mono font-bold text-green-500">{formatPrice(order.sellerNet)}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground">Hizmet Faturası</p>
                          <p className="text-sm font-mono font-bold">{formatPrice(order.grossCommission)}</p>
                        </div>
                      </div>

                      {/* Buyer Info (KVKK) */}
                      {order.buyerHidden ? (
                        <div className="rounded-lg bg-muted/30 border border-border p-3 flex items-center gap-3">
                          <EyeOff className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Alıcı Bilgileri Gizli</p>
                            <p className="text-[10px] text-muted-foreground">Satış tamamlandıktan sonra alıcı bilgileri görüntülenecektir.</p>
                          </div>
                        </div>
                      ) : order.buyer ? (
                        <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="h-4 w-4 text-green-400" />
                            <p className="text-sm font-semibold text-green-400">Alıcı Bilgileri (Fatura & Kargo)</p>
                          </div>
                          <div className="space-y-3 text-xs">
                            {/* Kişisel Bilgiler */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div><span className="text-muted-foreground">Ad Soyad:</span> <span className="font-medium">{order.buyer.fullName}</span></div>
                              <div><span className="text-muted-foreground">E-posta:</span> <span className="font-medium">{order.buyer.email}</span></div>
                              <div><span className="text-muted-foreground">Telefon:</span> <span className="font-medium">{order.buyer.phone}</span></div>
                              {order.buyer.tcKimlikNo && (
                                <div><span className="text-muted-foreground">TC Kimlik No:</span> <span className="font-medium">{order.buyer.tcKimlikNo}</span></div>
                              )}
                            </div>
                            {/* Şirket Bilgileri */}
                            {order.buyer.isCompany && (
                              <div className="border-t border-border/50 pt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div><span className="text-muted-foreground">Şirket:</span> <span className="font-medium">{order.buyer.companyName}</span></div>
                                <div><span className="text-muted-foreground">Vergi Dairesi:</span> <span className="font-medium">{order.buyer.taxOffice}</span></div>
                                <div><span className="text-muted-foreground">Vergi No:</span> <span className="font-medium">{order.buyer.taxNumber}</span></div>
                              </div>
                            )}
                            {/* Adres Bilgileri */}
                            <div className="border-t border-border/50 pt-2 grid grid-cols-1 gap-2">
                              <div><span className="text-muted-foreground">Gönderim Adresi:</span> <span className="font-medium">{order.buyer.shippingAddress}</span></div>
                              <div><span className="text-muted-foreground">Fatura Adresi:</span> <span className="font-medium">{order.buyer.billingAddress}</span></div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Kargo Takip */}
                      {!order.buyerHidden && (
                        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-[#d4af37]" />
                              <span className="text-sm font-semibold">Kargo Takip</span>
                            </div>
                            {(() => {
                              const sb = getShippingBadge(order.shippingStatus);
                              const SIcon = sb.icon;
                              return (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sb.color}`}>
                                  <SIcon className="h-3 w-3" />{sb.label}
                                </span>
                              );
                            })()}
                          </div>

                          {/* Mevcut takip bilgileri */}
                          {order.trackingNumber && (
                            <div className="text-xs space-y-1 mb-2">
                              <p><span className="text-muted-foreground">Kargo Firması:</span> <span className="font-medium">{order.trackingCompany || '-'}</span></p>
                              <p><span className="text-muted-foreground">Takip No:</span> <span className="font-mono font-medium">{order.trackingNumber}</span></p>
                              {order.shippedAt && <p><span className="text-muted-foreground">Gönderim:</span> <span>{formatDate(order.shippedAt)}</span></p>}
                              {order.deliveredAt && <p><span className="text-muted-foreground">Teslim:</span> <span>{formatDate(order.deliveredAt)}</span></p>}
                            </div>
                          )}

                          {/* Escrow / Ödeme durumu */}
                          {order.shippingStatus === 'SHIPPED' && !order.buyerConfirmedAt && (
                            <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-2.5 text-xs mb-2">
                              <p className="text-blue-400 font-medium">Alıcı teslim onayı bekleniyor</p>
                              {order.autoConfirmDate && (
                                <p className="text-muted-foreground mt-0.5">
                                  Otomatik onay: {formatDate(order.autoConfirmDate)}
                                </p>
                              )}
                              {!order.payoutRequestedAt && !order.payoutCompleted && (
                                <button
                                  onClick={() => handlePayoutRequest(order.paymentId)}
                                  disabled={requestingPayout === order.paymentId}
                                  className="mt-2 flex items-center gap-1.5 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/5 px-3 py-1.5 text-xs font-medium text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors disabled:opacity-50"
                                >
                                  {requestingPayout === order.paymentId ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CreditCard className="h-3 w-3" />
                                  )}
                                  Ödeme Talep Et
                                </button>
                              )}
                              {order.payoutRequestedAt && (
                                <p className="mt-1 text-amber-400">Ödeme talebi gönderildi — {formatDate(order.payoutRequestedAt)}</p>
                              )}
                            </div>
                          )}

                          {order.buyerConfirmedAt && (
                            <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-2.5 text-xs mb-2">
                              <div className="flex items-center gap-1.5 text-green-400 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Alıcı teslim onayladı — {formatDate(order.buyerConfirmedAt)}
                              </div>
                              {order.payoutCompleted ? (
                                <p className="text-green-400 mt-1">✅ Ödemeniz tamamlandı</p>
                              ) : (
                                <p className="text-muted-foreground mt-1">Ödemeniz serbest bırakıldı, admin tarafından işlenecek.</p>
                              )}
                            </div>
                          )}

                          {/* Düzenleme modu */}
                          {shippingEdit?.paymentId === order.paymentId ? (
                            <div className="space-y-2 mt-2">
                              <div className="flex gap-2">
                                {(['PREPARING', 'SHIPPED'] as const).map((s) => {
                                  const labels: Record<string, string> = { PREPARING: 'Hazırlanıyor', SHIPPED: 'Kargoya Verildi' };
                                  return (
                                    <button
                                      key={s}
                                      onClick={() => setShippingEdit(prev => prev ? { ...prev, status: s } : null)}
                                      className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium border transition-colors ${
                                        shippingEdit.status === s
                                          ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37]'
                                          : 'border-border text-muted-foreground hover:bg-muted'
                                      }`}
                                    >
                                      {labels[s]}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="text"
                                  placeholder="Kargo firması (ör: Yurtiçi)"
                                  value={shippingEdit.trackingCompany}
                                  onChange={(e) => setShippingEdit(prev => prev ? { ...prev, trackingCompany: e.target.value } : null)}
                                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs"
                                />
                                <input
                                  type="text"
                                  placeholder="Takip numarası"
                                  value={shippingEdit.trackingNumber}
                                  onChange={(e) => setShippingEdit(prev => prev ? { ...prev, trackingNumber: e.target.value } : null)}
                                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-mono"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={handleShippingUpdate}
                                  disabled={updatingShipping}
                                  className="flex items-center gap-1.5 rounded-lg bg-[#d4af37] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#c4a030] transition-colors disabled:opacity-50"
                                >
                                  {updatingShipping ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                  Kaydet
                                </button>
                                <button
                                  onClick={() => setShippingEdit(null)}
                                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
                                >
                                  İptal
                                </button>
                              </div>
                            </div>
                          ) : order.shippingStatus === 'PREPARING' || (order.shippingStatus === 'SHIPPED' && !order.buyerConfirmedAt) ? (
                            <button
                              onClick={() => setShippingEdit({
                                paymentId: order.paymentId,
                                status: order.shippingStatus,
                                trackingNumber: order.trackingNumber || '',
                                trackingCompany: order.trackingCompany || '',
                              })}
                              className="flex items-center gap-1.5 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/5 px-3 py-1.5 text-xs font-medium text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors mt-1"
                            >
                              <Truck className="h-3 w-3" />
                              {order.shippingStatus === 'PREPARING' ? 'Kargo Bilgisi Gir' : 'Kargo Durumu Güncelle'}
                            </button>
                          ) : null}
                        </div>
                      )}

                      {/* Commission Invoice Download */}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadCommissionInvoice(order.paymentId)}
                          disabled={generatingInvoiceId === order.paymentId}
                          className="flex items-center gap-2 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/5 px-3 py-1.5 text-xs font-medium text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors disabled:opacity-50"
                        >
                          {generatingInvoiceId === order.paymentId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          {generatingInvoiceId === order.paymentId ? 'Oluşturuluyor...' : 'Hizmet Faturası İndir'}
                        </button>
                      </div>

                      {/* Invoice Upload */}
                      <div className="mt-3 flex items-center gap-3">
                        {order.invoicePath ? (
                          <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-green-400">Fatura yüklendi</span>
                          </div>
                        ) : (
                          <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-[#d4af37]/50 bg-[#d4af37]/5 px-4 py-2 text-sm hover:bg-[#d4af37]/10 transition-colors">
                            {uploadingId === order.paymentId ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[#d4af37]" />
                            ) : (
                              <Upload className="h-4 w-4 text-[#d4af37]" />
                            )}
                            <span className="text-[#d4af37] font-medium">
                              {uploadingId === order.paymentId ? 'Yükleniyor...' : 'Fatura Yükle'}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              disabled={uploadingId === order.paymentId}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleInvoiceUpload(order.paymentId, file);
                              }}
                            />
                          </label>
                        )}
                        {order.paidAt && (
                          <span className="text-[10px] text-muted-foreground">Ödeme: {formatDate(order.paidAt)}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
