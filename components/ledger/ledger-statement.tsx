'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, Download, Mail, Plus, Trash2, Loader2, FileText,
  TrendingUp, TrendingDown, Wallet, CalendarClock, X, CreditCard, Layers,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import InstallmentPanel from './installment-panel';

const money = (n: number) =>
  (n ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' \u20ba';

export type AccountRef = { scope: 'admin' | 'self'; type: 'buyer' | 'seller' | 'platform'; id?: string };

type Row = {
  id: string; date: string; description: string; sub?: string | null;
  borc: number; alacak: number; balance: number;
  category?: string | null; paymentMethod?: string | null; bankName?: string | null;
  lotId?: string | null; lotNumber?: number | null; auctionTitle?: string | null;
  isManual: boolean; manualId?: string | null; isOverdue?: boolean; dueDate?: string | null;
};
type LedgerData = {
  accountType: 'BUYER' | 'SELLER' | 'PLATFORM';
  header: any;
  rows: Row[];
  summary: {
    totalBorc: number; totalAlacak: number; netBalance: number; netAbs: number;
    netKind: 'debt' | 'credit' | 'zero'; netLabel: string;
    soldCount: number; paidAmount: number; pendingAmount: number; overdueAmount: number; overdueCount: number;
  };
};

export default function LedgerStatement({
  dataEndpoint, accountRef, backHref, canEdit = false,
}: { dataEndpoint: string; accountRef: AccountRef; backHref: string; canEdit?: boolean }) {
  const router = useRouter();
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showEntry, setShowEntry] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showInstallments, setShowInstallments] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'paid' | 'completed' | 'shipping_pending' | 'payout_pending'>('all');
  // Dönem ekstresi: boşsa tüm zamanlar. Dönem seçilince öncesi "Devreden bakiye"de toplanır.
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');

  const load = useCallback(async () => {
    try {
      const sep = dataEndpoint.includes('?') ? '&' : '?';
      const range = new URLSearchParams();
      if (periodFrom) range.set('from', periodFrom);
      if (periodTo) range.set('to', periodTo);
      const url = range.toString() ? `${dataEndpoint}${sep}${range}` : dataEndpoint;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      toast.error('Ekstre yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [dataEndpoint, periodFrom, periodTo]);

  useEffect(() => { load(); }, [load]);

  const qs = () => {
    const p = new URLSearchParams({ scope: accountRef.scope, type: accountRef.type });
    if (accountRef.id) p.set('id', accountRef.id);
    if (periodFrom) p.set('from', periodFrom);
    if (periodTo) p.set('to', periodTo);
    return p.toString();
  };

  const downloadPdf = async () => {
    setPdfLoading(true);
    toast.info('PDF hazırlanıyor, lütfen bekleyin...');
    try {
      const res = await fetch(`/api/ledger/pdf?${qs()}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ekstre_${(data?.header?.name || 'hesap').toString().replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('PDF indirildi');
    } catch {
      toast.error('PDF oluşturulamadı');
    } finally {
      setPdfLoading(false);
    }
  };

  const deleteManual = async (manualId: string) => {
    if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/admin/ledger/entry?id=${manualId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Kayıt silindi');
      load();
    } catch {
      toast.error('Kayıt silinemedi');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground mb-6">Ekstre bilgisi bulunamadı.</p>
        <button onClick={() => router.push(backHref)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 hover:bg-muted">
          <ArrowLeft className="h-4 w-4" /> Geri Dön
        </button>
      </div>
    );
  }

  const { header, rows, summary, accountType } = data;
  const isBuyer = accountType === 'BUYER';
  const isSeller = accountType === 'SELLER';

  // Net bakiye rengi & cümlesi
  let netColor = 'text-foreground';
  let netText = summary.netLabel;
  if (isBuyer) {
    if (summary.netKind === 'debt') { netColor = 'text-red-500'; netText = `Bu alıcının ${money(summary.netAbs)} borcu var`; }
    else if (summary.netKind === 'credit') { netColor = 'text-green-500'; netText = `Bu alıcıya ${money(summary.netAbs)} iade/avans borcumuz var`; }
    else { netColor = 'text-muted-foreground'; netText = 'Hesap kapalı — borç yok ✅'; }
  } else if (isSeller) {
    if (summary.netKind === 'debt') { netColor = 'text-amber-400'; netText = `Bu satıcıya ${money(summary.netAbs)} ödenecek`; }
    else if (summary.netKind === 'credit') { netColor = 'text-green-500'; netText = `Bu satıcıdan ${money(summary.netAbs)} alacaklıyız`; }
    else { netColor = 'text-muted-foreground'; netText = 'Hesap kapalı — bakiye yok ✅'; }
  } else {
    netColor = 'text-[#d4af37]';
    netText = `Toplam komisyon geliri: ${money(summary.totalAlacak)}`;
  }

  const selfPossessive = accountRef.scope === 'self';
  if (selfPossessive && isBuyer) {
    if (summary.netKind === 'debt') netText = `${money(summary.netAbs)} ödenmemiş borcunuz var`;
    else if (summary.netKind === 'zero') netText = 'Tüm ödemeleriniz tamam — borcunuz yok ✅';
  }
  if (selfPossessive && isSeller) {
    if (summary.netKind === 'debt') netText = `Size ödenecek ${money(summary.netAbs)} tutarında bakiyeniz var`;
    else if (summary.netKind === 'zero') netText = 'Bekleyen ödemeniz yok ✅';
  }

  // Filtreleme (alıcı ve satıcı cari hesapları için)
  const filteredRows = filterTab !== 'all'
    ? rows.filter(r => {
        if (isBuyer) {
          if (filterTab === 'pending') return r.borc > 0 && !r.isManual;
          if (filterTab === 'paid') return r.alacak > 0;
          if (filterTab === 'completed') return r.borc > 0 && !r.isManual && r.balance <= 0;
        }
        if (isSeller) {
          if (filterTab === 'shipping_pending') return r.category === 'hakedis' && r.alacak > 0;
          if (filterTab === 'payout_pending') return r.category === 'hakedis' && r.alacak > 0;
          if (filterTab === 'paid') return r.category === 'odeme' && r.borc > 0;
          if (filterTab === 'completed') return (r.category === 'hakedis' || r.category === 'odeme') && r.borc > 0;
        }
        return true;
      })
    : rows;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
      {/* Geri butonu + başlık */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          onClick={() => router.push(backHref)}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Geri
        </button>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <button
            onClick={downloadPdf}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-60"
          >
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF İndir
          </button>
          {accountType !== 'PLATFORM' && (
            <button
              onClick={() => setShowEmail(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted transition-colors"
            >
              <Mail className="h-4 w-4" /> E-posta Gönder
            </button>
          )}
          {canEdit && (
            <>
              {isBuyer && (
                <button
                  onClick={() => setShowInstallments(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <Layers className="h-4 w-4" /> Taksit Planı
                </button>
              )}
              <button
                onClick={() => setShowEntry(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] text-black px-3 py-2 text-sm font-semibold hover:brightness-110 transition-all"
              >
                <Plus className="h-4 w-4" /> Elle Kayıt
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hesap başlık kartı */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-5 sm:p-6 mb-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-9 w-9 rounded-full bg-[#d4af37]/15 flex items-center justify-center">
                <Wallet className="h-4.5 w-4.5 text-[#d4af37]" />
              </div>
              <h1 className="text-xl font-bold">{header.name || 'Hesap'}</h1>
              {header.isActive === false && (
                <span className="text-xs bg-red-500/15 text-red-500 px-2 py-0.5 rounded-full">Engelli</span>
              )}
            </div>
            <div className="text-sm text-muted-foreground space-y-0.5 mt-2">
              {header.contactName && <p>Yetkili: {header.contactName}</p>}
              {header.email && <p>{header.email}</p>}
              {header.phone && <p>{header.phone}</p>}
              {(header.taxOffice || header.taxNumber) && <p>Vergi: {header.taxOffice} {header.taxNumber}</p>}
              {header.iban && <p className="font-mono text-xs">{header.iban}</p>}
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {accountType === 'BUYER' ? 'Alıcı Cari Ekstresi' : accountType === 'SELLER' ? 'Satıcı Cari Ekstresi' : 'Platform Komisyon Ekstresi'}
          </div>
        </div>
      </motion.div>

      {/* BÜYÜK NET BAKİYE */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-gradient-to-br from-black to-zinc-900 p-6 sm:p-8 mb-4 text-center"
      >
        <p className="text-xs uppercase tracking-widest text-[#d4af37] mb-2">Net Bakiye</p>
        <p className={`text-3xl sm:text-4xl font-bold font-mono ${netColor}`}>{money(summary.netAbs)}</p>
        <p className="text-sm text-muted-foreground mt-2">{netText}</p>
      </motion.div>

      {/* Özet kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <SummaryCard icon={<TrendingUp className="h-4 w-4" />} label="Toplam Borç" value={money(summary.totalBorc)} color="text-red-500" />
        <SummaryCard icon={<TrendingDown className="h-4 w-4" />} label="Toplam Alacak" value={money(summary.totalAlacak)} color="text-green-500" />
        {accountType !== 'PLATFORM' ? (
          <>
            <SummaryCard icon={<CreditCard className="h-4 w-4" />} label={isSeller ? 'Ödenen' : 'Tahsil Edilen'} value={money(summary.paidAmount)} color="text-purple-400" />
            <SummaryCard icon={<CalendarClock className="h-4 w-4" />} label={isSeller ? 'Bekleyen Ödeme' : 'Bekleyen Borç'} value={money(summary.pendingAmount)} color="text-amber-400" />
          </>
        ) : (
          <>
            <SummaryCard icon={<CreditCard className="h-4 w-4" />} label="Tahsil Edilen" value={money(summary.paidAmount)} color="text-green-500" />
            <SummaryCard icon={<CalendarClock className="h-4 w-4" />} label="Bekleyen" value={money(summary.pendingAmount)} color="text-amber-400" />
          </>
        )}
      </div>

      {isBuyer && summary.overdueCount > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 mb-6 text-sm text-red-400 flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          {summary.overdueCount} adet gecikmiş ödeme — toplam {money(summary.overdueAmount)}
        </div>
      )}

      {/* FİLTRE SEKMELERİ — Alıcı */}
      {isBuyer && (
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: 'all' as const, label: 'Tümü', count: rows.length },
            { key: 'pending' as const, label: 'Ödeme Bekleyenler', count: rows.filter(r => r.borc > 0 && !r.isManual && r.balance > 0).length },
            { key: 'paid' as const, label: 'Ödemesi Yapılanlar', count: rows.filter(r => r.alacak > 0).length },
            { key: 'completed' as const, label: 'Tamamlanan', count: rows.filter(r => r.borc > 0 && !r.isManual && r.balance <= 0).length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                filterTab === tab.key
                  ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37]'
                  : 'border-border text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* FİLTRE SEKMELERİ — Satıcı */}
      {isSeller && (
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: 'all' as const, label: 'Tümü', count: rows.length },
            { key: 'shipping_pending' as const, label: 'Gönderim Bekleyenler', count: rows.filter(r => r.category === 'hakedis' && r.alacak > 0).length, color: 'amber' },
            { key: 'payout_pending' as const, label: 'Ödeme Bekleyenler', count: rows.filter(r => r.category === 'hakedis' && r.alacak > 0).length, color: 'purple' },
            { key: 'paid' as const, label: 'Ödemesi Yapılanlar', count: rows.filter(r => r.category === 'odeme' && r.borc > 0).length, color: 'green' },
            { key: 'completed' as const, label: 'Tamamlanan', count: rows.filter(r => (r.category === 'hakedis' || r.category === 'odeme') && r.borc > 0).length, color: 'green' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                filterTab === tab.key
                  ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37]'
                  : 'border-border text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* EKSTRE TABLOSU */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-2">
          <FileText className="h-4 w-4 text-[#d4af37]" />
          <h2 className="font-semibold">Cari Ekstre</h2>
          <span className="text-xs text-muted-foreground">({filteredRows.length} hareket)</span>

          {/* Dönem seçimi — boşsa tüm zamanlar */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Dönem:</span>
            <input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)}
              className="rounded-lg bg-muted border border-border px-2 py-1 text-xs" />
            <span className="text-xs text-muted-foreground">–</span>
            <input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)}
              className="rounded-lg bg-muted border border-border px-2 py-1 text-xs" />
            {(periodFrom || periodTo) && (
              <button onClick={() => { setPeriodFrom(''); setPeriodTo(''); }}
                className="rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted">
                Tümü
              </button>
            )}
          </div>
        </div>
        {(periodFrom || periodTo) && (
          <div className="px-4 py-2 bg-[#d4af37]/5 border-b border-border text-xs text-muted-foreground">
            Dönem ekstresi gösteriliyor. Seçilen tarihten önceki hareketler
            <strong className="text-foreground"> &quot;Devreden bakiye&quot;</strong> satırında toplandı; sondaki bakiye hesabın güncel bakiyesidir.
            İndirilen PDF ve gönderilen e-posta da bu dönemi kapsar.
          </div>
        )}
        {filteredRows.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            {filterTab !== 'all' ? 'Bu kategoride hareket yok.' : 'Henüz hareket yok.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-xs text-muted-foreground">
                  <th className="text-left font-medium px-4 py-2.5 whitespace-nowrap">Tarih</th>
                  <th className="text-left font-medium px-4 py-2.5">Açıklama</th>
                  <th className="text-right font-medium px-4 py-2.5 whitespace-nowrap">Borç</th>
                  <th className="text-right font-medium px-4 py-2.5 whitespace-nowrap">Alacak</th>
                  <th className="text-right font-medium px-4 py-2.5 whitespace-nowrap">Bakiye</th>
                  {canEdit && <th className="px-2"></th>}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.id} className={`border-t border-border/60 ${r.isOverdue ? 'bg-red-500/5' : ''}`}>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(r.date)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {r.lotId ? (
                          <Link href={`/lot/${r.lotId}`} className="hover:text-[#d4af37] transition-colors">{r.description}</Link>
                        ) : r.description}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {r.sub && <span className="text-xs text-muted-foreground">{r.sub}</span>}
                        {r.bankName && <span className="text-xs text-muted-foreground">· {r.bankName}</span>}
                        {typeof r.lotNumber === 'number' && r.lotId && (
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Lot #{r.lotNumber}</span>
                        )}
                        {r.isManual && <span className="text-[10px] bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded">Elle</span>}
                        {r.isOverdue && <span className="text-[10px] bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded">Gecikmiş</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-red-500">{r.borc ? money(r.borc) : ''}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-500">{r.alacak ? money(r.alacak) : ''}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${r.balance > 0 ? 'text-red-500' : r.balance < 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {money(Math.abs(r.balance))} <span className="text-[10px] font-normal">{r.balance > 0 ? 'B' : r.balance < 0 ? 'A' : ''}</span>
                    </td>
                    {canEdit && (
                      <td className="px-2">
                        {r.isManual && r.manualId && (
                          <button onClick={() => deleteManual(r.manualId!)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500" title="Sil">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                  <td className="px-4 py-3" colSpan={2}>TOPLAM</td>
                  <td className="px-4 py-3 text-right font-mono text-red-500">{money(summary.totalBorc)}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-500">{money(summary.totalAlacak)}</td>
                  <td className="px-4 py-3 text-right font-mono">{money(summary.netAbs)} <span className="text-[10px] font-normal">{summary.netBalance > 0 ? 'B' : summary.netBalance < 0 ? 'A' : ''}</span></td>
                  {canEdit && <td></td>}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        B = Borç bakiyesi, A = Alacak bakiyesi. Bu ekstre otomatik oluşturulur; elle eklenen kayıtlar “Elle” etiketiyle gösterilir.
      </p>

      {showEntry && canEdit && (
        <ManualEntryModal accountRef={accountRef} onClose={() => setShowEntry(false)} onSaved={() => { setShowEntry(false); load(); }} />
      )}
      {showEmail && (
        <EmailModal accountRef={accountRef} defaultEmail={header.email || ''} onClose={() => setShowEmail(false)} periodFrom={periodFrom} periodTo={periodTo} />
      )}
      {showInstallments && canEdit && isBuyer && accountRef.id && (
        <InstallmentPanel userId={accountRef.id} onClose={() => setShowInstallments(false)} onChanged={load} />
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">{icon}{label}</div>
      <p className={`text-base sm:text-lg font-bold font-mono ${color}`}>{value}</p>
    </div>
  );
}

// ---------- Elle kayıt modal ----------
function ManualEntryModal({ accountRef, onClose, onSaved }: { accountRef: AccountRef; onClose: () => void; onSaved: () => void }) {
  const [entryType, setEntryType] = useState<'DEBIT' | 'CREDIT'>('CREDIT');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('tahsilat');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [bankName, setBankName] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const accountTypeUpper = accountRef.type.toUpperCase();

  const submit = async () => {
    if (!amount || parseFloat(amount) <= 0) { toast.error('Geçerli tutar giriniz'); return; }
    if (!description.trim()) { toast.error('Açıklama giriniz'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/ledger/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType: accountTypeUpper,
          ownerId: accountRef.id ?? null,
          entryType, amount, description, category,
          paymentMethod: paymentMethod || null, bankName: bankName || null,
          entryDate,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      toast.success('Kayıt eklendi');
      onSaved();
    } catch (e: any) {
      toast.error(e.message || 'Kayıt eklenemedi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Elle Cari Kaydı Ekle</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setEntryType('CREDIT')} className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${entryType === 'CREDIT' ? 'bg-green-500/15 border-green-500 text-green-400' : 'border-border text-muted-foreground'}`}>Alacak (ödeme/tahsilat)</button>
            <button onClick={() => setEntryType('DEBIT')} className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${entryType === 'DEBIT' ? 'bg-red-500/15 border-red-500 text-red-400' : 'border-border text-muted-foreground'}`}>Borç (ek tutar)</button>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tutar (₺)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Açıklama</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ör: Havale ile kısmi ödeme" className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Kategori</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm">
                <option value="tahsilat">Tahsilat</option>
                <option value="odeme">Ödeme</option>
                <option value="iade">İade</option>
                <option value="kesinti">Kesinti</option>
                <option value="avans">Avans</option>
                <option value="kargo">Kargo</option>
                <option value="duzeltme">Düzeltme</option>
                <option value="diger">Diğer</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tarih</label>
              <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Ödeme Yöntemi</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm">
                <option value="">Belirtilmedi</option>
                <option value="Havale">Havale</option>
                <option value="EFT">EFT</option>
                <option value="Elden">Elden</option>
                <option value="Kredi Kartı">Kredi Kartı</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Banka (ops.)</label>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ör: Ziraat" className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={submit} disabled={saving} className="w-full mt-2 rounded-lg bg-[#d4af37] text-black py-2.5 font-semibold hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Kaydet
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------- E-posta modal ----------
function EmailModal({ accountRef, defaultEmail, onClose, periodFrom, periodTo }: { accountRef: AccountRef; defaultEmail: string; onClose: () => void; periodFrom?: string; periodTo?: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [sending, setSending] = useState(false);
  const send = async () => {
    if (!email.trim()) { toast.error('E-posta adresi giriniz'); return; }
    setSending(true);
    try {
      const res = await fetch('/api/ledger/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: accountRef.scope, type: accountRef.type, id: accountRef.id, recipientEmail: email, periodFrom: periodFrom || undefined, periodTo: periodTo || undefined }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      toast.success('Ekstre e-posta ile gönderildi');
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Gönderilemedi');
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Ekstreyi E-posta ile Gönder</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="h-5 w-5" /></button>
        </div>
        <label className="text-xs text-muted-foreground">Alıcı e-posta adresi</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@eposta.com" className="w-full mt-1 mb-4 rounded-lg bg-background border border-border px-3 py-2 text-sm" />
        <button onClick={send} disabled={sending} className="w-full rounded-lg bg-[#d4af37] text-black py-2.5 font-semibold hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Gönder
        </button>
      </motion.div>
    </div>
  );
}
