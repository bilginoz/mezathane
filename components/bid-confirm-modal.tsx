'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { formatPrice } from '@/lib/utils';
import { Gavel, ExternalLink, AlertTriangle, X, Zap, Truck } from 'lucide-react';
import Link from 'next/link';

interface BidConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  lotTitle: string;
  lotNumber: number;
  bidAmount: number;
  isProxy?: boolean;
  maxBidAmount?: number;
  auctionTitle?: string;
  paymentDays?: number;
  kdvRate?: number;
}

export function BidConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  lotTitle,
  lotNumber,
  bidAmount,
  isProxy = false,
  maxBidAmount,
  auctionTitle,
  paymentDays = 5,
  kdvRate = 20,
}: BidConfirmModalProps) {
  // Komisyon hesaplama
  const amount = isProxy && maxBidAmount ? maxBidAmount : bidAmount;
  const komisyon = amount * 0.10;
  const effectiveKdvRate = (kdvRate ?? 20) / 100;
  const komisyonKDV = komisyon * effectiveKdvRate;
  const toplam = amount + komisyon + komisyonKDV;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-muted/50 border-b border-border px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isProxy ? <Zap className="h-5 w-5 text-[#d4af37]" /> : <Gavel className="h-5 w-5 text-[#d4af37]" />}
                  <h3 className="text-base font-bold">
                    {isProxy ? 'Otomatik Teklif Onayı' : 'Teklif Onayı'}
                  </h3>
                </div>
                <button onClick={onClose} className="rounded-full p-1 hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Lot No: {lotNumber} | {lotTitle}
              </p>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              {/* Müzayede Kuralları linki */}
              <Link
                href="/yasal/muzayede-kurallari"
                target="_blank"
                className="flex items-center gap-2 text-sm text-[#d4af37] hover:underline"
              >
                {auctionTitle ? `${auctionTitle}` : 'Mezathane.tr'} Müzayede Kuralları&apos;nı okuyup kabul ediyorsanız, Onayla butonuna tıklayın.
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
              </Link>

              {/* Cayma Hakkı Uyarısı */}
              <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-400 font-medium">
                  Önemli Uyarı: Cayma hakkının olmadığını bilerek onaylıyorum
                </p>
              </div>

              {/* Komisyon Kırılımı */}
              <div className="space-y-2">
                {isProxy && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Başlangıç Teklifi</span>
                    <span className="font-mono font-medium">{formatPrice(bidAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isProxy ? 'Maks. Çekiç Fiyatı (KDV dahil)' : 'Çekiç Fiyatı (KDV dahil)'}
                  </span>
                  <span className="font-mono font-medium">{formatPrice(amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Komisyon (%10)</span>
                  <span className="font-mono">{formatPrice(komisyon)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Komisyon K.D.V. (%{kdvRate})</span>
                  <span className="font-mono">{formatPrice(komisyonKDV)}</span>
                </div>

                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between text-base font-bold">
                    <span>{isProxy ? 'Maks. Toplam' : 'Toplam'}</span>
                    <span className="text-[#d4af37] font-mono">{formatPrice(toplam)}</span>
                  </div>
                </div>
              </div>

              {/* Kargo bilgisi */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Truck className="h-3.5 w-3.5" />
                <span>Kargo alıcı ödemelidir</span>
              </div>

              {/* Ödeme süresi */}
              <p className="text-xs text-muted-foreground">
                Ödeme süresi müzayede bitiminden sonra <strong>{paymentDays} gündür</strong>.
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-border bg-muted/30">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                Kapat
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black hover:bg-[#c9a430] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="inline-block h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>{isProxy ? <Zap className="h-4 w-4" /> : <Gavel className="h-4 w-4" />} Onayla</>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
