'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Tag, Plus, Edit3, Trash2, ArrowLeft, Save, X, Eye, EyeOff, Upload, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export function CategoriesManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [isNew, setIsNew] = useState(false);
  const [uploading, setUploading] = useState(false);
  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated' && user?.role !== 'ADMIN') { router.replace('/panel'); return; }
    if (status === 'authenticated') loadCategories();
  }, [status, router, user?.role]);

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json();
      setCategories(data?.categories || []);
    } catch { toast.error('Kategoriler yüklenemedi'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!editing?.name || !editing?.slug) {
      toast.error('Ad ve slug zorunludur');
      return;
    }
    try {
      const method = isNew ? 'POST' : 'PATCH';
      const res = await fetch('/api/admin/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      const data = await res.json();
      if (data?.error) { toast.error(data.error); return; }
      toast.success(isNew ? 'Kategori oluşturuldu' : 'Kategori güncellendi');
      setEditing(null);
      setIsNew(false);
      loadCategories();
    } catch { toast.error('Hata oluştu'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data?.error) { toast.error(data.error); return; }
      toast.success('Kategori silindi');
      loadCategories();
    } catch { toast.error('Hata oluştu'); }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-category.${ext}`;
      const presignRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, contentType: file.type, folder: 'categories' }),
      });
      const presignData = await presignRes.json();
      if (!presignData?.url) { toast.error('Yükleme hatası'); return; }
      await fetch(presignData.url, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      const publicUrl = presignData.publicUrl || presignData.url.split('?')[0];
      setEditing((prev: any) => ({ ...prev, imageUrl: publicUrl }));
      toast.success('Görsel yüklendi');
    } catch { toast.error('Görsel yüklenemedi'); }
    finally { setUploading(false); }
  };

  const newCategory = () => {
    setEditing({ name: '', slug: '', description: '', imageUrl: '', sortOrder: categories.length, isActive: true });
    setIsNew(true);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
      .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  };

  if (status === 'loading' || loading) {
    return <main className="flex-1 py-8"><div className="mx-auto max-w-[1000px] px-4"><div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-48" />{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}</div></div></main>;
  }

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1000px] px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Tag className="h-6 w-6 text-[#d4af37]" />
            <h1 className="font-display text-2xl font-bold">Kategori Yönetimi</h1>
          </div>
          <button onClick={newCategory} className="flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2.5 font-medium text-black hover:bg-[#c9a430] transition-colors">
            <Plus className="h-4 w-4" /> Yeni Kategori
          </button>
        </div>

        {/* Editor Modal */}
        <AnimatePresence>
          {editing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h2 className="font-display font-semibold text-lg">{isNew ? 'Yeni Kategori' : 'Kategori Düzenle'}</h2>
                  <button onClick={() => { setEditing(null); setIsNew(false); }} className="p-2 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                  {/* Image */}
                  <div className="flex items-start gap-4">
                    <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden relative flex-shrink-0">
                      {editing?.imageUrl ? (
                        <Image src={editing.imageUrl} alt="Kategori" fill className="object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <input type="text" value={editing?.imageUrl || ''} onChange={e => setEditing({ ...editing, imageUrl: e.target.value })} placeholder="Görsel URL" className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
                      <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors w-fit">
                        <Upload className="h-3.5 w-3.5" />
                        {uploading ? 'Yükleniyor...' : 'Yükle'}
                        <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]); }} disabled={uploading} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Kategori Adı</label>
                    <input type="text" value={editing?.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value, ...(isNew ? { slug: generateSlug(e.target.value) } : {}) })} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Slug</label>
                    <input type="text" value={editing?.slug || ''} onChange={e => setEditing({ ...editing, slug: e.target.value })} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Açıklama</label>
                    <textarea value={editing?.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} rows={2} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none resize-none" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-1 block">Sıralama</label>
                      <input type="number" value={editing?.sortOrder ?? 0} onChange={e => setEditing({ ...editing, sortOrder: parseInt(e.target.value) || 0 })} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
                    </div>
                    <div className="flex items-end">
                      <button onClick={() => setEditing({ ...editing, isActive: !editing?.isActive })} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${editing?.isActive ? 'bg-green-600/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                        {editing?.isActive ? <><Eye className="h-4 w-4" /> Aktif</> : <><EyeOff className="h-4 w-4" /> Pasif</>}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-4 border-t border-border">
                  <button onClick={() => { setEditing(null); setIsNew(false); }} className="px-4 py-2 text-sm rounded-lg hover:bg-muted transition-colors">Vazgeç</button>
                  <button onClick={handleSave} className="flex items-center gap-2 rounded-lg bg-[#d4af37] px-5 py-2 font-medium text-black hover:bg-[#c9a430] transition-colors">
                    <Save className="h-4 w-4" /> Kaydet
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((cat, i) => (
            <motion.div key={cat.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-start gap-4 p-4">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 relative">
                  {cat.imageUrl ? (
                    <Image src={cat.imageUrl} alt={cat.name} fill className="object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Tag className="h-6 w-6 text-muted-foreground" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-sm">{cat.name}</h3>
                    {!cat.isActive && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Pasif</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">/{cat.slug} · {cat._count?.lots ?? 0} lot</p>
                  {cat.description && <p className="text-xs text-muted-foreground mt-1 truncate">{cat.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditing({ ...cat }); setIsNew(false); }} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Henüz kategori oluşturulmamış</p>
          </div>
        )}
      </div>
    </main>
  );
}
