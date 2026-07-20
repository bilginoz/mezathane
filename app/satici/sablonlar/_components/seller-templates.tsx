'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft, FileText, Plus, Trash2, Copy, Calendar, Layers, ChevronDown, ChevronUp,
} from 'lucide-react';
import { formatDate, formatPrice } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  templateData: string;
  createdAt: string;
  updatedAt: string;
}

export function SellerTemplates() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedAuction, setSelectedAuction] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [tRes, aRes] = await Promise.all([
        fetch('/api/seller/templates'),
        fetch('/api/seller/dashboard'),
      ]);
      const tData = await tRes.json();
      const aData = await aRes.json();
      setTemplates(tData?.templates ?? []);
      setAuctions(aData?.recentAuctions ?? []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated') fetchData();
  }, [status, router]);

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('Şablon adı gerekli'); return; }
    if (!selectedAuction) { toast.error('Bir müzayede seçin'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/seller/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, fromAuctionId: selectedAuction }),
      });
      const data = await res.json();
      if (data?.success) {
        toast.success('Şablon oluşturuldu');
        setShowCreate(false);
        setNewName('');
        setSelectedAuction('');
        fetchData();
      } else {
        toast.error(data?.error ?? 'Hata');
      }
    } catch { toast.error('Şablon oluşturulamadı'); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu şablonu silmek istediğinizden emin misiniz?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/seller/templates?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data?.success) {
        toast.success('Şablon silindi');
        setTemplates(prev => prev.filter(t => t.id !== id));
      } else {
        toast.error(data?.error ?? 'Hata');
      }
    } catch { toast.error('Şablon silinemedi'); }
    finally { setDeleting(null); }
  };

  const handleUseTemplate = async (template: Template) => {
    try {
      const templateData = JSON.parse(template.templateData);
      // Navigate to seller page with template info in session storage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('auctionTemplate', JSON.stringify({
          name: template.name,
          ...templateData,
        }));
      }
      router.push('/satici');
      toast.success(`"${template.name}" şablonu yüklendi. Yeni müzayede oluşturma formunda kullanabilirsiniz.`);
    } catch {
      toast.error('Şablon yüklenemedi');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <main className="flex-1 py-8"><div className="mx-auto max-w-[1200px] px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
      </div></main>
    );
  }

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1200px] px-4">
        <Link href="/satici" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Satıcı Paneline Dön
        </Link>

        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-2xl font-bold">Müzayede Şablonları</h1>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black hover:bg-[#c9a430] transition-colors">
            <Plus className="h-4 w-4" /> Yeni Şablon
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Mevcut müzayedelerinizden şablon oluşturun ve gelecek müzayedelerde tekrar kullanın.
          Lot bilgileri, açıklamalar ve ayarlar şablonda saklanır.
        </p>

        {/* Create Modal */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md mx-4 rounded-xl border border-border bg-card p-6" onClick={e => e.stopPropagation()}>
              <h2 className="font-display text-lg font-bold mb-4">Yeni Şablon Oluştur</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Şablon Adı *</label>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-[#d4af37] focus:outline-none"
                    placeholder="Örn: Antika Müzayede Şablonu" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Kaynak Müzayede *</label>
                  <select value={selectedAuction} onChange={e => setSelectedAuction(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-[#d4af37] focus:outline-none">
                    <option value="">Müzayede seçin...</option>
                    {auctions.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.title} ({a._count?.lots ?? 0} lot)</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">Müzayedenin lot bilgileri, açıklamaları ve ayarları şablona kopyalanacak</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="flex-1 rounded-lg border border-border py-2 text-sm hover:bg-muted">İptal</button>
                  <button onClick={handleCreate} disabled={creating}
                    className="flex-1 rounded-lg bg-[#d4af37] py-2 text-sm font-bold text-black hover:bg-[#c9a430] disabled:opacity-50">
                    {creating ? 'Oluşturuluyor...' : 'Oluştur'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Template List */}
        {templates.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-1">Henüz şablon oluşturmadınız</p>
            <p className="text-xs text-muted-foreground">Mevcut müzayedelerinizden şablon oluşturarak gelecek müzayedelerde zaman kazanın</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map(t => {
              let parsed: any = {};
              try { parsed = JSON.parse(t.templateData); } catch {}
              const lotCount = parsed?.lots?.length ?? 0;
              const isExpanded = expandedId === t.id;

              return (
                <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center gap-4 p-4">
                    <div className="h-10 w-10 rounded-lg bg-[#d4af37]/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-[#d4af37]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{t.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{lotCount} lot</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(t.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleUseTemplate(t)}
                        className="flex items-center gap-1.5 rounded-lg bg-[#d4af37]/10 px-3 py-1.5 text-xs text-[#d4af37] hover:bg-[#d4af37]/20 transition-colors">
                        <Copy className="h-3.5 w-3.5" /> Kullan
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : t.id)}
                        className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}
                        className="rounded-lg p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border p-4 bg-muted/30">
                      {parsed?.description && (
                        <p className="text-xs text-muted-foreground mb-3">{parsed.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                        <span>Tür: {parsed?.liveOnly ? '🔴 Sadece Canlı' : '📋 Standart'}</span>
                        <span>Lot Süresi: {parsed?.waitingTime ?? 20}sn</span>
                        <span>Uzatma: {parsed?.fairWaitingTime ?? 5}sn</span>
                        {!parsed?.liveOnly && <span>Gecikme: {parsed?.liveDelayMinutes ?? 30} dk</span>}
                        <span>Ödeme: {parsed?.paymentDays ?? 5} gün</span>
                      </div>
                      {(parsed?.lots ?? []).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium">Lotlar:</p>
                          {(parsed.lots as any[]).slice(0, 10).map((l: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 rounded-lg bg-card p-2 text-xs">
                              <span className="text-muted-foreground w-6">#{i + 1}</span>
                              <span className="flex-1 truncate font-medium">{l.title}</span>
                              <span className="text-muted-foreground">{l.categoryName ?? '-'}</span>
                              <span className="font-mono text-[#d4af37]">{formatPrice(l.startingPrice ?? 0)}</span>
                            </div>
                          ))}
                          {(parsed.lots as any[]).length > 10 && (
                            <p className="text-xs text-muted-foreground text-center">+{(parsed.lots as any[]).length - 10} lot daha</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
