'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShieldCheck, Save, ArrowLeft, Users, Wallet, Ban, Gift, Receipt } from 'lucide-react';
import { toast } from 'sonner';

export function RulesManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
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
    }
  }, [status, router, user?.role]);

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
          trialRightEnabled: Boolean(settings.trialRightEnabled),
          directRevenueModel: settings.directRevenueModel === 'HIZMET_BEDELI' ? 'HIZMET_BEDELI' : 'KONTOR',
          serviceFeeRate: Number(settings.serviceFeeRate),
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

          {/* DIRECT içi gelir modeli (AŞAMA 3, 2026-08-06) — henüz sadece alt yapı */}
          {settings?.paymentMode === 'DIRECT' && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-6">
              <h2 className="font-semibold mb-1 flex items-center gap-2"><Receipt className="h-5 w-5 text-red-400" /> DIRECT Gelir Modeli (yapım aşamasında)</h2>
              <p className="text-sm text-muted-foreground mb-4">
                <strong className="text-foreground">KONTOR:</strong> Satıcı önden Müzayede Hakkı satın alır (mevcut). <br />
                <strong className="text-foreground">HİZMET BEDELİ:</strong> Satıcı önden ödemez, her satıştan sonra
                hizmet bedelini SONRADAN haftalık toplu fatura ile öder.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={settings?.directRevenueModel === 'HIZMET_BEDELI' ? 'HIZMET_BEDELI' : 'KONTOR'}
                  onChange={e => updateField('directRevenueModel', e.target.value)}
                  className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none"
                >
                  <option value="KONTOR">KONTOR — satıcı önden hak satın alır</option>
                  <option value="HIZMET_BEDELI">HİZMET BEDELİ — satıcı satış sonrası öder</option>
                </select>
                <label className="flex items-center gap-2 text-sm">
                  Oran (%)
                  <input
                    type="number" min={0} max={100} step={0.1}
                    value={settings?.serviceFeeRate ?? ''}
                    onChange={e => updateField('serviceFeeRate', e.target.value)}
                    className="w-20 rounded-lg border border-border bg-muted/50 px-2 py-1.5 text-sm focus:border-[#d4af37] focus:outline-none"
                  />
                </label>
              </div>
              <p className="text-xs text-red-500 font-medium mt-3">
                ⚠️ Alt yapı henüz eksik: borç hesaplanıyor, satıcı görüp "Ödedim" diyebiliyor —
                ama admin onay ekranı ve yeni-müzayede kısıtlaması (AŞAMA 3d) henüz yok. Şimdilik
                satıcının "Ödedim" bildirimini yalnızca uygulama-içi bildirimden görüp elle takip
                edebilirsiniz; onaylama arayüzü olmadan bu ayarı HİZMET BEDELİ'ne çevirmeyin.
              </p>
            </div>
          )}

          {/* Deneme hakkı kampanyası (pazarlama) */}
          <div className="rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/5 p-6">
            <h2 className="font-semibold mb-1 flex items-center gap-2"><Gift className="h-5 w-5 text-[#d4af37]" /> Ücretsiz Deneme Hakkı Kampanyası</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Açıkken, <strong className="text-foreground">onayladığınız her yeni satıcıya</strong> otomatik olarak
              <strong className="text-foreground"> 1 ücretsiz müzayede hakkı</strong> tanımlanır (30 gün geçerli, satıcı başına 1 kez).
              Satıcı ilk müzayedesini ücretsiz açar. Kapatırsanız yeni onaylarda hak verilmez; verilmiş haklar etkilenmez.
            </p>
            <label className="inline-flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={settings?.trialRightEnabled !== false}
                onChange={e => updateField('trialRightEnabled', e.target.checked)}
                className="h-5 w-5 rounded border-border accent-[#d4af37]"
              />
              <span className="text-sm font-medium">
                {settings?.trialRightEnabled !== false ? 'Kampanya açık — yeni satıcılara deneme hakkı veriliyor' : 'Kampanya kapalı'}
              </span>
            </label>
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

          {/* Otomatik askı — 2026-08-01 itibarıyla PASİF */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-6 opacity-70">
            <h2 className="font-display font-semibold text-lg mb-1 flex items-center gap-2"><Ban className="h-5 w-5 text-muted-foreground" /> Otomatik Askı (şu an devre dışı)</h2>
            <p className="text-xs text-muted-foreground mb-4">
              2026-08-01'de kaldırıldı: borcunu geç de olsa ödemek isteyen kullanıcı, hesabı kilitlenince ödeme
              sayfasına da erişemiyordu. Artık tek yaptırım, teklif verirken kontrol edilen borç/limit engeli —
              kullanıcı ödeyene kadar yalnızca <strong>yeni teklif veremiyor</strong>, girişi kapanmıyor. Vadesi{' '}
              <strong>15 gün</strong> geçen ödemeler için admin'e bildirim gider, hesabı elle askıya almak isterseniz
              Kullanıcılar sayfasından yapabilirsiniz. Bu alan aşağıda kayıtlı kalır, ileride otomatik askı tekrar
              istenirse buradan devreye alınabilir.
            </p>
            <div className="max-w-xs">
              <label className="text-sm font-medium mb-1 block text-muted-foreground">Kaç ihlalden sonra askıya alınsın (şu an okunmuyor)</label>
              <input type="number" min={1} value={settings?.autoSuspendAfterDefaults ?? ''} onChange={e => updateField('autoSuspendAfterDefaults', e.target.value)} className={numInput} disabled />
            </div>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
