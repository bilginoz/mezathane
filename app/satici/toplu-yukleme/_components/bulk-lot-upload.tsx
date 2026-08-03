'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';
import {
  ArrowLeft, Upload, Download, FileText, CheckCircle, XCircle,
  AlertTriangle, Loader2, Image as ImageIcon, X,
} from 'lucide-react';
import { parseCSV } from '@/lib/parse-csv';
import { compressImage } from '@/lib/compress-image';

// Sütun sırası şablonla (ve API'nin eski csvContent yoluyla) birebir aynı.
const COL = {
  title: 0, description: 1, notes: 2, category: 3, startingPrice: 4, estimatedPrice: 5,
  imageUrl: 6, condition: 7, provenance: 8, customBidIncrement: 9, kdvRate: 10,
  shippingType: 11, estimatedShipping: 12, restorationNote: 13, imageFileNames: 14,
};

// Dosya adı eşleştirmesi büyük/küçük harf ve uzantıdan bağımsız çalışır.
function normalizeFileName(name: string): string {
  return name.trim().toLowerCase().replace(/\.[a-z0-9]+$/i, '');
}

export function BulkLotUpload() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuction, setSelectedAuction] = useState(searchParams.get('auctionId') ?? '');

  const [templateFileName, setTemplateFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<string[][]>([]); // sadece veri satırları, başlık hariç
  const [parseError, setParseError] = useState('');

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [result, setResult] = useState<{ imported: number; errors: { row: number; message: string }[]; total: number } | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated') {
      fetch('/api/seller/dashboard')
        .then(r => r.json())
        .then(d => {
          if (d?.error) { router.replace('/satici'); return; }
          const eligible = (d?.recentAuctions ?? []).filter((a: any) => ['DRAFT', 'SCHEDULED', 'ACTIVE'].includes(a.status));
          setAuctions(eligible);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  const handleDownloadTemplate = () => {
    window.location.href = '/api/seller/bulk-lots';
  };

  const handleTemplateSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError('');
    setResult(null);
    setTemplateFileName(file.name);
    try {
      const isExcel = /\.xlsx?$/i.test(file.name);
      let rows: string[][];
      if (isExcel) {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const sheet = workbook.worksheets[0];
        const all: string[][] = [];
        sheet.eachRow((row) => {
          const cells: string[] = [];
          // row.values 1-indeksli, index 0 boş — atlıyoruz.
          const values = row.values as any[];
          for (let i = 1; i < values.length; i++) {
            const v = values[i];
            cells[i - 1] = v == null ? '' : String(v).trim();
          }
          all.push(cells);
        });
        rows = all.slice(1).filter((r) => r.some((c) => c !== '')); // başlık satırını at
      } else if (/\.(csv|txt)$/i.test(file.name)) {
        const text = await file.text();
        const all = parseCSV(text);
        rows = all.slice(1); // başlık satırını at
      } else {
        toast.error('Lütfen .xlsx, .csv veya .txt dosyası seçin');
        return;
      }
      if (rows.length === 0) {
        setParseError('Dosyada veri satırı bulunamadı');
        return;
      }
      setParsedRows(rows);
    } catch (err) {
      console.error(err);
      setParseError('Dosya okunamadı — şablonu bozmadan doldurduğunuzdan emin olun');
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setPhotoFiles((prev) => [...prev, ...files]);
  };

  const removePhoto = (idx: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // Fotoğraf eşleştirme önizlemesi — içe aktarmadan ÖNCE satıcının hatayı görebilmesi için.
  const matchPreview = useMemo(() => {
    const photoMap = new Map<string, File>();
    for (const f of photoFiles) photoMap.set(normalizeFileName(f.name), f);
    const usedNames = new Set<string>();
    const rowResults = parsedRows.map((row, i) => {
      const requested = (row[COL.imageFileNames] || '').split(',').map((s) => s.trim()).filter(Boolean);
      const matched: string[] = [];
      const unmatched: string[] = [];
      for (const name of requested) {
        const norm = normalizeFileName(name);
        if (photoMap.has(norm)) { matched.push(name); usedNames.add(norm); }
        else unmatched.push(name);
      }
      return { rowIndex: i, title: row[COL.title] || `(satır ${i + 2})`, requested: requested.length, matched: matched.length, unmatched };
    });
    const unusedFiles = photoFiles.filter((f) => !usedNames.has(normalizeFileName(f.name)));
    const totalUnmatched = rowResults.reduce((s, r) => s + r.unmatched.length, 0);
    return { rowResults, unusedFiles, totalUnmatched, photoMap };
  }, [parsedRows, photoFiles]);

  const handleImport = async () => {
    if (!selectedAuction) { toast.error('Lütfen müzayede seçin'); return; }
    if (parsedRows.length === 0) { toast.error('Lütfen doldurduğunuz şablonu yükleyin'); return; }
    setImporting(true);
    setResult(null);
    try {
      // 1) Eşleşen fotoğrafları yükle (sıkıştır + R2'ye presigned URL ile) — yalnızca en az
      // bir satırda kullanılan dosyalar yüklenir, tekrarlar tek sefer yüklenir.
      const neededNames = new Set<string>();
      matchPreview.rowResults.forEach((r, i) => {
        const requested = (parsedRows[i][COL.imageFileNames] || '').split(',').map((s) => s.trim()).filter(Boolean);
        requested.forEach((n) => { if (matchPreview.photoMap.has(normalizeFileName(n))) neededNames.add(normalizeFileName(n)); });
      });

      const urlMap = new Map<string, string>(); // normalizedName -> R2 URL
      let uploadedCount = 0;
      const neededArr = Array.from(neededNames);
      for (const norm of neededArr) {
        const file = matchPreview.photoMap.get(norm)!;
        setImportStatus(`Fotoğraf yükleniyor... (${uploadedCount + 1}/${neededArr.length})`);
        try {
          const { blob: compressed, type: compressedType } = await compressImage(file);
          const ext = compressedType === 'image/webp' ? 'webp' : 'jpg';
          const fileName = `lots/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const presignRes = await fetch('/api/upload/presigned', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName, contentType: compressedType, isPublic: true }),
          });
          if (!presignRes.ok) throw new Error('presign failed');
          const { uploadUrl, publicUrl } = await presignRes.json();
          const headers: Record<string, string> = { 'Content-Type': compressedType };
          if (uploadUrl.includes('content-disposition')) headers['Content-Disposition'] = 'attachment';
          await fetch(uploadUrl, { method: 'PUT', headers, body: compressed });
          urlMap.set(norm, publicUrl);
        } catch {
          toast.error(`${file.name} yüklenemedi, o lotta bu resim atlanacak`);
        }
        uploadedCount++;
      }
      setImportStatus('Lotlar oluşturuluyor...');

      // 2) Her satır için nihai görsel listesini kur: önce eski "Görsel URL" sütunu (varsa),
      // sonra dosya adı eşleşen yeni yüklenen resimler — toplamda en fazla 6.
      const lots = parsedRows.map((row) => {
        const legacyUrls = (row[COL.imageUrl] || '').split('|').map((s) => s.trim()).filter(Boolean);
        const requestedNames = (row[COL.imageFileNames] || '').split(',').map((s) => s.trim()).filter(Boolean);
        const matchedUrls = requestedNames
          .map((n) => urlMap.get(normalizeFileName(n)))
          .filter((u): u is string => !!u);
        const imageUrls = [...legacyUrls, ...matchedUrls].slice(0, 6);
        return {
          title: row[COL.title] || '',
          description: row[COL.description] || null,
          notes: row[COL.notes] || null,
          categoryName: row[COL.category] || '',
          startingPrice: row[COL.startingPrice] || '',
          estimatedPrice: row[COL.estimatedPrice] || null,
          imageUrls,
          condition: row[COL.condition] || null,
          provenance: row[COL.provenance] || null,
          customBidIncrement: row[COL.customBidIncrement] || null,
          kdvRate: row[COL.kdvRate] || null,
          shippingType: row[COL.shippingType] || null,
          estimatedShipping: row[COL.estimatedShipping] || null,
          restorationNote: row[COL.restorationNote] || null,
        };
      });

      const res = await fetch('/api/seller/bulk-lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auctionId: selectedAuction, lots }),
      });
      const data = await res.json();
      if (data?.success) {
        setResult({ imported: data.imported, errors: data.errors, total: data.total });
        if (data.imported > 0) toast.success(`${data.imported} lot başarıyla eklendi`);
        if (data.errors?.length > 0) toast.warning(`${data.errors.length} satırda hata var`);
      } else {
        toast.error(data?.error ?? 'İçe aktarma başarısız');
      }
    } catch {
      toast.error('Bağlantı hatası');
    } finally {
      setImporting(false);
      setImportStatus('');
    }
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
          Excel/CSV şablonu ile bir müzayedeye birden fazla lot ekleyin. Bir müzayedede en fazla 30 lot olabilir.
        </p>

        {/* Step 1: Template */}
        <div className="rounded-xl border border-border bg-card p-6 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-[#d4af37]/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-[#d4af37]">1</span>
            </div>
            <div>
              <h2 className="font-semibold text-sm">Şablonu İndirin</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Excel dosyasını bu şablona uygun olarak doldurun</p>
            </div>
          </div>
          <button onClick={handleDownloadTemplate}
            className="flex items-center gap-2 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/5 px-4 py-2 text-sm text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors">
            <Download className="h-4 w-4" /> Şablonu İndir (Excel)
          </button>
          <div className="mt-3 text-[10px] text-muted-foreground space-y-0.5">
            <p><strong>Görsel Dosya Adları</strong> sütununa, biraz sonra yükleyeceğiniz fotoğrafların adını virgülle ayırarak yazın (ör. "vazo1, vazo2"). <strong>Her lot için yazdığınız isimler kendine özel olmalı</strong> — başka bir lotla aynı isim kullanmayın.</p>
            <p>Büyük/küçük harf ve dosya uzantısı (.jpg/.png) önemli değil, eşleştirme otomatik yapılır.</p>
            <p><strong>Son 8 sütun isteğe bağlıdır.</strong> Durum için önerilen değerler: Mükemmel, Çok İyi, İyi, Orta, Restore Edilmiş. KDV Oranı: 20, 10 veya 1 (boşsa %20). Kargo Tipi: "Alıcı Öder" veya "Ücretsiz". Min. Artış Tutarı boş bırakılırsa fiyata göre otomatik hesaplanır.</p>
            <p><strong>Eski CSV dosyalarınız da çalışmaya devam eder</strong> (Görsel URL sütununa link yapıştırma yöntemi hâlâ destekleniyor).</p>
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

        {/* Step 3: Upload filled template */}
        <div className="rounded-xl border border-border bg-card p-6 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-[#d4af37]/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-[#d4af37]">3</span>
            </div>
            <div>
              <h2 className="font-semibold text-sm">Doldurduğunuz Dosyayı Yükleyin</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Excel (.xlsx) veya CSV dosyanızı seçin</p>
            </div>
          </div>
          <input ref={templateInputRef} type="file" accept=".xlsx,.csv,.txt" onChange={handleTemplateSelect} className="hidden" />
          <button onClick={() => templateInputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-border py-8 text-center hover:border-[#d4af37]/50 hover:bg-[#d4af37]/5 transition-colors">
            {templateFileName ? (
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5 text-[#d4af37]" />
                <span className="text-sm font-medium">{templateFileName}</span>
                <span className="text-xs text-muted-foreground">({parsedRows.length} satır — değiştirmek için tıklayın)</span>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Dosyayı yüklemek için tıklayın</p>
              </div>
            )}
          </button>
          {parseError && <p className="text-xs text-red-400 mt-2">{parseError}</p>}
        </div>

        {/* Step 4: Upload photos */}
        <div className="rounded-xl border border-border bg-card p-6 mb-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-[#d4af37]/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-[#d4af37]">4</span>
            </div>
            <div>
              <h2 className="font-semibold text-sm">Fotoğrafları Yükleyin (isteğe bağlı)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Şablonda "Görsel Dosya Adları" sütununa yazdığınız fotoğrafları buradan seçin — birden fazla dosyayı aynı anda seçebilirsiniz</p>
            </div>
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoSelect} className="hidden" />
          <button onClick={() => photoInputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-border py-6 text-center hover:border-[#d4af37]/50 hover:bg-[#d4af37]/5 transition-colors mb-3">
            <ImageIcon className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Fotoğrafları seçmek için tıklayın</p>
          </button>
          {photoFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photoFiles.map((f, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs">
                  {f.name}
                  <button onClick={() => removePhoto(i)} className="text-muted-foreground hover:text-red-400"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}

          {/* Eşleştirme önizlemesi */}
          {parsedRows.length > 0 && (photoFiles.length > 0 || matchPreview.totalUnmatched > 0) && (
            <div className="mt-4 rounded-lg bg-muted/30 p-3 text-xs space-y-1">
              {matchPreview.rowResults.filter((r) => r.unmatched.length > 0).map((r) => (
                <p key={r.rowIndex} className="text-amber-400">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  "{r.title}": eşleşmeyen dosya adı — {r.unmatched.join(', ')}
                </p>
              ))}
              {matchPreview.unusedFiles.length > 0 && (
                <p className="text-muted-foreground">
                  Kullanılmayan fotoğraflar (hiçbir satırda geçmiyor): {matchPreview.unusedFiles.map((f) => f.name).join(', ')}
                </p>
              )}
              {matchPreview.totalUnmatched === 0 && matchPreview.unusedFiles.length === 0 && photoFiles.length > 0 && (
                <p className="text-green-400"><CheckCircle className="h-3 w-3 inline mr-1" /> Tüm fotoğraflar eşleşti</p>
              )}
            </div>
          )}
        </div>

        {/* Import Button */}
        <button onClick={handleImport} disabled={importing || !selectedAuction || parsedRows.length === 0}
          className="w-full rounded-xl bg-[#d4af37] py-3 text-sm font-bold text-black hover:bg-[#c9a430] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
          {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> {importStatus || 'İçe Aktarılıyor...'}</> : <><Upload className="h-4 w-4" /> Lotları İçe Aktar</>}
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
