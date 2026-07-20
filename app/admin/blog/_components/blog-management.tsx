'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, FileText, Trash2, Eye, EyeOff, Edit, X, Save, ExternalLink, BarChart3 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  tags: string | null;
  metaTitle: string | null;
  metaDesc: string | null;
  viewCount: number;
  createdAt: string;
}

export function BlogManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<BlogPostData | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState({
    title: '', excerpt: '', content: '', coverImage: '', tags: '',
    metaTitle: '', metaDesc: '', isPublished: false,
  });
  const [saving, setSaving] = useState(false);

  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated' && user?.role !== 'ADMIN') { router.replace('/panel'); return; }
    if (status === 'authenticated') fetchPosts();
  }, [status, router, user?.role]);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/admin/blog');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch { toast.error('Yazılar yüklenemedi'); }
    finally { setLoading(false); }
  };

  const openNewPost = () => {
    setEditingPost(null);
    setForm({ title: '', excerpt: '', content: '', coverImage: '', tags: '', metaTitle: '', metaDesc: '', isPublished: false });
    setShowEditor(true);
  };

  const openEditPost = (post: BlogPostData) => {
    setEditingPost(post);
    setForm({
      title: post.title,
      excerpt: post.excerpt || '',
      content: post.content,
      coverImage: post.coverImage || '',
      tags: post.tags || '',
      metaTitle: post.metaTitle || '',
      metaDesc: post.metaDesc || '',
      isPublished: post.isPublished,
    });
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.content) {
      toast.error('Başlık ve içerik gerekli');
      return;
    }
    setSaving(true);
    try {
      const method = editingPost ? 'PATCH' : 'POST';
      const body = editingPost ? { id: editingPost.id, ...form } : form;
      const res = await fetch('/api/admin/blog', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      toast.success(editingPost ? 'Yazı güncellendi' : 'Yazı oluşturuldu');
      setShowEditor(false);
      setEditingPost(null);
      fetchPosts();
    } catch { toast.error('Hata oluştu'); }
    finally { setSaving(false); }
  };

  const togglePublish = async (post: BlogPostData) => {
    try {
      await fetch('/api/admin/blog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post.id, isPublished: !post.isPublished }),
      });
      toast.success(post.isPublished ? 'Yazı taslak yapıldı' : 'Yazı yayınlandı');
      fetchPosts();
    } catch { toast.error('Hata'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu yazıyı silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/admin/blog?id=${id}`, { method: 'DELETE' });
      toast.success('Yazı silindi');
      fetchPosts();
    } catch { toast.error('Hata'); }
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-[#d4af37] border-t-transparent rounded-full" /></div>;
  }

  return (
    <main className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <FileText className="h-6 w-6 text-[#d4af37]" />
          <h1 className="text-xl font-bold">Blog Yönetimi</h1>
          <button onClick={openNewPost} className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4af37] text-black font-semibold text-sm hover:bg-[#c5a028] transition-colors">
            <Plus className="h-4 w-4" /> Yeni Yazı
          </button>
        </div>

        <AnimatePresence>
          {showEditor && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
              <div className="rounded-xl border border-[#d4af37]/30 bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">{editingPost ? 'Yazıyı Düzenle' : 'Yeni Yazı'}</h2>
                  <button onClick={() => { setShowEditor(false); setEditingPost(null); }} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Başlık *</label>
                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Yazı başlığı" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Özet</label>
                    <textarea value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} placeholder="Kısa özet (liste görünümünde görünecek)" rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">İçerik * (HTML destekli)</label>
                    <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Yazı içeriğinizi buraya girin. HTML etiketleri kullanabilirsiniz.\n\n<h2>Başlık</h2>\n<p>Paragraf...</p>\n<ul><li>Madde</li></ul>" rows={12} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono resize-y" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Kapak Görseli URL</label>
                      <input value={form.coverImage} onChange={e => setForm({ ...form, coverImage: e.target.value })} placeholder="https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/SecretAgent.jpg/250px-SecretAgent.jpg" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">Etiketler (virgülle ayırın)</label>
                      <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="müzayede, koleksiyon, rehber" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">SEO Başlık</label>
                      <input value={form.metaTitle} onChange={e => setForm({ ...form, metaTitle: e.target.value })} placeholder="Sayfa başlığı (boş bırakılırsa yazı başlığı kullanılır)" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">SEO Açıklama</label>
                      <input value={form.metaDesc} onChange={e => setForm({ ...form, metaDesc: e.target.value })} placeholder="Arama motorları için kısa açıklama" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isPublished} onChange={e => setForm({ ...form, isPublished: e.target.checked })} className="rounded" />
                      <span className="text-sm">Hemen yayınla</span>
                    </label>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => { setShowEditor(false); setEditingPost(null); }} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">Vazgeç</button>
                    <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-lg bg-[#d4af37] text-black font-semibold text-sm hover:bg-[#c5a028] disabled:opacity-50 flex items-center gap-2">
                      <Save className="h-4 w-4" /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {posts.length === 0 && !showEditor ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Henüz blog yazısı yok</p>
            <p className="text-sm mt-1">"Yeni Yazı" butonuna tıklayarak ilk yazınızı oluşturun</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => (
              <motion.div key={post.id} layout className={`rounded-xl border bg-card p-4 ${post.isPublished ? 'border-green-500/30' : 'border-border'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{post.title}</h3>
                      {post.isPublished ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 shrink-0">Yayında</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 shrink-0">Taslak</span>
                      )}
                    </div>
                    {post.excerpt && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{post.excerpt}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>/{post.slug}</span>
                      {post.tags && <span>Etiketler: {post.tags}</span>}
                      <span><BarChart3 className="h-3 w-3 inline" /> {post.viewCount} görüntülenme</span>
                      <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {post.isPublished && (
                      <Link href={`/blog/${post.slug}`} target="_blank" className="p-2 rounded-lg hover:bg-muted transition-colors" title="Görüntüle">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    )}
                    <button onClick={() => openEditPost(post)} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Düzenle">
                      <Edit className="h-4 w-4 text-blue-400" />
                    </button>
                    <button onClick={() => togglePublish(post)} className="p-2 rounded-lg hover:bg-muted transition-colors" title={post.isPublished ? 'Taslak yap' : 'Yayınla'}>
                      {post.isPublished ? <EyeOff className="h-4 w-4 text-orange-400" /> : <Eye className="h-4 w-4 text-green-400" />}
                    </button>
                    <button onClick={() => handleDelete(post.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors" title="Sil">
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
