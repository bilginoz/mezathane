'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CreditCard, Building2, Copy, CheckCircle2, Clock, Loader2, Upload, FileText } from 'lucide-react';
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
  const [paymentMode, setPaymentMode] = useState<'ESCROW' | 'DIRECT'>('ESCROW');
  const [uploading, setUploading] = useState(false);
  const [reporting, setReporting] = useState(false);

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
            if (d?.paymentMode === 'DIRECT') setPaymentMode('DIRECT');
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

  // DIRECT modda: alıcı "ödemeyi yaptım" der (+ isteğe bağlı dekont). Satıcıya bildirim gider.
  const reportPayment = async (receiptUrl?: string) => {
    setReporting(true);
    try {
      const res = await fetch('/api/buyer/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action: 'report_payment', receiptUrl }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Bildirilemedi'); return; }
      toast.success('Ödeme bildiriminiz satıcıya iletildi');
      setOrder((o: any) => ({ ...o, buyerReportedPaidAt: new Date().toISOString(), ...(receiptUrl ? { buyerReceiptUrl: receiptUrl } : {}) }));
    } catch {
      toast.error('Bildirilemedi');
    } finally {
      setReporting(false);
    }
  };

  const uploadDekont = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const isPdf = file.type === 'application/pdf';
    if (!isPdf && !file.type.startsWith('image/')) { toast.error('Dekont PDF veya görsel olmalı'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Dosya 10MB\'dan büyük'); return; }
    setUploading(true);
    try {
      const ext = isPdf ? 'pdf' : (file.type === 'image/png' ? 'png' : 'jpg');
      const fileName = `dekont/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const presignRes = await fetch('/api/upload/presigned', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, contentType: file.type, isPublic: true }),
      });
      if (!presignRes.ok) { const e = await presignRes.json().catch(() => ({})); toast.error(e.error || 'Yüklenemedi'); return; }
      const { uploadUrl, publicUrl } = await presignRes.json();
      const headers: Record<string, string> = { 'Content-Type': file.type };
      if (uploadUrl.includes('content-disposition')) headers['Content-Disposition'] = 'attachment';
      await fetch(uploadUrl, { method: 'PUT', headers, body: file });
      await reportPayment(publicUrl); // dekontla birlikte "ödedim" bildir
    } catch {
      toast.error('Yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const isDirect = paymentMode === 'DIRECT';

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
                <h2 className="text-lg font-bold">{isDirect ? 'Satıcıya Havale / EFT Bilgileri' : 'Banka Havale / EFT Bilgileri'}</h2>
              </div>

              {isDirect ? (
                order.sellerIban ? (
                  <div className="space-y-4">
                    <InfoRow label="Hesap Sahibi (Satıcı)" value={order.sellerName || 'Satıcı'} onCopy={copyToClipboard} copied={copied} />
                    <InfoRow label="IBAN" value={order.sellerIban} onCopy={copyToClipboard} copied={copied} />
                    <InfoRow label="Açıklama" value={(order as any).lotCode || `MZT-${order.paymentId?.slice(-8)?.toUpperCase() ?? ''}`} onCopy={copyToClipboard} copied={copied} />
                  </div>
                ) : (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
                    Satıcının IBAN bilgisi tanımlı değil. Lütfen satıcıyla iletişime geçin; ödeme bilgisi paylaşılınca havale yapabilirsiniz.
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  <InfoRow label="Banka" value={bankInfo.bankName || 'Belirtilmedi'} onCopy={copyToClipboard} copied={copied} />
                  <InfoRow label="Hesap Sahibi" value={bankInfo.bankAccountHolder || 'Belirtilmedi'} onCopy={copyToClipboard} copied={copied} />
                  <InfoRow label="IBAN" value={bankInfo.bankIban || 'Belirtilmedi'} onCopy={copyToClipboard} copied={copied} />
                  <InfoRow label="Açıklama" value={(order as any).lotCode || `MZT-${order.paymentId?.slice(-8)?.toUpperCase() ?? ''}`} onCopy={copyToClipboard} copied={copied} />
                </div>
              )}

              <div className="mt-5 rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                <p className="text-xs text-amber-400 font-medium mb-1">⚠️ Önemli</p>
                <ul className="text-xs text-amber-400/80 space-y-1">
                  <li>• Havale/EFT açıklamasına yukarıdaki kodu mutlaka yazın.</li>
                  {isDirect ? (
                    <>
                      <li>• Ödemeyi <b>doğrudan satıcıya</b> yapın. Havale sonrası aşağıdan “Ödemeyi yaptım” deyin veya dekont yükleyin.</li>
                      <li>• Güvenliğiniz için IBAN'ı yalnızca bu sayfadan doğrulayın; e-posta/mesajla gelen farklı IBAN'a ödeme yapmayın.</li>
                    </>
                  ) : (
                    <>
                      <li>• Ödemeniz kontrol edildikten sonra sipariş durumunuz güncellenecektir.</li>
                      <li>• Ödeme onayı 1-2 iş günü içinde yapılmaktadır.</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            {/* DIRECT modda: alıcı ödeme bildirimi + dekont */}
            {isDirect && order.sellerIban && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">Ödeme Bildirimi</h2>
                {order.buyerReportedPaidAt ? (
                  <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-500">
                    ✅ Ödeme bildiriminiz satıcıya iletildi{order.buyerReportedPaidAt ? ` (${formatDate(order.buyerReportedPaidAt)})` : ''}. Satıcı onayı bekleniyor.
                    {order.buyerReceiptUrl && (
                      <a href={order.buyerReceiptUrl} target="_blank" rel="noopener noreferrer" className="ml-2 underline inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Dekontu gör</a>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">Havaleyi yaptıysanız dekontunuzu yükleyin (önerilir) veya dekontsuz “Ödemeyi yaptım” deyin. Satıcıya bildirim gider, satıcı onaylayınca kargo aşamasına geçilir.</p>
                    <div className="flex flex-wrap gap-3">
                      <label className={`inline-flex items-center gap-2 rounded-lg bg-[#d4af37] text-black font-medium px-4 py-2 text-sm cursor-pointer hover:bg-[#c9a431] ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <input type="file" accept="application/pdf,image/*" className="hidden" onChange={e => uploadDekont(e.target.files)} disabled={uploading || reporting} />
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Dekont Yükle
                      </label>
                      <button onClick={() => reportPayment()} disabled={reporting || uploading} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50">
                        {reporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Dekontsuz: Ödemeyi Yaptım
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Firma / Satıcı Bilgileri */}
            {isDirect ? (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">Satıcı</h2>
                <div className="text-sm space-y-1.5">
                  <p><span className="text-muted-foreground">Firma:</span> {order.sellerName || '-'}</p>
                  <p className="text-xs text-muted-foreground">Bu satışta ödeme doğrudan satıcıya yapılır; Mezathane.tr aracı platformdur.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3">Firma Bilgileri</h2>
                <div className="text-sm space-y-1.5">
                  <p><span className="text-muted-foreground">Firma:</span> {bankInfo.bankAccountHolder || 'Mezathane Bilişim Teknolojileri A.Ş.'}</p>
                  <p><span className="text-muted-foreground">Adres:</span> {bankInfo.contactAddress || 'İstanbul, Türkiye'}</p>
                  <p><span className="text-muted-foreground">E-posta:</span> {bankInfo.contactEmail || 'bilgi@mezathane.tr'}</p>
                </div>
              </div>
            )}
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
