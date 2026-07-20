'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Gavel, Layers, TrendingUp, BarChart3, Plus, Settings,
  Calendar, Clock, Edit, ArrowRight, Store, Wallet, Package, AlertCircle,
  Upload, FileText, PieChart, ArrowLeft, MessageCircle, BookOpen, Send, Loader2, Info, Paperclip, X, Trash2,
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export function SellerDashboard() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateAuction, setShowCreateAuction] = useState(false);
  const [auctionForm, setAuctionForm] = useState({
    title: '', description: '', startDate: '', endDate: '', liveDate: '',
    waitingTime: 20, fairWaitingTime: 5, liveDelayMinutes: 30, paymentDays: 5,
    liveOnly: false,
  });
  const [livePreset, setLivePreset] = useState<'fast' | 'normal' | 'relaxed' | 'custom'>('normal');
  const [creating, setCreating] = useState(false);
  // INFO_REQUESTED yanıt state
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseFiles, setResponseFiles] = useState<{ label: string; file: File }[]>([]);
  const [respondingLoading, setRespondingLoading] = useState(false);
  const [newDocLabel, setNewDocLabel] = useState('');

  const LIVE_PRESETS = {
    fast:    { label: '⚡ Hızlı',   desc: '10 sn lot, 5 sn uzatma, hemen başlar',      waitingTime: 10, fairWaitingTime: 5,  liveDelayMinutes: 0 },
    normal:  { label: '⏱️ Normal',  desc: '20 sn lot, 5 sn uzatma, 30 dk sonra başlar', waitingTime: 20, fairWaitingTime: 5,  liveDelayMinutes: 30 },
    relaxed: { label: '🐢 Rahat',   desc: '20 sn lot, 10 sn uzatma, 30 dk sonra başlar', waitingTime: 20, fairWaitingTime: 10, liveDelayMinutes: 30 },
    custom:  { label: '🛠️ Özel',    desc: 'Kendi ayarlarınızı belirleyin',               waitingTime: 20, fairWaitingTime: 5,  liveDelayMinutes: 30 },
  } as const;

  const applyPreset = (key: 'fast' | 'normal' | 'relaxed' | 'custom') => {
    setLivePreset(key);
    if (key !== 'custom') {
      const p = LIVE_PRESETS[key];
      setAuctionForm(prev => ({ ...prev, waitingTime: p.waitingTime, fairWaitingTime: p.fairWaitingTime, liveDelayMinutes: p.liveDelayMinutes }));
    }
  };

  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated') {
      if (user?.role !== 'SELLER' && user?.role !== 'ADMIN') {
        router.replace('/satici-basvuru');
        return;
      }
      fetch('/api/seller/dashboard')
        .then(r => r.json())
        .then(d => { if (d?.error) { router.replace('/satici-basvuru'); } else { setData(d); } })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [status, router, user?.role]);

  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (auctionForm.liveOnly) {
      if (!auctionForm.title || !auctionForm.liveDate) {
        toast.error('Başlık ve canlı müzayede tarihi zorunlu');
        return;
      }
    } else {
      if (!auctionForm.title || !auctionForm.startDate || !auctionForm.endDate) {
        toast.error('Başlık, başlangıç ve bitiş tarihi zorunlu');
        return;
      }
    }
    setCreating(true);
    try {
      let liveStart: string;
      let startDate: string;
      let endDate: string | null;

      if (auctionForm.liveOnly) {
        // Sadece canlı: startDate = liveDate, endDate yok
        liveStart = new Date(auctionForm.liveDate).toISOString();
        startDate = liveStart;
        endDate = null;
      } else {
        // Standart: endDate + gecikme
        const endDateObj = new Date(auctionForm.endDate);
        const delayMs = (auctionForm.liveDelayMinutes ?? 30) * 60 * 1000;
        liveStart = new Date(endDateObj.getTime() + delayMs).toISOString();
        startDate = new Date(auctionForm.startDate).toISOString();
        endDate = endDateObj.toISOString();
      }

      const res = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: auctionForm.title,
          description: auctionForm.description,
          startDate,
          endDate,
          liveStartDate: liveStart,
          liveOnly: auctionForm.liveOnly,
          liveDelayMinutes: auctionForm.liveDelayMinutes,
          waitingTime: auctionForm.waitingTime,
          fairWaitingTime: auctionForm.fairWaitingTime,
          paymentDays: auctionForm.paymentDays,
          status: 'DRAFT',
        }),
      });
      const result = await res.json();
      if (result?.auction) {
        toast.success('Müzayede oluşturuldu!');
        setShowCreateAuction(false);
        // Refresh
        const d = await fetch('/api/seller/dashboard').then(r => r.json());
        setData(d);
      } else {
        toast.error(result?.error ?? 'Hata oluştu');
      }
    } catch {
      toast.error('Müzayede oluşturulamadı');
    } finally {
      setCreating(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <main className="flex-1 py-8"><div className="mx-auto max-w-[1200px] px-4"><div className="animate-pulse space-y-6"><div className="h-8 bg-muted rounded w-48" /><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted rounded-xl" />)}</div></div></div></main>
    );
  }

  const stats = data?.stats ?? {};

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Store className="h-5 w-5 text-[#d4af37]" />
                <span className="text-sm text-muted-foreground">{data?.seller?.companyName ?? ''}</span>
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold">Satıcı Paneli</h1>
            </div>
          </div>
          {data?.seller?.status === 'APPROVED' && (
            (data?.auctions?.filter((a: any) => ['DRAFT', 'SCHEDULED', 'ACTIVE', 'LIVE'].includes(a.status))?.length ?? 0) >= 3 ? (
              <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">En fazla 3 aktif müzayede açabilirsiniz</span>
            ) : (
              <button
                onClick={() => setShowCreateAuction(true)}
                className="flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black hover:bg-[#c9a430] transition-colors"
              >
                <Plus className="h-4 w-4" /> Yeni Müzayede
              </button>
            )
          )}
        </div>

        {/* PENDING Uyarısı */}
        {data?.seller?.status === 'PENDING' && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 mb-6">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-400">Hesabınız Onay Bekliyor</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Başvurunuz admin tarafından inceleniyor. Onaylanana kadar müzayede oluşturamaz ve ürün ekleyemezsiniz.
                </p>
              </div>
            </div>
          </div>
        )}

        {data?.seller?.status === 'REJECTED' && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-red-400">Başvurunuz Reddedildi</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Satıcı başvurunuz reddedilmiştir. Daha fazla bilgi için bilgi@mezathane.tr adresine başvurabilirsiniz.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* INFO_REQUESTED Banner */}
        {data?.seller?.status === 'INFO_REQUESTED' && (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5 mb-6">
            <div className="flex items-start gap-3 mb-3">
              <Info className="h-5 w-5 text-blue-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-blue-400">Eksik Bilgi / Düzeltme İstendi</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Admin ekibi başvurunuz hakkında ek bilgi veya düzeltme talep etti. Lütfen aşağıdaki notu okuyun ve yanıtınızı gönderin.
                </p>
              </div>
            </div>
            {data.seller.adminNote && (
              <div className="rounded-lg bg-background/60 border border-border p-3 mb-3">
                <p className="text-xs text-muted-foreground mb-1">Admin Notu ({data.seller.adminNoteDate ? new Date(data.seller.adminNoteDate).toLocaleDateString('tr-TR') : ''})</p>
                <p className="text-sm whitespace-pre-wrap">{data.seller.adminNote}</p>
              </div>
            )}
            {data.seller.sellerResponse && (
              <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-3 mb-3">
                <p className="text-xs text-green-500 mb-1">Önceki Yanıtınız ({data.seller.sellerResponseDate ? new Date(data.seller.sellerResponseDate).toLocaleDateString('tr-TR') : ''})</p>
                <p className="text-sm whitespace-pre-wrap">{data.seller.sellerResponse}</p>
              </div>
            )}
            {!showResponseForm ? (
              <button
                onClick={() => setShowResponseForm(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-bold text-white hover:bg-blue-600 transition-colors"
              >
                <Send className="h-4 w-4" /> Yanıt Gönder
              </button>
            ) : (
              <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Yanıtınız</label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Admin'in isteğine yanıtınızı yazın..."
                  />
                </div>
                {/* Ek belge yükleme */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Ek Belgeler (Opsiyonel)</label>
                  {responseFiles.map((rf, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-2 rounded-lg border border-border bg-muted/30 p-2 text-xs">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate flex-1">{rf.label}</span>
                      <span className="text-muted-foreground truncate">{rf.file.name}</span>
                      <button onClick={() => setResponseFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newDocLabel}
                      onChange={(e) => setNewDocLabel(e.target.value)}
                      placeholder="Belge açıklaması (ör: İmza Sirküleri)"
                      className="flex-1 rounded-lg border border-border bg-background py-1.5 px-3 text-xs focus:border-blue-500 focus:outline-none"
                    />
                    <label className={`inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs cursor-pointer hover:border-blue-500 transition-colors ${!newDocLabel.trim() ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Upload className="h-3.5 w-3.5" /> Dosya Seç
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && newDocLabel.trim()) {
                          if (file.size > 10 * 1024 * 1024) { toast.error('Dosya 10MB\'dan büyük olamaz'); return; }
                          setResponseFiles(prev => [...prev, { label: newDocLabel.trim(), file }]);
                          setNewDocLabel('');
                        }
                        e.target.value = '';
                      }} />
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={() => { setShowResponseForm(false); setResponseText(''); setResponseFiles([]); }} className="flex-1 rounded-lg border border-border py-2 text-sm hover:bg-muted">İptal</button>
                  <button
                    disabled={respondingLoading || (!responseText.trim() && responseFiles.length === 0)}
                    onClick={async () => {
                      setRespondingLoading(true);
                      try {
                        // 1) Ek belgeleri yükle
                        for (const rf of responseFiles) {
                          const presignRes = await fetch('/api/upload/presigned', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ fileName: rf.file.name, contentType: rf.file.type, isPublic: false }),
                          });
                          const { uploadUrl, cloud_storage_path } = await presignRes.json();
                          await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': rf.file.type }, body: rf.file });
                          // Belgeyi kaydet
                          await fetch('/api/seller/documents', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ label: rf.label, fileUrl: uploadUrl.split('?')[0], filePath: cloud_storage_path, fileName: rf.file.name, contentType: rf.file.type }),
                          });
                        }
                        // 2) Yanıtı gönder
                        const res = await fetch('/api/seller/respond-info-request', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ response: responseText.trim() || (responseFiles.length > 0 ? 'Belgeler eklendi.' : '') }),
                        });
                        if (res.ok) {
                          toast.success('Yanıtınız gönderildi, başvurunuz tekrar incelenecek');
                          setShowResponseForm(false);
                          setResponseText('');
                          setResponseFiles([]);
                          // Refresh
                          const d = await fetch('/api/seller/dashboard').then(r => r.json());
                          setData(d);
                        } else {
                          const errData = await res.json();
                          toast.error(errData?.error || 'Yanıt gönderilemedi');
                        }
                      } catch {
                        toast.error('Bir hata oluştu');
                      } finally {
                        setRespondingLoading(false);
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-500 py-2 text-sm font-bold text-white hover:bg-blue-600 disabled:opacity-50"
                  >
                    {respondingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Gönder
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Gavel, label: 'Müzayedeler', value: stats?.auctions ?? 0 },
            { icon: Layers, label: 'Toplam Lot', value: stats?.totalLots ?? 0 },
            { icon: BarChart3, label: 'Teklifler', value: stats?.totalBids ?? 0 },
            { icon: TrendingUp, label: 'Toplam Gelir', value: formatPrice(stats?.totalRevenue ?? 0), isStr: true },
          ].map((stat: any, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="rounded-xl border border-border bg-card p-4">
              <stat.icon className="h-5 w-5 text-[#d4af37] mb-2" />
              <p className="text-2xl font-bold font-mono">{stat.isStr ? stat.value : stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Link href="/satici/siparisler" className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/5 p-4 hover:bg-green-500/10 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Siparişlerim</p>
              <p className="text-xs text-muted-foreground">Alıcı bilgileri, kargo & fatura yükleme</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/satici/cari" className="flex items-center gap-3 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-4 hover:bg-[#d4af37]/10 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-[#d4af37]/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-[#d4af37]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Cari Hesabım</p>
              <p className="text-xs text-muted-foreground">Komisyon kesintileri ve fatura bilgileri</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/satici/toplu-yukleme" className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 hover:bg-blue-500/10 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Upload className="h-5 w-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Toplu Lot Yükleme</p>
              <p className="text-xs text-muted-foreground">CSV ile birden fazla lot ekleyin</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/satici/analitik" className="flex items-center gap-3 rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 hover:bg-purple-500/10 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <PieChart className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Analitik</p>
              <p className="text-xs text-muted-foreground">Satış istatistikleri ve performans</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/satici/mesajlar" className="flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 hover:bg-orange-500/10 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Mesajlarım</p>
              <p className="text-xs text-muted-foreground">Alıcı sorularını yanıtlayın</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/satici/sablonlar" className="flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 hover:bg-cyan-500/10 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Müzayede Şablonları</p>
              <p className="text-xs text-muted-foreground">Şablon oluştur ve yeniden kullan</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/satici/profil" className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 hover:bg-rose-500/10 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <Store className="h-5 w-5 text-rose-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Mağaza Profilim</p>
              <p className="text-xs text-muted-foreground">Logo, açıklama ve firma bilgileri</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link href="/satici/rehber" className="flex items-center gap-3 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-4 hover:bg-[#d4af37]/10 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-[#d4af37]/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-[#d4af37]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Satıcı Rehberi</p>
              <p className="text-xs text-muted-foreground">Adım adım kullanım kılavuzu &amp; kurallar</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>

        {/* Recent Auctions */}
        <div className="rounded-xl border border-border bg-card mb-8">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-display font-semibold">Müzayedelerim</h2>
          </div>
          <div className="divide-y divide-border">
            {(data?.recentAuctions ?? []).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Gavel className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Henüz müzayede oluşturmadınız</p>
              </div>
            ) : (
              (data?.recentAuctions ?? []).map((auc: any) => (
                <div key={auc?.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{auc?.title ?? ''}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(auc?.startDate)}</span>
                      <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{auc?._count?.lots ?? 0} lot</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        auc?.status === 'LIVE' ? 'bg-red-500/20 text-red-400' :
                        auc?.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                        auc?.status === 'DRAFT' ? 'bg-muted text-muted-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>{auc?.status ?? ''}</span>
                    </div>
                  </div>
                  <Link href={`/satici/muzayede/${auc?.id ?? ''}`} className="rounded-lg bg-muted px-3 py-1.5 text-xs hover:bg-muted/80">
                    Yönet
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Create Auction Modal */}
        {showCreateAuction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreateAuction(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg mx-4 rounded-xl border border-border bg-card p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-display text-xl font-bold mb-4">Yeni Müzayede Oluştur</h2>
              <form onSubmit={handleCreateAuction} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div>
                  <label className="text-sm font-medium mb-1 block">Müzayede Başlığı *</label>
                  <input type="text" value={auctionForm.title} onChange={(e) => setAuctionForm(p => ({ ...(p ?? {}), title: e.target.value }))} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-[#d4af37] focus:outline-none" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Açıklama</label>
                  <textarea value={auctionForm.description} onChange={(e) => setAuctionForm(p => ({ ...(p ?? {}), description: e.target.value }))} rows={2} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-[#d4af37] focus:outline-none" />
                </div>

                {/* Müzayede Türü Seçimi */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Müzayede Türü</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setAuctionForm(p => ({ ...p, liveOnly: false }))} className={`rounded-lg border px-3 py-2.5 text-xs text-left transition-all ${!auctionForm.liveOnly ? 'border-[#d4af37] bg-[#d4af37]/10' : 'border-border hover:border-[#d4af37]/50'}`}>
                      <span className="font-semibold block">📋 Standart</span>
                      <span className="text-muted-foreground text-[10px]">Ön teklif → Canlı müzayede</span>
                    </button>
                    <button type="button" onClick={() => setAuctionForm(p => ({ ...p, liveOnly: true }))} className={`rounded-lg border px-3 py-2.5 text-xs text-left transition-all ${auctionForm.liveOnly ? 'border-red-500 bg-red-500/10' : 'border-border hover:border-red-500/50'}`}>
                      <span className="font-semibold block">🔴 Sadece Canlı</span>
                      <span className="text-muted-foreground text-[10px]">Direkt canlı müzayede başlar</span>
                    </button>
                  </div>
                </div>

                {/* Tarih Alanları — türe göre değişir */}
                {auctionForm.liveOnly ? (
                  <div>
                    <label className="text-sm font-medium mb-1 block">Canlı Müzayede Tarihi *</label>
                    <input type="datetime-local" value={auctionForm.liveDate} onChange={(e) => setAuctionForm(p => ({ ...p, liveDate: e.target.value }))} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-[#d4af37] focus:outline-none" required />
                    <p className="text-[10px] text-muted-foreground mt-1">Belirtilen saatte canlı müzayede direkt başlar. Lotlar önceden görünecek ama teklif verilemeyecek.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Ön Teklif Başlangıcı *</label>
                      <input type="datetime-local" value={auctionForm.startDate} onChange={(e) => setAuctionForm(p => ({ ...p, startDate: e.target.value }))} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-[#d4af37] focus:outline-none" required />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Ön Teklif Bitişi *</label>
                      <input type="datetime-local" value={auctionForm.endDate} onChange={(e) => setAuctionForm(p => ({ ...p, endDate: e.target.value }))} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-[#d4af37] focus:outline-none" required />
                    </div>
                  </div>
                )}

                {/* Canlı Müzayede Tempo Şablonu */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Canlı Müzayede Temposu</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.keys(LIVE_PRESETS) as Array<keyof typeof LIVE_PRESETS>).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyPreset(key)}
                        className={`rounded-lg border px-3 py-2 text-xs text-center transition-all ${
                          livePreset === key
                            ? 'border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37] font-semibold'
                            : 'border-border hover:border-[#d4af37]/50'
                        }`}
                      >
                        {LIVE_PRESETS[key].label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{LIVE_PRESETS[livePreset].desc}</p>
                </div>

                {/* Özel ayarlar — sadece "Özel" seçildiğinde */}
                {livePreset === 'custom' && (
                  <div className="space-y-3 rounded-lg border border-dashed border-[#d4af37]/30 p-3">
                    <div className={`grid ${auctionForm.liveOnly ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Lot Süresi (sn)</label>
                        <input type="number" min={5} max={120} value={auctionForm.waitingTime} onChange={(e) => setAuctionForm(p => ({ ...p, waitingTime: Math.min(120, Math.max(5, Number(e.target.value))) }))} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-[#d4af37] focus:outline-none" />
                        <p className="text-[10px] text-muted-foreground mt-0.5">5–120 sn</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Uzatma (sn)</label>
                        <input type="number" min={5} max={15} value={auctionForm.fairWaitingTime} onChange={(e) => setAuctionForm(p => ({ ...p, fairWaitingTime: Math.min(15, Math.max(5, Number(e.target.value))) }))} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-[#d4af37] focus:outline-none" />
                        <p className="text-[10px] text-muted-foreground mt-0.5">5–15 sn</p>
                      </div>
                      {!auctionForm.liveOnly && (
                        <div>
                          <label className="text-xs font-medium mb-1 block">Gecikme (dk)</label>
                          <input type="number" min={0} max={1440} value={auctionForm.liveDelayMinutes} onChange={(e) => setAuctionForm(p => ({ ...p, liveDelayMinutes: Math.min(1440, Math.max(0, Number(e.target.value))) }))} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-[#d4af37] focus:outline-none" />
                          <p className="text-[10px] text-muted-foreground mt-0.5">0–1440 dk (24 saat)</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Komisyon (%)</label>
                    <div className="w-full rounded-lg border border-border bg-muted/50 py-2 px-3 text-sm font-mono">%{data?.seller?.commissionRate ?? 15}</div>
                    <p className="text-[10px] text-muted-foreground mt-1">Admin tarafından belirlenir</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Ödeme Süresi (gün)</label>
                    <select value={auctionForm.paymentDays} onChange={(e) => setAuctionForm(p => ({ ...(p ?? {}), paymentDays: Number(e.target.value) }))} className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-[#d4af37] focus:outline-none">
                      {[2, 3, 4, 5, 6, 7].map(d => (<option key={d} value={d}>{d} gün</option>))}
                    </select>
                    <p className="text-[10px] text-muted-foreground mt-1">Alıcının ödeme yapması gereken süre (min 2, max 7 gün)</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreateAuction(false)} className="flex-1 rounded-lg border border-border py-2 text-sm hover:bg-muted">İptal</button>
                  <button type="submit" disabled={creating} className="flex-1 rounded-lg bg-[#d4af37] py-2 text-sm font-bold text-black hover:bg-[#c9a430] disabled:opacity-50">
                    {creating ? 'Oluşturuluyor...' : 'Oluştur'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </main>
  );
}
