'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShieldCheck, Save, ArrowLeft, Users, Wallet, Ban, Receipt } from 'lucide-react';
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
          {/* Aktif Sürüm — TEK üst-seviye seçici (2026-08-08 kararı: V3, V2'nin içine gömülü bir
              alt-ayar DEĞİL, V1/V2 gibi kendi başına bağımsız bir sürümdür). Perde arkasında hâlâ
              2 flag var (paymentMode + directRevenueModel) ama admin'e TEK, atomik bir seçim olarak
              sunulur — admin'in yanlışlıkla geçersiz bir kombinasyon (örn. Emanet + Hizmet Bedeli)
              seçmesi mümkün değildir. */}
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6">
            <h2 className="font-semibold mb-1 flex items-center gap-2"><Wallet className="h-5 w-5 text-amber-400" /> Aktif Sürüm</h2>
            <p className="text-sm text-muted-foreground mb-4">
              <strong className="text-foreground">V1 — Emanet Sistemi:</strong> Para platform hesabına gelir,
              cari/hakediş işler, satıcıya biz öderiz.<br />
              <strong className="text-foreground">V2 — Kontör Sistemi:</strong> Para doğrudan satıcının hesabına
              gider; satıcı müzayede açmadan önce "Müzayede Hakkı" satın alır, gelirimiz bu.<br />
              <strong className="text-foreground">V3 — Hizmet Bedeli Sistemi:</strong> Para doğrudan satıcının
              hesabına gider (V2 ile aynı); ama satıcı önden ödemez, her satıştan SONRA hizmet bedelini bize öder.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={settings?.paymentMode !== 'DIRECT' ? 'V1' : (settings?.directRevenueModel === 'HIZMET_BEDELI' ? 'V3' : 'V2')}
                onChange={e => {
                  const v = e.target.value;
                  if (v === 'V1') setSettings((prev: any) => ({ ...prev, paymentMode: 'ESCROW' }));
                  else if (v === 'V2') setSettings((prev: any) => ({ ...prev, paymentMode: 'DIRECT', directRevenueModel: 'KONTOR' }));
                  else setSettings((prev: any) => ({ ...prev, paymentMode: 'DIRECT', directRevenueModel: 'HIZMET_BEDELI' }));
                }}
                className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none"
              >
                <option value="V1">V1 — Emanet Sistemi</option>
                <option value="V2">V2 — Kontör Sistemi</option>
                <option value="V3">V3 — Hizmet Bedeli Sistemi</option>
              </select>
              {settings?.paymentMode === 'DIRECT' && (
                <span className="text-xs text-amber-500 font-medium">
                  ⚠️ {settings?.directRevenueModel === 'HIZMET_BEDELI' ? 'V3' : 'V2'} aktif — kaydettikten sonra geçerli olur.
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Not: Sürüm değiştirmek eski kodu SİLMEZ; sadece akışı değiştirir. Hangi sürüme geçseniz
              de geri dönmek için tekrar o sürümü seçip kaydetmeniz yeterli — cari/ödeme takip/borç
              kayıtları anında geri gelir.
            </p>
          </div>

          {/* V3 (Hizmet Bedeli) seçiliyken görünen ek bilgiler + oran girişi */}
          {settings?.paymentMode === 'DIRECT' && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6">
              <h2 className="font-semibold mb-1 flex items-center gap-2"><Receipt className="h-5 w-5 text-amber-400" /> Hizmet Bedeli Oranı</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Alıcının satış bedeline ek ödeyip doğrudan satıcıya göndereceği tutar bu orandan
                hesaplanır — <strong className="text-foreground">hem V2 hem V3'te aynı şekilde</strong>.
                Satıcı bu oranı artık ne profilinden ne müzayede açarken değiştiremez.
              </p>
              <label className="flex items-center gap-2 text-sm">
                Standart Oran (%)
                <input
                  type="number" min={0} max={100} step={0.1}
                  value={settings?.serviceFeeRate ?? ''}
                  onChange={e => updateField('serviceFeeRate', e.target.value)}
                  className="w-20 rounded-lg border border-border bg-muted/50 px-2 py-1.5 text-sm focus:border-[#d4af37] focus:outline-none"
                />
              </label>
              <p className="text-xs text-muted-foreground mt-3">
                Bu, satıcı bazında özel bir oran belirtilmemişse geçerli olan varsayılan orandır.
                Belirli bir satıcıya standarttan farklı (örn. daha düşük) bir oran uygulamak
                isterseniz, <strong className="text-foreground">Satıcılar</strong> sayfasından o
                satıcıyı düzenleyip "Hizmet Bedeli Oranı" alanına girin — boş bırakılırsa buradaki
                standart oran geçerli olur.
              </p>
              {settings?.directRevenueModel === 'HIZMET_BEDELI' && (
                <p className="text-xs text-muted-foreground mt-2 border-t border-border/60 pt-2">
                  <strong className="text-foreground">V3'e özel:</strong> Borç hesaplanıyor, satıcı
                  "Ödedim" diyebiliyor, siz Finans → Hizmet Bedeli sekmesinden onaylıyorsunuz;
                  onaylamadığınız sürece satıcı yeni müzayede açamaz. Haftalık (her Pazartesi 09:00)
                  otomatik hatırlatma cron'u kuruldu ve aktif (cron-job.org, jobId 8227178).
                </p>
              )}
            </div>
          )}

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
