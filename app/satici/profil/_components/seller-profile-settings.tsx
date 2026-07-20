'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  ArrowLeft, Save, Loader2, Store, Camera, Mail, Phone, Building2,
  FileText, CreditCard, MapPin, Info, Lock, Send, X, Clock, CheckCircle2, XCircle,
  Upload, Paperclip, Trash2, AlertTriangle,
} from 'lucide-react';
import { validateIBAN } from '@/lib/iban';

type ChangeRequest = { id: string; fieldName: string; status: string; requestedValue: string; createdAt: string };

const LOCKED_SELLER_FIELDS: Record<string, { label: string; modelName: string }> = {
  companyName: { label: 'Firma Unvanı', modelName: 'SellerProfile' },
  taxOffice: { label: 'Vergi Dairesi', modelName: 'SellerProfile' },
  taxNumber: { label: 'Vergi Numarası', modelName: 'SellerProfile' },
  mersisNo: { label: 'Mersis No', modelName: 'SellerProfile' },
  iban: { label: 'IBAN', modelName: 'SellerProfile' },
  companyAddress: { label: 'Firma Adresi', modelName: 'SellerProfile' },
  phone: { label: 'Telefon', modelName: 'User' },
  fullName: { label: 'Ad Soyad', modelName: 'User' },
};

export function SellerProfileSettings() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const user = session?.user as any;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    companyAddress: '',
    description: '',
    logoUrl: '',
    iban: '',
    phone: '',
    email: '',
    fullName: '',
    taxOffice: '',
    taxNumber: '',
    mersisNo: '',
  });
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeField, setChangeField] = useState('');
  const [changeValue, setChangeValue] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [submittingChange, setSubmittingChange] = useState(false);
  // Ek belgeler state
  const [additionalDocs, setAdditionalDocs] = useState<{ id: string; label: string; fileName: string; createdAt: string }[]>([]);
  const [newDocLabel, setNewDocLabel] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/giris');
    if (status === 'authenticated' && user?.role !== 'SELLER' && user?.role !== 'ADMIN') {
      router.push('/panel');
    }
  }, [status, router, user?.role]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/seller/profile');
      if (res.ok) {
        const data = await res.json();
        setForm({
          companyName: data.companyName ?? '',
          companyAddress: data.companyAddress ?? '',
          description: data.description ?? '',
          logoUrl: data.logoUrl ?? '',
          iban: data.iban ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          fullName: data.fullName ?? '',
          taxOffice: data.taxOffice ?? '',
          taxNumber: data.taxNumber ?? '',
          mersisNo: data.mersisNo ?? '',
        });
      }
    } catch {
      toast.error('Profil yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChangeRequests = useCallback(async () => {
    try {
      const res = await fetch('/api/field-change-requests');
      if (res.ok) {
        const data = await res.json();
        setChangeRequests(data.requests || []);
      }
    } catch {}
  }, []);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/seller/documents');
      if (res.ok) {
        const data = await res.json();
        setAdditionalDocs(data.documents || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfile();
      fetchChangeRequests();
      fetchDocs();
    }
  }, [status, fetchProfile, fetchChangeRequests, fetchDocs]);

  const compressImage = (file: File, maxWidth = 400, quality = 0.85): Promise<{ blob: Blob; type: string }> => {
    return new Promise((resolve) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve({ blob: file, type: file.type }); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve({ blob, type: 'image/webp' });
            else canvas.toBlob(
              (jpegBlob) => resolve({ blob: jpegBlob || file, type: 'image/jpeg' }),
              'image/jpeg', quality
            );
          },
          'image/webp', quality
        );
      };
      img.onerror = () => resolve({ blob: file, type: file.type });
      img.src = URL.createObjectURL(file);
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo dosyası 5MB\'dan büyük olamaz');
      return;
    }
    setUploading(true);
    try {
      const { blob: compressed, type: compressedType } = await compressImage(file);
      const ext = compressedType === 'image/webp' ? 'webp' : 'jpg';
      const fileName = `logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const presignRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, contentType: compressedType, isPublic: true }),
      });
      const { uploadUrl, publicUrl } = await presignRes.json();
      const headers: Record<string, string> = { 'Content-Type': compressedType };
      if (uploadUrl.includes('content-disposition')) headers['Content-Disposition'] = 'attachment';
      await fetch(uploadUrl, { method: 'PUT', headers, body: compressed });
      setForm(prev => ({ ...prev, logoUrl: publicUrl }));
      toast.success('Logo yüklendi');
    } catch {
      toast.error('Logo yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/seller/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description,
          logoUrl: form.logoUrl,
        }),
      });
      if (res.ok) {
        toast.success('Profil güncellendi');
      } else {
        const data = await res.json();
        toast.error(data?.error ?? 'Güncelleme başarısız');
      }
    } catch {
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const openChangeRequest = (fieldName: string) => {
    setChangeField(fieldName);
    setChangeValue('');
    setChangeReason('');
    setShowChangeModal(true);
  };

  const submitChangeRequest = async () => {
    if (!changeValue.trim()) { toast.error('Yeni değer boş olamaz'); return; }
    // IBAN alanı için format + checksum doğrulaması
    if (changeField === 'iban') {
      const ibanResult = validateIBAN(changeValue);
      if (!ibanResult.valid) { toast.error(ibanResult.error); return; }
    }
    setSubmittingChange(true);
    try {
      const fieldInfo = LOCKED_SELLER_FIELDS[changeField];
      const res = await fetch('/api/field-change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldName: changeField,
          modelName: fieldInfo?.modelName || 'SellerProfile',
          currentValue: (form as any)[changeField] || '',
          requestedValue: changeValue.trim(),
          reason: changeReason.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast.success('Değişiklik talebiniz gönderildi, admin onayı bekleniyor');
        setShowChangeModal(false);
        fetchChangeRequests();
      } else {
        const data = await res.json();
        toast.error(data?.error ?? 'Talep gönderilemedi');
      }
    } catch {
      toast.error('Bir hata oluştu');
    } finally {
      setSubmittingChange(false);
    }
  };

  const getPendingRequest = (fieldName: string) => changeRequests.find(r => r.fieldName === fieldName && r.status === 'PENDING');

  if (loading) {
    return <div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" /></div>;
  }

  const inputClass = 'w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]';
  const readOnlyClass = 'w-full rounded-lg border border-border bg-muted/50 py-2.5 px-4 text-sm text-muted-foreground cursor-not-allowed';
  const lockedClass = 'w-full rounded-lg border border-amber-500/30 bg-amber-500/5 py-2.5 px-4 text-sm text-muted-foreground cursor-not-allowed';

  const LockedField = ({ fieldName, value, label }: { fieldName: string; value: string; label: string }) => {
    const pending = getPendingRequest(fieldName);
    return (
      <div>
        <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5 text-muted-foreground">
          <Lock className="h-3 w-3" /> {label}
        </label>
        <input value={value || '—'} readOnly className={lockedClass} />
        {pending ? (
          <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Değişiklik talebi bekleniyor: "{pending.requestedValue}"
          </p>
        ) : (
          <button
            onClick={() => openChangeRequest(fieldName)}
            className="text-[11px] text-[#d4af37] hover:underline mt-1 flex items-center gap-1"
          >
            <Send className="h-3 w-3" /> Değişiklik Talep Et
          </button>
        )}
      </div>
    );
  };

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold">Mağaza Profilim</h1>
          <p className="text-sm text-muted-foreground">Firma bilgilerinizi ve logonuzu yönetin</p>
        </div>
      </motion.div>

      <div className="space-y-6">
        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/50 bg-card p-6"
        >
          <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
            <Camera className="h-5 w-5 text-[#d4af37]" /> Mağaza Logosu
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative h-24 w-24 rounded-xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden">
              {form.logoUrl ? (
                <Image src={form.logoUrl} alt="Logo" fill className="object-cover" sizes="96px" />
              ) : (
                <Store className="h-10 w-10 text-muted-foreground/40" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className={`inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-bold text-black hover:bg-[#c9a430] transition-colors cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <Camera className="h-4 w-4" />
                {form.logoUrl ? 'Logo Değiştir' : 'Logo Yükle'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
              <p className="text-xs text-muted-foreground mt-2">Önerilen: Kare format (1:1), minimum 200x200px, maksimum 5MB</p>
              <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Logo, müzayede kapak fotoğraflarında ve mağaza profilinizde görünecektir
              </p>
            </div>
          </div>
        </motion.div>

        {/* Account Info (Read-only) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border/50 bg-card p-6"
        >
          <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-[#d4af37]" /> Hesap Bilgileri
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block text-muted-foreground">E-posta Adresi</label>
              <input value={form.email} readOnly className={readOnlyClass} />
              <p className="text-[10px] text-muted-foreground mt-1">E-posta adresi güvenlik nedeniyle değiştirilemez</p>
            </div>
            <LockedField fieldName="fullName" value={form.fullName} label="Ad Soyad" />
          </div>
        </motion.div>

        {/* Company Info — kilitli alanlar + düzenlenebilir alanlar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border/50 bg-card p-6"
        >
          <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#d4af37]" /> Firma Bilgileri
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LockedField fieldName="companyName" value={form.companyName} label="Firma / Müzayede Evi Adı" />
              <LockedField fieldName="phone" value={form.phone} label="Telefon" />
            </div>
            <LockedField fieldName="companyAddress" value={form.companyAddress} label="Firma Adresi" />
            <div>
              <label className="text-sm font-medium mb-1.5 block">Mağaza Açıklaması</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className={inputClass}
                placeholder="Müzayede evinizi ve uzmanlık alanlarınızı tanıtın..."
              />
            </div>
          </div>
        </motion.div>

        {/* Tax & Financial — tümü kilitli */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl border border-border/50 bg-card p-6"
        >
          <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#d4af37]" /> Vergi & Finansal Bilgiler
          </h2>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mb-4">
            <p className="text-xs text-amber-400 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Bu alandaki bilgiler güvenlik nedeniyle kilitlidir. Değişiklik için talep oluşturabilirsiniz.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LockedField fieldName="taxOffice" value={form.taxOffice} label="Vergi Dairesi" />
            <LockedField fieldName="taxNumber" value={form.taxNumber} label="Vergi Numarası" />
            <LockedField fieldName="mersisNo" value={form.mersisNo} label="Mersis No" />
            <LockedField fieldName="iban" value={form.iban} label="IBAN" />
          </div>
        </motion.div>

        {/* Ek Belgeler */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border/50 bg-card p-6"
        >
          <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-[#d4af37]" /> Ek Belgeler
          </h2>
          <p className="text-xs text-muted-foreground mb-4">İmza sirküleri, faaliyet belgesi vb. ek belgelerinizi buradan yükleyebilirsiniz.</p>
          {additionalDocs.length > 0 && (
            <div className="space-y-2 mb-4">
              {additionalDocs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.label}</p>
                    <p className="text-[10px] text-muted-foreground">{doc.fileName} • {new Date(doc.createdAt).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <button
                    disabled={deletingDocId === doc.id}
                    onClick={async () => {
                      setDeletingDocId(doc.id);
                      try {
                        const res = await fetch(`/api/seller/documents?id=${doc.id}`, { method: 'DELETE' });
                        if (res.ok) { toast.success('Belge silindi'); fetchDocs(); }
                        else toast.error('Belge silinemedi');
                      } catch { toast.error('Hata oluştu'); }
                      finally { setDeletingDocId(null); }
                    }}
                    className="text-red-400 hover:text-red-500 p-1"
                  >
                    {deletingDocId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newDocLabel}
              onChange={(e) => setNewDocLabel(e.target.value)}
              placeholder="Belge açıklaması (ör: İmza Sirküleri)"
              className="flex-1 rounded-lg border border-border bg-background py-2 px-3 text-sm focus:border-[#d4af37] focus:outline-none"
            />
            <label className={`inline-flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2 text-sm cursor-pointer hover:border-[#d4af37] transition-colors ${!newDocLabel.trim() || uploadingDoc ? 'opacity-50 pointer-events-none' : ''}`}>
              {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Dosya Seç
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !newDocLabel.trim()) return;
                if (file.size > 10 * 1024 * 1024) { toast.error('Dosya 10MB\'dan büyük olamaz'); return; }
                setUploadingDoc(true);
                try {
                  const presignRes = await fetch('/api/upload/presigned', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: false }),
                  });
                  const { uploadUrl, cloud_storage_path } = await presignRes.json();
                  await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
                  const docRes = await fetch('/api/seller/documents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ label: newDocLabel.trim(), fileUrl: uploadUrl.split('?')[0], filePath: cloud_storage_path, fileName: file.name, contentType: file.type }),
                  });
                  if (docRes.ok) {
                    toast.success('Belge yüklendi');
                    setNewDocLabel('');
                    fetchDocs();
                  } else toast.error('Belge kaydedilemedi');
                } catch { toast.error('Yükleme başarısız'); }
                finally { setUploadingDoc(false); }
                e.target.value = '';
              }} />
            </label>
          </div>
        </motion.div>

        {/* Bekleyen/Son talepler */}
        {changeRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-2xl border border-border/50 bg-card p-6"
          >
            <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#d4af37]" /> Değişiklik Talepleri
            </h2>
            <div className="space-y-2">
              {changeRequests.slice(0, 10).map(r => {
                const label = LOCKED_SELLER_FIELDS[r.fieldName]?.label || r.fieldName;
                return (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <div>
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground ml-2">→ "{r.requestedValue}"</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {r.status === 'PENDING' && <><Clock className="h-3.5 w-3.5 text-amber-500" /><span className="text-amber-500 text-xs">Beklemede</span></>}
                      {r.status === 'APPROVED' && <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /><span className="text-green-500 text-xs">Onaylandı</span></>}
                      {r.status === 'REJECTED' && <><XCircle className="h-3.5 w-3.5 text-red-500" /><span className="text-red-500 text-xs">Reddedildi</span></>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="flex justify-end pb-8"
        >
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-[#d4af37] px-8 py-3 text-sm font-bold text-black hover:bg-[#c9a430] transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </button>
        </motion.div>
      </div>

      {/* Değişiklik Talep Modal */}
      {showChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">Değişiklik Talep Et</h3>
              <button onClick={() => setShowChangeModal(false)} className="rounded-lg p-1 hover:bg-muted transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block text-muted-foreground">Alan</label>
                <input value={LOCKED_SELLER_FIELDS[changeField]?.label || changeField} readOnly className={readOnlyClass} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block text-muted-foreground">Mevcut Değer</label>
                <input value={(form as any)[changeField] || '—'} readOnly className={readOnlyClass} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Yeni Değer *</label>
                <input value={changeValue} onChange={e => setChangeValue(e.target.value)} className={inputClass} placeholder="Değiştirilmesini istediğiniz yeni değer" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Açıklama (Opsiyonel)</label>
                <textarea value={changeReason} onChange={e => setChangeReason(e.target.value)} rows={2} className={inputClass} placeholder="Değişiklik nedeninizi belirtin..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowChangeModal(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                  İptal
                </button>
                <button
                  onClick={submitChangeRequest}
                  disabled={submittingChange || !changeValue.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#d4af37] py-2.5 text-sm font-bold text-black hover:bg-[#c9a430] transition-colors disabled:opacity-50"
                >
                  {submittingChange ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Gönder
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
