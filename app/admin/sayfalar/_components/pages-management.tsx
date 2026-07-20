'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { FileText, Plus, Edit3, Trash2, ArrowLeft, Save, X, Eye, EyeOff, GripVertical, ExternalLink, Shield, BookOpen, Gavel, Cookie, Lock, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

const ICON_OPTIONS = [
  { value: 'FileText', label: 'Belge', Icon: FileText },
  { value: 'Shield', label: 'Kalkan', Icon: Shield },
  { value: 'BookOpen', label: 'Kitap', Icon: BookOpen },
  { value: 'Gavel', label: 'Tokmak', Icon: Gavel },
  { value: 'Cookie', label: 'Çerez', Icon: Cookie },
  { value: 'Lock', label: 'Kilit', Icon: Lock },
  { value: 'Scale', label: 'Terazi', Icon: Scale },
];

export function PagesManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [isNew, setIsNew] = useState(false);
  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated' && user?.role !== 'ADMIN') { router.replace('/panel'); return; }
    if (status === 'authenticated') loadPages();
  }, [status, router, user?.role]);

  const loadPages = async () => {
    try {
      const res = await fetch('/api/admin/pages');
      const data = await res.json();
      setPages(data?.pages || []);
    } catch { toast.error('Sayfalar yüklenemedi'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!editingPage?.title || !editingPage?.slug || !editingPage?.content) {
      toast.error('Başlık, slug ve içerik zorunludur');
      return;
    }
    try {
      const method = isNew ? 'POST' : 'PATCH';
      const res = await fetch('/api/admin/pages', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPage),
      });
      const data = await res.json();
      if (data?.error) { toast.error(data.error); return; }
      toast.success(isNew ? 'Sayfa oluşturuldu' : 'Sayfa güncellendi');
      setEditingPage(null);
      setIsNew(false);
      loadPages();
    } catch { toast.error('Hata oluştu'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu sayfayı silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/admin/pages?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data?.error) { toast.error(data.error); return; }
      toast.success('Sayfa silindi');
      loadPages();
    } catch { toast.error('Hata oluştu'); }
  };

  const newPage = () => {
    setEditingPage({ title: '', slug: '', content: '', icon: 'FileText', isActive: true, sortOrder: pages.length });
    setIsNew(true);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
      .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  };

  if (status === 'loading' || loading) {
    return <main className="flex-1 py-8"><div className="mx-auto max-w-[1000px] px-4"><div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-48" /><div className="h-16 bg-muted rounded-xl" /><div className="h-16 bg-muted rounded-xl" /></div></div></main>;
  }

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1000px] px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <FileText className="h-6 w-6 text-[#d4af37]" />
            <h1 className="font-display text-2xl font-bold">Sayfa Yönetimi</h1>
          </div>
          <button onClick={newPage} className="flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 font-medium text-black hover:bg-[#c9a430] transition-colors">
            <Plus className="h-4 w-4" /> Yeni Sayfa
          </button>
        </div>

        {/* Editor Modal */}
        <AnimatePresence>
          {editingPage && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-card rounded-xl border border-border w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-card rounded-t-xl">
                  <h2 className="font-display font-semibold text-lg">{isNew ? 'Yeni Sayfa Oluştur' : 'Sayfayı Düzenle'}</h2>
                  <button onClick={() => { setEditingPage(null); setIsNew(false); }} className="p-2 rounded-lg hover:bg-muted">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Başlık</label>
                      <input type="text" value={editingPage.title} onChange={e => { setEditingPage({ ...editingPage, title: e.target.value, ...(isNew ? { slug: generateSlug(e.target.value) } : {}) }); }} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Slug (URL)</label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">/sayfa/</span>
                        <input type="text" value={editingPage.slug} onChange={e => setEditingPage({ ...editingPage, slug: e.target.value })} className="flex-1 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">İkon</label>
                      <select value={editingPage.icon} onChange={e => setEditingPage({ ...editingPage, icon: e.target.value })} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none">
                        {ICON_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Sıralama</label>
                      <input type="number" value={editingPage.sortOrder} onChange={e => setEditingPage({ ...editingPage, sortOrder: parseInt(e.target.value) || 0 })} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
                    </div>
                    <div className="flex items-end">
                      <button onClick={() => setEditingPage({ ...editingPage, isActive: !editingPage.isActive })} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${editingPage.isActive ? 'bg-green-600/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                        {editingPage.isActive ? <><Eye className="h-4 w-4" /> Aktif</> : <><EyeOff className="h-4 w-4" /> Pasif</>}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">İçerik</label>
                    <p className="text-xs text-muted-foreground mb-2">Her bölüm için ## başlık kullanın. Paragrafları boş satırla ayırın.</p>
                    <textarea value={editingPage.content} onChange={e => setEditingPage({ ...editingPage, content: e.target.value })} rows={16} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none font-mono resize-y" placeholder="## 1. Bölüm Başlığı\n\nBölüm içeriği buraya yazılır.\n\n## 2. Diğer Bölüm\n\nDiğer bölüm içeriği..." />
                  </div>
                </div>
                <div className="sticky bottom-0 flex justify-end gap-3 p-4 border-t border-border bg-card rounded-b-xl">
                  <button onClick={() => { setEditingPage(null); setIsNew(false); }} className="px-4 py-2 text-sm rounded-lg hover:bg-muted transition-colors">Vazgeç</button>
                  <button onClick={handleSave} className="flex items-center gap-2 rounded-lg bg-[#d4af37] px-5 py-2 font-medium text-black hover:bg-[#c9a430] transition-colors">
                    <Save className="h-4 w-4" /> Kaydet
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pages List */}
        <div className="rounded-xl border border-border bg-card">
          {pages.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Henüz sayfa oluşturulmamış</p>
              <button onClick={newPage} className="mt-4 text-[#d4af37] text-sm font-medium hover:underline">Yeni sayfa oluştur</button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pages.map((page, i) => (
                <motion.div key={page.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex-shrink-0 text-muted-foreground"><GripVertical className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{page.title}</span>
                      {!page.isActive && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Pasif</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">/sayfa/{page.slug} · {formatDate(page.updatedAt)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/sayfa/${page.slug}`} target="_blank" className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                    <button onClick={() => { setEditingPage({ ...page }); setIsNew(false); }} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(page.id)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
