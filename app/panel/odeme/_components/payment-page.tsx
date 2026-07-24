'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CreditCard, Building2, Copy, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export function PaymentPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('id');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');
  const [bankInfo, setBankInfo] = useState({ bankName: '', bankAccountHolder: '', bankIban: '', contactAddress: '', contactEmail: '' });

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated') {
      const fetchAll = async () => {
        try {
          const [ordersRes, settingsRes] = await Promise.all([
            paymentId ? fetch('/api/buyer/orders') : Promise.resolve(null),
            fetch('/api/site-settings'),
          ]);
          if (ordersRes) {
            const d = await ordersRes.json();
            const found = d?.orders?.find((o: any) => o.paymentId === paymentId);
            setOrder(found ?? null);
          }
          if (settingsRes) {
            const s = await settingsRes.json();
            if (s?.settings) {
              setBankInfo({
                bankName: s.settings.bankName || '',
                bankAccountHolder: s.settings.bankAccountHolder || '',
                bankIban: s.settings.bankIban || '',
                contactAddress: s.settings.contactAddress || '',
                contactEmail: s.settings.contactEmail || '',
              });
            }
          }
        } catch {} finally { setLoading(false); }
      };
      fetchAll();
    }
  }, [status, paymentId, router]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} kopyalandı`);
    setTimeout(() => setCopied(''), 2000);
  };

  if (loading) {
    return (
      <main className="flex-1 py-8">
        <div className="flex justify-center min-h-[40vh] items-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[700px] px-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/panel/siparislerim" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <CreditCard className="h-6 w-6 text-[#d4af37]" />
          <h1 className="font-display text-2xl font-bold">Ödeme Yap</h1>
        </div>

        {!order ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Ödeme bilgisi bulunamadı</p>
            <Link href="/panel/siparislerim" className="text-[#d4af37] text-sm mt-2 inline-block hover:underline">Siparişlerime Dön</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sipariş Özeti */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Sipariş Özeti</h2>
              <div className="flex items-start gap-4">
                {order.lotImage && (
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    <Image src={order.lotImage} alt={order.lotTitle} fill className="object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold">#{order.lotNumber} {order.lotTitle}</p>
                  <p className="text-xs text-muted-foreground">{order.auctionTitle} • {order.sellerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold font-mono text-[#d4af37]">{formatPrice(order.totalAmount)}</p>
                  {order.dueDate && (
                    <p className="text-[10px] text-amber-400 mt-1">
                      <Clock className="h-3 w-3 inline mr-0.5" /> Son: {formatDate(order.dueDate)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Banka Havale Bilgileri */}
            <div className="rounded-xl border-2 border-[#d4af37]/50 bg-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Building2 className="h-5 w-5 text-[#d4af37]" />
                <h2 className="text-lg font-bold">Banka Havale / EFT Bilgileri</h2>
              </div>

              <div className="space-y-4">
                <InfoRow label="Banka" value={bankInfo.bankName || 'Belirtilmedi'} onCopy={copyToClipboard} copied={copied} />
                <InfoRow label="Hesap Sahibi" value={bankInfo.bankAccountHolder || 'Belirtilmedi'} onCopy={copyToClipboard} copied={copied} />
                <InfoRow label="IBAN" value={bankInfo.bankIban || 'Belirtilmedi'} onCopy={copyToClipboard} copied={copied} />
                <InfoRow label="Açıklama" value={`MZT-${order.paymentId?.slice(-8)?.toUpperCase() ?? ''}`} onCopy={copyToClipboard} copied={copied} />
              </div>

              <div className="mt-5 rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                <p className="text-xs text-amber-400 font-medium mb-1">⚠️ Önemli</p>
                <ul className="text-xs text-amber-400/80 space-y-1">
                  <li>• Havale/EFT açıklamasına yukarıdaki kodu mutlaka yazın.</li>
                  <li>• Ödemeniz kontrol edildikten sonra sipariş durumunuz güncellenecektir.</li>
                  <li>• Ödeme onayı 1-2 iş günü içinde yapılmaktadır.</li>
                </ul>
              </div>
            </div>

            {/* Firma Bilgileri */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Firma Bilgileri</h2>
              <div className="text-sm space-y-1.5">
                <p><span className="text-muted-foreground">Firma:</span> {bankInfo.bankAccountHolder || 'Mezathane Bilişim Teknolojileri A.Ş.'}</p>
                <p><span className="text-muted-foreground">Adres:</span> {bankInfo.contactAddress || 'İstanbul, Türkiye'}</p>
                <p><span className="text-muted-foreground">E-posta:</span> {bankInfo.contactEmail || 'bilgi@mezathane.tr'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function InfoRow({ label, value, onCopy, copied }: { label: string; value: string; onCopy: (v: string, l: string) => void; copied: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-mono font-medium mt-0.5">{value}</p>
      </div>
      <button
        onClick={() => onCopy(value, label)}
        className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs border border-border hover:bg-muted transition-colors"
      >
        {copied === label ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
        {copied === label ? 'Kopyalandı' : 'Kopyala'}
      </button>
    </div>
  );
}
