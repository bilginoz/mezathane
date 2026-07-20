'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Package, FileText, Download, CheckCircle2,
  Clock, AlertCircle, Loader2, CreditCard, Truck, Building2, Copy, ChevronDown, ChevronUp,
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
  sellerName: string;
  amount: number;
  totalAmount: number;
  buyerPremiumRate: number;
  buyerPremiumAmount: number;
  buyerPremiumKDV: number;
  paymentStatus: string;
  paymentMethod: string | null;
  invoiceAvailable: boolean;
  invoiceDownloadUrl: string | null;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  // Kargo takip
  shippingStatus: string;
  trackingNumber: string | null;
  trackingCompany: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  buyerConfirmedAt: string | null;
  autoConfirmDate: string | null;
}

export function BuyerOrders() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [bankInfo, setBankInfo] = useState({ bankName: '', bankAccountHolder: '', bankIban: '' });
  const [expandedBank, setExpandedBank] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated') {
      fetchOrders();
      fetch('/api/site-settings').then(r => r.json()).then(d => {
        if (d?.settings) setBankInfo({ bankName: d.settings.bankName || '', bankAccountHolder: d.settings.bankAccountHolder || '', bankIban: d.settings.bankIban || '' });
      }).catch(() => {});
    }
  }, [status, router]);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/buyer/orders');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      toast.error('Siparişler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fatura';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleConfirmDelivery = async (paymentId: string) => {
    if (!confirm('Kargonuzu teslim aldığınızı ve ürünü kontrol ettiğinizi onaylıyor musunuz? Bu işlem geri alınamaz.')) return;
    setConfirmingId(paymentId);
    try {
      const res = await fetch('/api/buyer/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action: 'confirm_delivery' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? 'Onay başarısız');
        return;
      }
      toast.success('Teslim onaylandı! Teşekkürler.');
      fetchOrders();
    } catch {
      toast.error('Onay başarısız');
    } finally {
      setConfirmingId(null);
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'PAID': return { icon: CheckCircle2, label: 'Ödendi', color: 'bg-green-500/20 text-green-400' };
      case 'PENDING': return { icon: Clock, label: 'Ödeme Bekleniyor', color: 'bg-amber-500/20 text-amber-400' };
      case 'FAILED': return { icon: AlertCircle, label: 'Başarısız', color: 'bg-red-500/20 text-red-400' };
      default: return { icon: Clock, label: s, color: 'bg-muted text-muted-foreground' };
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-8">
          <div className="mx-auto max-w-[1000px] px-4">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-48" />
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
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
        <div className="mx-auto max-w-[1000px] px-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <Link href="/panel" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <Package className="h-6 w-6 text-[#d4af37]" />
            <h1 className="font-display text-2xl font-bold">Siparişlerim</h1>
          </div>

          {/* Orders */}
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Henüz siparişiniz bulunmuyor</p>
                <p className="text-xs text-muted-foreground mt-1">Kazandığınız müzayedeler burada görünecek</p>
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
                    className="rounded-xl border border-border bg-card p-5"
                  >
                    <div className="flex items-start gap-4">
                      {order.lotImage && (
                        <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
                          <Image src={order.lotImage} alt={order.lotTitle} fill className="object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <Link href={`/lot/${order.lotId}`} className="font-semibold hover:text-[#d4af37] truncate block">
                          #{order.lotNumber} {order.lotTitle}
                        </Link>
                        <p className="text-xs text-muted-foreground">{order.auctionTitle} • {order.sellerName}</p>
                        <div className="flex items-center gap-2 mt-2">
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
                        <p className="text-lg font-bold font-mono text-[#d4af37]">{formatPrice(order.totalAmount)}</p>
                        {order.paidAt && <p className="text-[10px] text-muted-foreground">Ödeme: {formatDate(order.paidAt)}</p>}
                      </div>
                    </div>

                    {/* Komisyon Dökümü */}
                    {order.buyerPremiumAmount > 0 && (
                      <div className="mt-2 rounded-lg bg-muted/30 p-2.5 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Çekiç Fiyatı</span>
                          <span className="font-mono">{formatPrice(order.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Hizmet Bedeli (%{order.buyerPremiumRate})</span>
                          <span className="font-mono">{formatPrice(order.buyerPremiumAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">KDV ({order.buyerPremiumAmount > 0 ? `%${Math.round(order.buyerPremiumKDV / order.buyerPremiumAmount * 100)}` : '%20'})</span>
                          <span className="font-mono">{formatPrice(order.buyerPremiumKDV)}</span>
                        </div>
                        <div className="border-t border-border pt-1 flex justify-between font-bold">
                          <span>Toplam</span>
                          <span className="text-[#d4af37] font-mono">{formatPrice(order.totalAmount)}</span>
                        </div>
                      </div>
                    )}

                    {/* Invoice download */}
                    {order.invoiceAvailable && order.invoiceDownloadUrl && (
                      <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
                        <FileText className="h-4 w-4 text-[#d4af37]" />
                        <span className="text-sm text-muted-foreground">Satıcı faturası mevcut</span>
                        <button
                          onClick={() => handleDownloadInvoice(order.invoiceDownloadUrl!)}
                          className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#d4af37] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#c9a430] transition-colors"
                        >
                          <Download className="h-3 w-3" /> Faturayı İndir
                        </button>
                      </div>
                    )}

                    {/* Auto-generated invoice */}
                    {order.lotId && (
                      <div className={`mt-3 pt-3 border-t border-border flex items-center gap-3 ${order.invoiceAvailable ? '' : ''}`}>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Platform faturası</span>
                        <button
                          onClick={() => handleDownloadInvoice(`/api/invoice/${order.lotId}`)}
                          className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                        >
                          <Download className="h-3 w-3" /> PDF İndir
                        </button>
                      </div>
                    )}

                    {/* Kargo Takip */}
                    {order.paymentStatus === 'PAID' && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="h-4 w-4 text-[#d4af37]" />
                          <span className="text-sm font-semibold">Kargo Durumu</span>
                          {(() => {
                            const shippingLabels: Record<string, { label: string; color: string }> = {
                              PREPARING: { label: 'Hazırlanıyor', color: 'bg-amber-500/20 text-amber-400' },
                              SHIPPED: { label: 'Kargoda', color: 'bg-blue-500/20 text-blue-400' },
                              DELIVERED: { label: 'Teslim Edildi', color: 'bg-green-500/20 text-green-400' },
                            };
                            const info = shippingLabels[order.shippingStatus] || shippingLabels.PREPARING;
                            return (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${info.color}`}>
                                {order.shippingStatus === 'SHIPPED' && <Truck className="h-3 w-3" />}
                                {order.shippingStatus === 'DELIVERED' && <CheckCircle2 className="h-3 w-3" />}
                                {order.shippingStatus === 'PREPARING' && <Clock className="h-3 w-3" />}
                                {info.label}
                              </span>
                            );
                          })()}
                        </div>

                        {/* İlerleme çubuğu */}
                        <div className="flex items-center gap-1 mb-2">
                          {['PREPARING', 'SHIPPED', 'DELIVERED'].map((step, i) => {
                            const stepOrder = ['PREPARING', 'SHIPPED', 'DELIVERED'];
                            const currentIdx = stepOrder.indexOf(order.shippingStatus);
                            const active = i <= currentIdx;
                            return (
                              <div key={step} className="flex-1 flex items-center gap-1">
                                <div className={`h-1.5 flex-1 rounded-full transition-colors ${active ? 'bg-[#d4af37]' : 'bg-muted'}`} />
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-2">
                          <span>Hazırlanıyor</span>
                          <span>Kargoda</span>
                          <span>Teslim Edildi</span>
                        </div>

                        {order.trackingNumber && (
                          <div className="rounded-lg bg-muted/30 p-2.5 text-xs space-y-1">
                            <p><span className="text-muted-foreground">Kargo Firması:</span> <span className="font-medium">{order.trackingCompany || '-'}</span></p>
                            <p><span className="text-muted-foreground">Takip No:</span> <span className="font-mono font-medium">{order.trackingNumber}</span></p>
                            {order.shippedAt && <p><span className="text-muted-foreground">Gönderim Tarihi:</span> <span>{formatDate(order.shippedAt)}</span></p>}
                            {order.deliveredAt && <p><span className="text-muted-foreground">Teslim Tarihi:</span> <span>{formatDate(order.deliveredAt)}</span></p>}
                          </div>
                        )}

                        {/* Teslim Alım Onayı */}
                        {order.shippingStatus === 'SHIPPED' && !order.buyerConfirmedAt && (
                          <div className="mt-3 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/5 p-3">
                            <p className="text-xs text-muted-foreground mb-2">
                              Kargonuzu teslim aldıysanız ve üründe sorun yoksa aşağıdaki butona basın.
                              {order.autoConfirmDate && (
                                <span className="block mt-1 text-amber-400">
                                  Onay vermezseniz {formatDate(order.autoConfirmDate)} tarihinde otomatik onaylandır.
                                </span>
                              )}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleConfirmDelivery(order.paymentId)}
                                disabled={confirmingId === order.paymentId}
                                className="flex items-center gap-1.5 rounded-lg bg-[#d4af37] px-4 py-2 text-xs font-bold text-black hover:bg-[#c4a030] transition-colors disabled:opacity-50"
                              >
                                {confirmingId === order.paymentId ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                Teslim Aldım & Onaylıyorum
                              </button>
                              <Link
                                href="/panel/anlasmazliklar"
                                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <AlertCircle className="h-3.5 w-3.5" />
                                Sorun Bildir
                              </Link>
                            </div>
                          </div>
                        )}

                        {/* Onaylandı mesajı */}
                        {order.buyerConfirmedAt && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Teslim onaylandı — {formatDate(order.buyerConfirmedAt)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {order.paymentStatus === 'PENDING' && (
                      <div className="mt-3 pt-3 border-t border-border space-y-3">
                        <div className="flex items-center justify-between">
                          {order.dueDate && (
                            <p className="text-xs text-amber-400">
                              <Clock className="h-3 w-3 inline mr-1" />
                              Son ödeme tarihi: {formatDate(order.dueDate)}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedBank(expandedBank === order.paymentId ? null : order.paymentId)}
                              className="flex items-center gap-1.5 rounded-lg border border-[#d4af37]/40 px-3 py-2 text-xs font-medium text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors"
                            >
                              <Building2 className="h-3.5 w-3.5" />
                              Banka Bilgileri
                              {expandedBank === order.paymentId ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                            <Link
                              href={`/panel/odeme?id=${order.paymentId}`}
                              className="flex items-center gap-1.5 rounded-lg bg-[#d4af37] px-4 py-2 text-xs font-bold text-black hover:bg-[#c9a430] transition-colors"
                            >
                              <CreditCard className="h-3.5 w-3.5" /> Ödeme Yap
                            </Link>
                          </div>
                        </div>
                        {expandedBank === order.paymentId && bankInfo.bankIban && (
                          <div className="rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/5 p-4 space-y-2.5">
                            <BankRow label="Banka" value={bankInfo.bankName} copied={copiedField} onCopy={(v, l) => { navigator.clipboard.writeText(v); setCopiedField(l); toast.success(`${l} kopyalandı`); setTimeout(() => setCopiedField(''), 2000); }} />
                            <BankRow label="Hesap Sahibi" value={bankInfo.bankAccountHolder} copied={copiedField} onCopy={(v, l) => { navigator.clipboard.writeText(v); setCopiedField(l); toast.success(`${l} kopyalandı`); setTimeout(() => setCopiedField(''), 2000); }} />
                            <BankRow label="IBAN" value={bankInfo.bankIban} copied={copiedField} onCopy={(v, l) => { navigator.clipboard.writeText(v); setCopiedField(l); toast.success(`${l} kopyalandı`); setTimeout(() => setCopiedField(''), 2000); }} />
                            <BankRow label="Açıklama" value={`MZT-${order.paymentId?.slice(-8)?.toUpperCase() ?? ''}`} copied={copiedField} onCopy={(v, l) => { navigator.clipboard.writeText(v); setCopiedField(l); toast.success(`${l} kopyalandı`); setTimeout(() => setCopiedField(''), 2000); }} />
                            <p className="text-[10px] text-amber-400 mt-2">⚠️ Havale/EFT açıklamasına yukarıdaki kodu mutlaka yazın.</p>
                          </div>
                        )}
                      </div>
                    )}
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

function BankRow({ label, value, copied, onCopy }: { label: string; value: string; copied: string; onCopy: (v: string, l: string) => void }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between rounded-md bg-background/50 px-3 py-2">
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xs font-mono font-medium mt-0.5">{value}</p>
      </div>
      <button onClick={() => onCopy(value, label)} className="flex items-center gap-1 rounded px-2 py-1 text-[10px] border border-border hover:bg-muted transition-colors">
        {copied === label ? <CheckCircle2 className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
        {copied === label ? 'Kopyalandı' : 'Kopyala'}
      </button>
    </div>
  );
}