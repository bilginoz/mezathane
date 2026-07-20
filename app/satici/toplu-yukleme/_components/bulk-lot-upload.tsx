'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, Upload, Download, FileText, CheckCircle, XCircle,
  AlertTriangle, Loader2,
} from 'lucide-react';

export function BulkLotUpload() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuction, setSelectedAuction] = useState(searchParams.get('auctionId') ?? '');
  const [csvContent, setCsvContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: { row: number; message: string }[]; total: number } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated') {
      fetch('/api/seller/dashboard')
        .then(r => r.json())
        .then(d => {
          if (d?.error) { router.replace('/satici'); return; }
          // Only show auctions that can have lots added
          const eligible = (d?.recentAuctions ?? []).filter((a: any) => ['DRAFT', 'SCHEDULED', 'ACTIVE'].includes(a.status));
          setAuctions(eligible);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast.error('Lütfen CSV dosyası seçin');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsvContent(ev.target?.result as string ?? '');
      setResult(null);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDownloadTemplate = () => {
    window.location.href = '/api/seller/bulk-lots';
  };

  const handleImport = async () => {
    if (!selectedAuction) { toast.error('Lütfen müzayede seçin'); return; }
    if (!csvContent) { toast.error('Lütfen CSV dosyası yükleyin'); return; }
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch('/api/seller/bulk-lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionId: selectedAuction, csvContent }),
      });
      const data = await res.json();
      if (data?.success) {
        setResult({ imported: data.imported, errors: data.errors, total: data.total });
        if (data.imported > 0) toast.success(`${data.imported} lot başarıyla eklendi`);
        if (data.errors?.length > 0) toast.warning(`${data.errors.length} satırda hata var`);
      } else {
        toast.error(data?.error ?? 'İçe aktarma başarısız');
      }
    } catch { toast.error('Bağlantı hatası'); }
    finally { setImporting(false); }
  };

  if (status === 'loading' || loading) {
    return (
      <main className="flex-1 py-8"><div className="mx-auto max-w-[800px] px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-40 bg-muted rounded-xl" />
        </div>
      </div></main>
    );
  }

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[800px] px-4">
        <Link href="/satici" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Satıcı Paneline Dön
        </Link>

        <h1 className="font-display text-2xl font-bold mb-2">Toplu Lot Yükleme</h1>
        <p className="text-sm text-muted-foreground mb-6">
          CSV dosyası ile bir müzayedeye birden fazla lot ekleyin. Bir müzayedede en fazla 30 lot olabilir.
        </p>

        {/* Step 1: Template */}
        <div className="rounded-xl border border-border bg-card p-6 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-[#d4af37]/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-[#d4af37]">1</span>
            </div>
            <div>
              <h2 className="font-semibold text-sm">Şablonu İndirin</h2>
              <p className="text-xs text-muted-foreground mt-0.5">CSV dosyasını bu şablona uygun olarak hazırlayın</p>
            </div>
          </div>
          <button onClick={handleDownloadTemplate}
            className="flex items-center gap-2 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/5 px-4 py-2 text-sm text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors">
            <Download className="h-4 w-4" /> Şablonu İndir (CSV)
          </button>
          <div className="mt-3 text-[10px] text-muted-foreground space-y-0.5">
            <p><strong>Sütunlar:</strong> Lot Adı; Açıklama; Notlar; Kategori; Başlangıç Fiyatı; Tahmini Fiyat; Görsel URL</p>
            <p><strong>Ayırıcı:</strong> Noktalı virgül (;) veya virgül (,)</p>
            <p><strong>Kodlama:</strong> UTF-8 (Türkçe karakter desteği)</p>
          </div>
        </div>

        {/* Step 2: Select Auction */}
        <div className="rounded-xl border border-border bg-card p-6 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-[#d4af37]/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-[#d4af37]">2</span>
            </div>
            <div>
              <h2 className="font-semibold text-sm">Müzayede Seçin</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Lotların ekleneceği müzayedeyi belirleyin</p>
            </div>
          </div>
          <select value={selectedAuction} onChange={e => setSelectedAuction(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-[#d4af37] focus:outline-none">
            <option value="">Müzayede seçin...</option>
            {auctions.map((a: any) => (
              <option key={a.id} value={a.id}>{a.title} — {a.status} ({a._count?.lots ?? 0} lot)</option>
            ))}
          </select>
          {auctions.length === 0 && (
            <p className="text-xs text-amber-400 mt-2">Lot eklenebilecek müzayede bulunamadı. Önce bir müzayede oluşturun.</p>
          )}
        </div>

        {/* Step 3: Upload CSV */}
        <div className="rounded-xl border border-border bg-card p-6 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-[#d4af37]/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-[#d4af37]">3</span>
            </div>
            <div>
              <h2 className="font-semibold text-sm">CSV Dosyasını Yükleyin</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Hazırladığınız CSV dosyasını seçin</p>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileSelect} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-border py-8 text-center hover:border-[#d4af37]/50 hover:bg-[#d4af37]/5 transition-colors">
            {fileName ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-[#d4af37]" />
                <span className="text-sm font-medium">{fileName}</span>
                <span className="text-xs text-muted-foreground">(Değiştirmek için tıklayın)</span>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">CSV dosyasını yüklemek için tıklayın</p>
              </div>
            )}
          </button>
        </div>

        {/* Import Button */}
        <button onClick={handleImport} disabled={importing || !selectedAuction || !csvContent}
          className="w-full rounded-xl bg-[#d4af37] py-3 text-sm font-bold text-black hover:bg-[#c9a430] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
          {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> İçe Aktarılıyor...</> : <><Upload className="h-4 w-4" /> Lotları İçe Aktar</>}
        </button>

        {/* Results */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-6 mt-6">
            <h3 className="font-semibold mb-3">İçe Aktarma Sonucu</h3>
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-mono">{result.imported} başarılı</span>
              </div>
              {result.errors.length > 0 && (
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm font-mono">{result.errors.length} hata</span>
                </div>
              )}
              <div className="text-sm text-muted-foreground">Toplam: {result.total} satır</div>
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-red-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Hatalar:</p>
                {result.errors.map((err, i) => (
                  <div key={i} className="text-xs bg-red-500/5 border border-red-500/20 rounded-lg p-2">
                    <span className="font-mono text-red-400">Satır {err.row}:</span> {err.message}
                  </div>
                ))}
              </div>
            )}
            {result.imported > 0 && (
              <Link href={`/satici/muzayede/${selectedAuction}`}
                className="inline-flex items-center gap-2 mt-4 text-sm text-[#d4af37] hover:underline">
                Müzayedeyi görüntüle →
              </Link>
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}
