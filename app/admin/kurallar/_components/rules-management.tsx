'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShieldCheck, Save, ArrowLeft, Users, Wallet, Ban } from 'lucide-react';
import { toast } from 'sonner';

export function RulesManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [preview, setPreview] = useState<string | null>(null); // admin önizleme durumu
  const [previewBusy, setPreviewBusy] = useState(false);
  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated' && user?.role !== 'ADMIN') { router.replace('/panel'); return; }
    if (status === 'authenticated') {
      fetch('/api/admin/platform-settings')
        .then(r => r.json())
        .then(d => setSettings(d?.settings || {}))
        .catch(() => toast.error('Ayarlar yüklenemedi'))
        .finally(() => setLoading(false));
      fetch('/api/admin/payment-preview').then(r => r.json()).then(d => setPreview(d?.preview ?? null)).catch(() => {});
    }
  }, [status, router, user?.role]);

  // Admin önizleme aç/kapa: canlı flag'e dokunmadan yalnızca bu tarayıcıya DIRECT/ESCROW gösterir.
  const togglePreview = async (mode: 'DIRECT' | 'OFF') => {
    setPreviewBusy(true);
    try {
      const res = await fetch('/api/admin/payment-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d?.error ?? 'Önizleme ayarlanamadı'); return; }
      setPreview(d?.preview ?? null);
      toast.success(mode === 'OFF' ? 'Önizleme kapatıldı' : 'DIRECT önizleme açıldı (yalnızca siz görürsünüz)');
      // Sunucu bileşenleri yeni çereze göre yeniden render olsun diye sayfayı tazele.
      setTimeout(() => window.location.reload(), 400);
    } catch {
      toast.error('Önizleme ayarlanamadı');
    } finally {
      setPreviewBusy(false);
    }
  };

  const updateField = (key: string, value: any) => setSettings((prev: any) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/platform-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newUserOutstandingLimit: Number(settings.newUserOutstandingLimit),
          trustedUserOutstandingLimit: Number(settings.trustedUserOutstandingLimit),
          newUserMaxUnpaidCount: Number(settings.newUserMaxUnpaidCount),
          trustedUserMaxUnpaidCount: Number(settings.trustedUserMaxUnpaidCount),
          autoSuspendAfterDefaults: Number(settings.autoSuspendAfterDefaults),
          paymentMode: settings.paymentMode === 'DIRECT' ? 'DIRECT' : 'ESCROW',
        }),
      });
      const data = await res.json();
      if (data?.settings) {
        setSettings(data.settings);
        toast.success('Kurallar kaydedildi');
      } else {
        toast.error(data?.error || 'Hata oluştu');
      }
    } catch {
      toast.error('Kaydetme hatası');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return <main className="flex-1 py-8"><div className="mx-auto max-w-[900px] px-4"><div className="animate-pulse space-y-6"><div className="h-8 bg-muted rounded w-48" /><div className="h-64 bg-muted rounded-xl" /></div></div></main>;
  }

  const numInput = 'w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none';

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[900px] px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
            <ShieldCheck className="h-6 w-6 text-[#d4af37]" />
            <h1 className="font-display text-2xl font-bold">Kurallar & Limitler</h1>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-[#d4af37] px-5 py-2.5 font-medium text-black hover:bg-[#c9a430] transition-colors disabled:opacity-50">
            <Save className="h-4 w-4" />{saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>

        <div className="space-y-6">
          {/* Ödeme Modu (sürüm anahtarı) */}
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6">
            <h2 className="font-semibold mb-1 flex items-center gap-2"><Wallet className="h-5 w-5 text-amber-400" /> Ödeme Modu (Sürüm)</h2>
            <p className="text-sm text-muted-foreground mb-4">
              <strong className="text-foreground">ESCROW (V1):</strong> Para platform hesabına gelir,
              cari/hakediş işler, satıcıya biz öderiz. <br />
              <strong className="text-foreground">DIRECT (V2):</strong> Para doğrudan satıcının hesabına
              gider; gelirimiz "Müzayede Hakkı"dır. Alıcı satıcının IBAN'ına öder, satıcı onaylar.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={settings?.paymentMode === 'DIRECT' ? 'DIRECT' : 'ESCROW'}
                onChange={e => updateField('paymentMode', e.target.value)}
                className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none"
              >
                <option value="ESCROW">ESCROW (V1) — para platformdan geçer</option>
                <option value="DIRECT">DIRECT (V2) — para doğrudan satıcıya</option>
              </select>
              {settings?.paymentMode === 'DIRECT' && (
                <span className="text-xs text-amber-500 font-medium">⚠️ V2 aktif — kaydettikten sonra geçerli olur.</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Not: Mod değiştirmek eski kodu SİLMEZ; sadece akışı değiştirir. Geri dönmek için tekrar
              ESCROW seçip kaydetmeniz yeterli — cari/ödeme takip anında geri gelir.
            </p>
          </div>

          {/* Admin Önizleme — canlı flag'e dokunmadan yeni sistemi test etmek için */}
          <div className="rounded-xl border border-sky-500/40 bg-sky-500/5 p-6">
            <h2 className="font-semibold mb-1 flex items-center gap-2"><Wallet className="h-5 w-5 text-sky-400" /> DIRECT Önizleme (yalnızca siz)</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Yeni sistemi (DIRECT) canlı flag'i değiştirmeden test edin. Açtığınızda <strong className="text-foreground">yalnızca sizin tarayıcınız</strong> yeni
              sistemi görür; siteyi gezen diğer satıcı/alıcılar eski sistemde (ESCROW) kalır. Test bitince kapatın.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {preview === 'DIRECT' ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/15 text-sky-400 px-3 py-2 text-sm font-medium">🔵 DIRECT önizleme AÇIK</span>
                  <button
                    onClick={() => togglePreview('OFF')}
                    disabled={previewBusy}
                    className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    Önizlemeyi Kapat
                  </button>
                </>
              ) : (
                <button
                  onClick={() => togglePreview('DIRECT')}
                  disabled={previewBusy}
                  className="rounded-lg bg-sky-500 text-white px-4 py-2 text-sm font-semibold hover:bg-sky-600 transition-colors disabled:opacity-50"
                >
                  DIRECT Önizlemeyi Aç
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Not: Bu önizleme yalnızca ekranları (etiket, IBAN, yasal metin, satış kaydı vb.) gösterir; gerçek satış
              matematiği her zaman canlı flag'e göre işler. 6 saat sonra kendiliğinden kapanır.
            </p>
          </div>

          {/* Açıklama */}
          <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
            Bu limitler, <strong className="text-foreground">ödeme yapmadan üst üste kazanıp
            sabote etmeyi</strong> engeller. Bir kullanıcı, <strong className="text-foreground">adet
            veya tutar</strong> sınırından hangisine önce takılırsa yeni teklif veremez.
            Kural, ödemesi <em>henüz vadesi gelmemiş</em> kazançlar için birikmiş toplama bakar;
            tek ürünün fiyatına bakmaz (yani temiz bir kullanıcı pahalı bir ürüne teklif verebilir).
          </div>

          {/* Yeni üye */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display font-semibold text-lg mb-1 flex items-center gap-2"><Users className="h-5 w-5 text-[#d4af37]" /> Yeni Üye</h2>
            <p className="text-xs text-muted-foreground mb-4">Henüz hiç başarılı ödemesi olmayan üye.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Ödenmemiş sipariş ADET sınırı</label>
                <input type="number" min={1} value={settings?.newUserMaxUnpaidCount ?? ''} onChange={e => updateField('newUserMaxUnpaidCount', e.target.value)} className={numInput} />
                <p className="text-xs text-muted-foreground mt-1">Örn. 3 → canlıda 2-3 kalem alabilir, ama çok sayıda ucuz ürünle sabotaj engellenir.</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Ödenmemiş sipariş TUTAR sınırı (₺)</label>
                <input type="number" min={0} value={settings?.newUserOutstandingLimit ?? ''} onChange={e => updateField('newUserOutstandingLimit', e.target.value)} className={numInput} />
                <p className="text-xs text-muted-foreground mt-1">Örn. 50.000 → az sayıda pahalı ürünle limiti doldurmayı keser.</p>
              </div>
            </div>
          </motion.div>

          {/* Güvenilir üye */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display font-semibold text-lg mb-1 flex items-center gap-2"><Wallet className="h-5 w-5 text-[#d4af37]" /> Güvenilir Üye</h2>
            <p className="text-xs text-muted-foreground mb-4">En az 1 başarılı ödeme yapmış üye.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Ödenmemiş sipariş ADET sınırı</label>
                <input type="number" min={1} value={settings?.trustedUserMaxUnpaidCount ?? ''} onChange={e => updateField('trustedUserMaxUnpaidCount', e.target.value)} className={numInput} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Ödenmemiş sipariş TUTAR sınırı (₺)</label>
                <input type="number" min={0} value={settings?.trustedUserOutstandingLimit ?? ''} onChange={e => updateField('trustedUserOutstandingLimit', e.target.value)} className={numInput} />
              </div>
            </div>
          </motion.div>

          {/* Otomatik askı */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display font-semibold text-lg mb-1 flex items-center gap-2"><Ban className="h-5 w-5 text-[#d4af37]" /> Otomatik Askı</h2>
            <p className="text-xs text-muted-foreground mb-4">Vadesi geçmiş ödenmemiş siparişi (default) olan üye, bu eşiğe ulaşınca hesabı otomatik askıya alınır (giriş kapanır, bilgilendirme e-postası gider). Admin elle geri açabilir.</p>
            <div className="max-w-xs">
              <label className="text-sm font-medium mb-1 block">Kaç ihlalden sonra askıya alınsın</label>
              <input type="number" min={1} value={settings?.autoSuspendAfterDefaults ?? ''} onChange={e => updateField('autoSuspendAfterDefaults', e.target.value)} className={numInput} />
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
