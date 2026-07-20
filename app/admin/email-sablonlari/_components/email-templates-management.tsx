'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, Loader2, Save, RotateCcw, Eye, EyeOff, ChevronDown, ChevronUp, Code } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  key: string;
  name: string;
  subject: string;
  bodyHtml: string;
  isActive: boolean;
  updatedAt: string;
}

const VARIABLE_HINTS: Record<string, string[]> = {
  outbid: ['lotTitle', 'amount', 'lotUrl'],
  auction_won: ['lotTitle', 'amount', 'paymentDays', 'orderUrl'],
  payment_reminder: ['lotTitle', 'amount', 'dueDate', 'orderUrl'],
  watchlist_bid: ['userName', 'lotTitle', 'amount', 'lotUrl'],
  auction_start: ['userName', 'auctionTitle', 'auctionUrl'],
  order_status: ['lotTitle', 'status', 'orderUrl'],
  seller_application: ['companyName', 'userName', 'userEmail', 'adminUrl'],
  password_reset: ['resetUrl'],
};

export function EmailTemplatesManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, { subject: string; bodyHtml: string }>>({})
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/giris');
    if (status === 'authenticated' && (session?.user as any)?.role !== 'ADMIN') router.push('/');
  }, [status, session, router]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/email-templates');
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const getEdit = (t: Template) => editData[t.id] ?? { subject: t.subject, bodyHtml: t.bodyHtml };

  const handleSave = async (t: Template) => {
    const edit = getEdit(t);
    setSaving(t.id);
    try {
      const res = await fetch('/api/admin/email-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, subject: edit.subject, bodyHtml: edit.bodyHtml }),
      });
      if (!res.ok) throw new Error();
      toast.success(`"${t.name}" şablonu kaydedildi`);
      fetchTemplates();
      setEditData(prev => { const n = { ...prev }; delete n[t.id]; return n; });
    } catch { toast.error('Kaydedilemedi'); }
    setSaving(null);
  };

  const handleReset = async (t: Template) => {
    if (!confirm(`"${t.name}" şablonunu varsayılana sıfırlamak istediğinize emin misiniz?`)) return;
    setSaving(t.id);
    try {
      const res = await fetch('/api/admin/email-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: t.key }),
      });
      if (!res.ok) throw new Error();
      toast.success('Varsayılana sıfırlandı');
      fetchTemplates();
      setEditData(prev => { const n = { ...prev }; delete n[t.id]; return n; });
    } catch { toast.error('Sıfırlanamadı'); }
    setSaving(null);
  };

  const handleToggle = async (t: Template) => {
    try {
      await fetch('/api/admin/email-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, isActive: !t.isActive }),
      });
      toast.success(t.isActive ? 'Şablon devre dışı bırakıldı' : 'Şablon etkinleştirildi');
      fetchTemplates();
    } catch { toast.error('Güncellenemedi'); }
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
          <Mail className="h-6 w-6 text-[#d4af37]" /> E-posta Şablonları
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Sistem e-postalarının konu ve içeriğini özelleştirin. Değişkenler <code className="bg-muted px-1 rounded text-xs">{'{{'} değişken {'}}'}</code> formatındadır.</p>
      </div>

      <div className="space-y-3">
        {templates.map((t) => {
          const edit = getEdit(t);
          const isExpanded = expandedId === t.id;
          const hasChanges = editData[t.id] !== undefined;
          const vars = VARIABLE_HINTS[t.key] ?? [];

          return (
            <div key={t.id} className={`rounded-xl border bg-card overflow-hidden transition-colors ${t.isActive ? 'border-border' : 'border-red-500/30 opacity-70'}`}>
              {/* Başlık */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : t.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-[#d4af37] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.key}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!t.isActive && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Devre Dışı</span>}
                  {hasChanges && <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">Değişiklik</span>}
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Düzenleme Alanı */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border space-y-4">
                  {/* Değişkenler */}
                  {vars.length > 0 && (
                    <div className="pt-3">
                      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Code className="h-3 w-3" /> Kullanılabilir değişkenler:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {vars.map(v => (
                          <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-[#d4af37]/10 text-[#d4af37] font-mono">{`{{${v}}}`}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Konu */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Konu Satırı</label>
                    <input
                      type="text"
                      value={edit.subject}
                      onChange={(e) => setEditData(prev => ({ ...prev, [t.id]: { ...edit, subject: e.target.value } }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50"
                    />
                  </div>

                  {/* HTML Gövde */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-muted-foreground">HTML İçeriği</label>
                      <button
                        type="button"
                        onClick={() => setPreviewId(previewId === t.id ? null : t.id)}
                        className="text-xs text-[#d4af37] hover:underline inline-flex items-center gap-1"
                      >
                        {previewId === t.id ? <><EyeOff className="h-3 w-3" /> Kodu Göster</> : <><Eye className="h-3 w-3" /> Önizle</>}
                      </button>
                    </div>
                    {previewId === t.id ? (
                      <div
                        className="rounded-lg border border-border bg-white p-4 min-h-[150px]"
                        dangerouslySetInnerHTML={{ __html: edit.bodyHtml }}
                      />
                    ) : (
                      <textarea
                        value={edit.bodyHtml}
                        onChange={(e) => setEditData(prev => ({ ...prev, [t.id]: { ...edit, bodyHtml: e.target.value } }))}
                        rows={8}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 resize-y"
                      />
                    )}
                  </div>

                  {/* Aksiyonlar */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(t)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          t.isActive
                            ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                            : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                        }`}
                      >
                        {t.isActive ? 'Devre Dışı Bırak' : 'Etkinleştir'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReset(t)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors inline-flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" /> Varsayılana Sıfırla
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSave(t)}
                      disabled={saving === t.id || !hasChanges}
                      className="rounded-lg bg-[#d4af37] px-4 py-1.5 text-sm font-medium text-black hover:bg-[#c9a430] transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {saving === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Kaydet
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
