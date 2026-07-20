'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { User, MapPin, Building2, CreditCard, Loader2, Save, Mail, Trash2, AlertTriangle, Lock, Send, Clock, X, CheckCircle2, XCircle } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { motion } from 'framer-motion';

type ChangeRequest = { id: string; fieldName: string; status: string; requestedValue: string; createdAt: string };

// Tüm kilitli alanlar ve etiketleri
const ALL_LOCKED_FIELDS: Record<string, { label: string; modelName: string }> = {
  fullName: { label: 'Ad Soyad', modelName: 'User' },
  phone: { label: 'Telefon', modelName: 'User' },
  tcKimlikNo: { label: 'TC Kimlik No', modelName: 'User' },
  address: { label: 'Adres', modelName: 'User' },
  city: { label: 'İl', modelName: 'User' },
  district: { label: 'İlçe', modelName: 'User' },
  postalCode: { label: 'Posta Kodu', modelName: 'User' },
  shippingAddress: { label: 'Gönderim Adresi', modelName: 'User' },
  billingAddress: { label: 'Fatura Adresi', modelName: 'User' },
  companyName: { label: 'Şirket Adı', modelName: 'User' },
  taxOffice: { label: 'Vergi Dairesi', modelName: 'User' },
  taxNumber: { label: 'Vergi No', modelName: 'User' },
};

export function ProfileSettings() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeField, setChangeField] = useState('');
  const [changeValue, setChangeValue] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [submittingChange, setSubmittingChange] = useState(false);
  const [form, setForm] = useState({
    fullName: '', phone: '', tcKimlikNo: '', isCompany: false,
    companyName: '', taxOffice: '', taxNumber: '',
    address: '', shippingAddress: '', billingAddress: '',
    city: '', district: '', postalCode: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/giris');
  }, [status, router]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/buyer/profile');
      if (res.ok) {
        const data = await res.json();
        setForm({
          fullName: data.fullName ?? '',
          phone: data.phone ?? '',
          tcKimlikNo: data.tcKimlikNo ?? '',
          isCompany: data.isCompany ?? false,
          companyName: data.companyName ?? '',
          taxOffice: data.taxOffice ?? '',
          taxNumber: data.taxNumber ?? '',
          address: data.address ?? '',
          shippingAddress: data.shippingAddress ?? '',
          billingAddress: data.billingAddress ?? '',
          city: data.city ?? '',
          district: data.district ?? '',
          postalCode: data.postalCode ?? '',
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

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfile();
      fetchChangeRequests();
    }
  }, [status, fetchProfile, fetchChangeRequests]);

  const getPendingRequest = (fieldName: string) => changeRequests.find(r => r.fieldName === fieldName && r.status === 'PENDING');

  const openChangeRequest = (fieldName: string) => {
    setChangeField(fieldName);
    setChangeValue('');
    setChangeReason('');
    setShowChangeModal(true);
  };

  const submitChangeRequest = async () => {
    if (!changeValue.trim()) { toast.error('Yeni değer boş olamaz'); return; }
    setSubmittingChange(true);
    try {
      const fieldInfo = ALL_LOCKED_FIELDS[changeField];
      const res = await fetch('/api/field-change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldName: changeField,
          modelName: fieldInfo?.modelName || 'User',
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

  if (loading) {
    return <div className="flex justify-center items-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" /></div>;
  }

  const readOnlyClass = 'w-full rounded-lg border border-border bg-muted/50 py-2.5 px-4 text-sm text-muted-foreground cursor-not-allowed';
  const lockedClass = 'w-full rounded-lg border border-amber-500/30 bg-amber-500/5 py-2.5 px-4 text-sm text-muted-foreground cursor-not-allowed';
  const inputClass = 'w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]';

  // Kilitli alan bileşeni
  const LockedField = ({ fieldName, value, label, multiline }: { fieldName: string; value: string; label: string; multiline?: boolean }) => {
    const hasValue = value && value.trim() !== '';
    const pending = getPendingRequest(fieldName);
    return (
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
          {hasValue ? <Lock className="h-3 w-3" /> : null} {label}
        </label>
        {multiline ? (
          <textarea value={value || '—'} readOnly rows={2} className={hasValue ? lockedClass + ' resize-none' : readOnlyClass + ' resize-none'} />
        ) : (
          <input value={value || '—'} readOnly className={hasValue ? lockedClass : readOnlyClass} />
        )}
        {hasValue && (
          pending ? (
            <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Değişiklik talebi bekleniyor: &ldquo;{pending.requestedValue}&rdquo;
            </p>
          ) : (
            <button
              onClick={() => openChangeRequest(fieldName)}
              className="text-[11px] text-[#d4af37] hover:underline mt-1 flex items-center gap-1"
            >
              <Send className="h-3 w-3" /> Değişiklik Talep Et
            </button>
          )
        )}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Genel bilgi notu */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
        <p className="text-xs text-amber-400 flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5" />
          Kayıt sırasında girilen bilgiler güvenlik nedeniyle kilitlidir. Değişiklik için &ldquo;Değişiklik Talep Et&rdquo; butonunu kullanabilirsiniz.
        </p>
      </div>

      {/* Kişisel Bilgiler */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#d4af37] flex items-center gap-1.5"><User className="h-4 w-4" /> Kişisel Bilgiler</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <LockedField fieldName="fullName" value={form.fullName} label="Ad Soyad" />
          <LockedField fieldName="phone" value={form.phone} label="Telefon" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1"><Mail className="h-3 w-3" /> E-posta Adresi</label>
          <input type="email" value={(session?.user as any)?.email ?? ''} readOnly className={readOnlyClass} />
          <p className="text-[10px] text-muted-foreground mt-1">E-posta adresi güvenlik nedeniyle değiştirilemez</p>
        </div>
      </div>

      {/* Kimlik / Vergi Bilgileri */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#d4af37] flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> Kimlik / Vergi Bilgileri</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Hesap türü: <strong>{form.isCompany ? 'Kurumsal' : 'Bireysel'}</strong>
          </span>
        </div>
        {!form.isCompany ? (
          <LockedField fieldName="tcKimlikNo" value={form.tcKimlikNo} label="TC Kimlik No" />
        ) : (
          <div className="space-y-3">
            <LockedField fieldName="companyName" value={form.companyName} label="Şirket Adı" />
            <div className="grid grid-cols-2 gap-3">
              <LockedField fieldName="taxOffice" value={form.taxOffice} label="Vergi Dairesi" />
              <LockedField fieldName="taxNumber" value={form.taxNumber} label="Vergi No" />
            </div>
            <LockedField fieldName="tcKimlikNo" value={form.tcKimlikNo} label="TC Kimlik No (Yetkili Kişi)" />
          </div>
        )}
      </div>

      {/* Adres Bilgileri */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#d4af37] flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Genel Adres</h3>
        <LockedField fieldName="address" value={form.address} label="Adres" multiline />
        <div className="grid grid-cols-3 gap-3">
          <LockedField fieldName="city" value={form.city} label="İl" />
          <LockedField fieldName="district" value={form.district} label="İlçe" />
          <LockedField fieldName="postalCode" value={form.postalCode} label="Posta Kodu" />
        </div>
      </div>

      {/* Gönderim Adresi */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#d4af37] flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Gönderim Adresi</h3>
        <p className="text-xs text-muted-foreground">Kazandığınız ürünlerin gönderileceği adres</p>
        <LockedField fieldName="shippingAddress" value={form.shippingAddress} label="Gönderim Adresi" multiline />
      </div>

      {/* Fatura Adresi */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[#d4af37] flex items-center gap-1.5"><Building2 className="h-4 w-4" /> Fatura Adresi</h3>
        <LockedField fieldName="billingAddress" value={form.billingAddress} label="Fatura Adresi" multiline />
      </div>

      {/* Bekleyen/Son talepler */}
      {changeRequests.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#d4af37] flex items-center gap-1.5"><Clock className="h-4 w-4" /> Değişiklik Talepleri</h3>
          <div className="space-y-2">
            {changeRequests.slice(0, 10).map(r => {
              const label = ALL_LOCKED_FIELDS[r.fieldName]?.label || r.fieldName;
              return (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground ml-2">→ &ldquo;{r.requestedValue}&rdquo;</span>
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
        </div>
      )}

      {/* KVKK Unutulma Hakkı — Hesabımı Sil */}
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-red-500 flex items-center gap-1.5"><Trash2 className="h-4 w-4" /> Hesabımı Sil (KVKK Unutulma Hakkı)</h3>
        <p className="text-xs text-muted-foreground">
          KVKK Madde 7 kapsamında kişisel verilerinizin silinmesini/anonimleştirilmesini talep edebilirsiniz.
          Bu işlem geri alınamaz. Teklif geçmişiniz anonim olarak saklanır, kişisel bilgileriniz kalıcı olarak silinir.
        </p>
        <p className="text-xs text-red-400">
          <AlertTriangle className="h-3 w-3 inline mr-1" />
          Aktif müzayedede teklifiniz, ödenmemiş borcunuz veya açık anlaşmazlığınız varsa bu işlem yapılamaz.
        </p>
        <p className="text-[10px] text-muted-foreground">
          TTK m.82 gereği fatura ve ödeme kayıtları yasal saklama süresi (10 yıl) boyunca korunur.
          TC Kimlik No şifreli olarak saklanır, diğer kişisel bilgileriniz kalıcı olarak silinir.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="rounded-lg border border-red-500/50 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" /> Hesabımı Kalıcı Olarak Sil
        </button>
      </div>

      {/* Hesap Silme Onay Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-bold">Hesap Silme Onayı</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Bu işlem geri alınamaz. Adınız, adresiniz, telefonunuz kalıcı olarak silinecektir.
              Yasal zorunluluklar gereği TC Kimlik No şifreli olarak, fatura ve ödeme kayıtları 10 yıl boyunca saklanacaktır.
            </p>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
                <Lock className="h-3 w-3" /> Şifrenizi onay için girin
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Mevcut şifreniz"
                className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeletePassword(''); }}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
              >
                İptal
              </button>
              <button
                onClick={async () => {
                  if (!deletePassword) { toast.error('Şifrenizi girmelisiniz'); return; }
                  setDeleting(true);
                  try {
                    const res = await fetch('/api/user/delete-account', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ confirmPassword: deletePassword }),
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                      toast.success('Hesabınız başarıyla silindi.');
                      setTimeout(() => signOut({ callbackUrl: '/' }), 1500);
                    } else {
                      toast.error(data?.error || 'Hesap silinemedi');
                    }
                  } catch {
                    toast.error('Bir hata oluştu');
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? 'Siliniyor...' : 'Evet, Hesabımı Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Değişiklik Talep Modal */}
      {showChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowChangeModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Değişiklik Talep Et</h3>
              <button onClick={() => setShowChangeModal(false)} className="rounded-lg p-1 hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block text-muted-foreground">Alan</label>
                <input value={ALL_LOCKED_FIELDS[changeField]?.label || changeField} readOnly className={readOnlyClass} />
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
                <button onClick={() => setShowChangeModal(false)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">İptal</button>
                <button
                  onClick={submitChangeRequest}
                  disabled={submittingChange || !changeValue.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#d4af37] py-2.5 text-sm font-bold text-black hover:bg-[#c9a430] transition-colors disabled:opacity-50"
                >
                  {submittingChange ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Gönder
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
