'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Settings, ImageIcon, Type, Mail, Phone, MapPin, Globe, Megaphone, Upload, Save, ArrowLeft, Eye, EyeOff, Link2, FileText, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export function SiteManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated' && user?.role !== 'ADMIN') { router.replace('/panel'); return; }
    if (status === 'authenticated') {
      fetch('/api/admin/site-settings')
        .then(r => r.json())
        .then(d => setSettings(d?.settings || {}))
        .catch(() => toast.error('Ayarlar yüklenemedi'))
        .finally(() => setLoading(false));
    }
  }, [status, router, user?.role]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data?.settings) {
        setSettings(data.settings);
        toast.success('Ayarlar kaydedildi');
      } else {
        toast.error(data?.error || 'Hata oluştu');
      }
    } catch {
      toast.error('Kaydetme hatası');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File, field: 'logoUrl' | 'heroImageUrl') => {
    setUploading(field);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const folder = field === 'logoUrl' ? 'logo' : 'hero';
      const fileName = `${Date.now()}-${folder}.${ext}`;
      const presignRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, contentType: file.type, folder: 'site' }),
      });
      const presignData = await presignRes.json();
      if (!presignData?.url) { toast.error('Yükleme hatası'); return; }
      await fetch(presignData.url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const publicUrl = presignData.publicUrl || presignData.url.split('?')[0];
      setSettings((prev: any) => ({ ...prev, [field]: publicUrl }));
      toast.success('Görsel yüklendi');
    } catch {
      toast.error('Görsel yüklenemedi');
    } finally {
      setUploading(null);
    }
  };

  const updateField = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  if (status === 'loading' || loading) {
    return <main className="flex-1 py-8"><div className="mx-auto max-w-[1000px] px-4"><div className="animate-pulse space-y-6"><div className="h-8 bg-muted rounded w-48" /><div className="h-64 bg-muted rounded-xl" /><div className="h-64 bg-muted rounded-xl" /></div></div></main>;
  }

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1000px] px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Settings className="h-6 w-6 text-[#d4af37]" />
            <h1 className="font-display text-2xl font-bold">Site Yönetimi</h1>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-[#d4af37] px-5 py-2.5 font-medium text-black hover:bg-[#c9a430] transition-colors disabled:opacity-50">
            <Save className="h-4 w-4" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>

        <div className="space-y-6">
          {/* Logo Section */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-[#d4af37]" />
              Logo
            </h2>
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden relative">
                {settings?.logoUrl ? (
                  <Image src={settings.logoUrl} alt="Logo" fill className="object-contain p-2" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Logo URL</label>
                  <input type="text" value={settings?.logoUrl || ''} onChange={e => updateField('logoUrl', e.target.value)} placeholder="https://i.gyazo.com/27ed7459a3d15844ca7f2e21acc3bcc8.png" className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">veya Yükle</label>
                  <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors w-fit">
                    <Upload className="h-4 w-4" />
                    {uploading === 'logoUrl' ? 'Yükleniyor...' : 'Görsel Seç'}
                    <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], 'logoUrl'); }} disabled={uploading === 'logoUrl'} />
                  </label>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Hero Banner */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-[#d4af37]" />
              Ana Sayfa Hero Banner
            </h2>
            <div className="space-y-4">
              {/* Hero Image */}
              <div className="relative w-full aspect-[21/9] rounded-xl border-2 border-dashed border-border overflow-hidden bg-muted/30">
                {settings?.heroImageUrl ? (
                  <Image src={settings.heroImageUrl} alt="Hero" fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="h-12 w-12 text-muted-foreground" /></div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Görsel URL</label>
                  <input type="text" value={settings?.heroImageUrl || ''} onChange={e => updateField('heroImageUrl', e.target.value)} placeholder="https://assets.justinmind.com/wp-content/uploads/2024/07/hero-image-examples-mars-explorer.png" className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">veya Yükle</label>
                  <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors w-fit">
                    <Upload className="h-4 w-4" />
                    {uploading === 'heroImageUrl' ? 'Yükleniyor...' : 'Görsel Seç'}
                    <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0], 'heroImageUrl'); }} disabled={uploading === 'heroImageUrl'} />
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Alt Başlık (üst kısım)</label>
                <input type="text" value={settings?.heroSubtitle || ''} onChange={e => updateField('heroSubtitle', e.target.value)} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Ana Başlık</label>
                <input type="text" value={settings?.heroTitle || ''} onChange={e => updateField('heroTitle', e.target.value)} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Açıklama</label>
                <textarea value={settings?.heroDescription || ''} onChange={e => updateField('heroDescription', e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none resize-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Buton 1 Yazısı</label>
                  <input type="text" value={settings?.heroCta1Text || ''} onChange={e => updateField('heroCta1Text', e.target.value)} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Buton 1 Link</label>
                  <input type="text" value={settings?.heroCta1Link || ''} onChange={e => updateField('heroCta1Link', e.target.value)} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Buton 2 Yazısı</label>
                  <input type="text" value={settings?.heroCta2Text || ''} onChange={e => updateField('heroCta2Text', e.target.value)} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Buton 2 Link</label>
                  <input type="text" value={settings?.heroCta2Link || ''} onChange={e => updateField('heroCta2Link', e.target.value)} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact Info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-[#d4af37]" />
              İletişim Bilgileri
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> E-posta</label>
                <input type="email" value={settings?.contactEmail || ''} onChange={e => updateField('contactEmail', e.target.value)} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> WhatsApp Hattı</label>
                <input type="text" value={settings?.contactPhone || ''} onChange={e => updateField('contactPhone', e.target.value)} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Adres</label>
                <input type="text" value={settings?.contactAddress || ''} onChange={e => updateField('contactAddress', e.target.value)} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
              </div>
            </div>
          </motion.div>

          {/* SEO */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 text-[#d4af37]" />
              SEO Ayarları
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Site Başlığı</label>
                <input type="text" value={settings?.siteTitle || ''} onChange={e => updateField('siteTitle', e.target.value)} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Site Açıklaması</label>
                <textarea value={settings?.siteDescription || ''} onChange={e => updateField('siteDescription', e.target.value)} rows={2} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none resize-none" />
              </div>
            </div>
          </motion.div>

          {/* Announcement Banner */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-[#d4af37]" />
              Duyuru Bannerı
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button onClick={() => updateField('announcementActive', !settings?.announcementActive)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings?.announcementActive ? 'bg-[#d4af37]' : 'bg-muted'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings?.announcementActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm font-medium">
                  {settings?.announcementActive ? <span className="flex items-center gap-1 text-[#d4af37]"><Eye className="h-4 w-4" /> Aktif</span> : <span className="flex items-center gap-1 text-muted-foreground"><EyeOff className="h-4 w-4" /> Pasif</span>}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Duyuru Metni</label>
                <input type="text" value={settings?.announcementText || ''} onChange={e => updateField('announcementText', e.target.value)} placeholder="Örn: 🎉 Yeni müzayede başladı!" className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block flex items-center gap-1"><Link2 className="h-3.5 w-3.5" /> Link (opsiyonel)</label>
                <input type="text" value={settings?.announcementLink || ''} onChange={e => updateField('announcementLink', e.target.value)} placeholder="/muzayedeler" className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
              </div>
            </div>
          </motion.div>

          {/* Banka / Ödeme Bilgileri */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }} className="rounded-xl border-2 border-[#d4af37]/30 bg-card p-6">
            <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#d4af37]" />
              Banka / Ödeme Bilgileri
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Alıcılara gösterilen havale/EFT bilgileri. Bu bilgileri değiştirdiğinizde tüm ödeme sayfalarında otomatik güncellenir.</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Banka Adı</label>
                <input type="text" value={settings?.bankName || ''} onChange={e => updateField('bankName', e.target.value)} placeholder="Örn: Ziraat Bankası" className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Hesap Sahibi</label>
                <input type="text" value={settings?.bankAccountHolder || ''} onChange={e => updateField('bankAccountHolder', e.target.value)} placeholder="Örn: Mezathane Bilişim Teknolojileri A.Ş." className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">IBAN</label>
                <input type="text" value={settings?.bankIban || ''} onChange={e => updateField('bankIban', e.target.value)} placeholder="TR00 0000 0000 0000 0000 0000 00" className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-mono focus:border-[#d4af37] focus:outline-none" />
              </div>
            </div>
          </motion.div>

          {/* Footer Description */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-xl border border-border bg-card p-6">
            <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#d4af37]" />
              Footer Açıklaması
            </h2>
            <textarea value={settings?.footerDescription || ''} onChange={e => updateField('footerDescription', e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none resize-none" />
          </motion.div>
        </div>

        {/* Bottom Save */}
        <div className="mt-8 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 rounded-lg bg-[#d4af37] px-6 py-3 font-medium text-black hover:bg-[#c9a430] transition-colors disabled:opacity-50">
            <Save className="h-4 w-4" />
            {saving ? 'Kaydediliyor...' : 'Tüm Ayarları Kaydet'}
          </button>
        </div>
      </div>
    </main>
  );
}
