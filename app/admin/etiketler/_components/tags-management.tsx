'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Tag, Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface TagItem {
  id: string;
  name: string;
  _count?: { lots: number };
}

export function TagsManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/giris');
    if (status === 'authenticated' && (session?.user as any)?.role !== 'ADMIN') router.push('/');
  }, [status, session, router]);

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/admin/tags');
      const data = await res.json();
      setTags(data.tags ?? []);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { fetchTags(); }, []);

  const handleAdd = async () => {
    const name = newTag.trim();
    if (!name) return;
    setAdding(true);
    try {
      const res = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Etiket eklenemedi');
      } else {
        toast.success('Etiket eklendi');
        setNewTag('');
        fetchTags();
      }
    } catch { toast.error('Hata oluştu'); }
    setAdding(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" etiketini silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/admin/tags?id=${id}`, { method: 'DELETE' });
      if (!res.ok) toast.error('Silinemedi');
      else { toast.success('Etiket silindi'); fetchTags(); }
    } catch { toast.error('Hata oluştu'); }
  };

  if (status === 'loading' || loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" /></div>;
  }

  return (
    <div>
      <div className="mb-6">
        <button type="button" onClick={() => router.back()} className="rounded-lg border border-border p-2 hover:bg-muted transition-colors inline-flex items-center gap-2 text-sm mb-4">
          <ArrowLeft className="h-4 w-4" /> Geri
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Tag className="h-6 w-6 text-[#d4af37]" /> Etiket Yönetimi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Lotlara atanabilecek etiketleri yönetin</p>
      </div>

      {/* Yeni Etiket Ekle */}
      <div className="rounded-xl border border-border bg-card p-4 mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Yeni etiket adı..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !newTag.trim()}
            className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-medium text-black hover:bg-[#c9a430] transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Ekle
          </button>
        </div>
      </div>

      {/* Etiket Listesi */}
      <div className="rounded-xl border border-border bg-card">
        {tags.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Henüz etiket eklenmemiş</div>
        ) : (
          <div className="divide-y divide-border">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-[#d4af37]" />
                  <span className="text-sm font-medium">{tag.name}</span>
                  {tag._count && tag._count.lots > 0 && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {tag._count.lots} lot
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(tag.id, tag.name)}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
