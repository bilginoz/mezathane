'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Store, Building, FileText, Upload, CreditCard, Loader2, CheckCircle2, ArrowLeft, User, Mail, Phone, Lock, Eye, EyeOff, MapPin, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { validateTCKimlikNo } from '@/lib/tc-kimlik';
import { validateIBAN } from '@/lib/iban';

export default function SellerApplyPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const isLoggedIn = status === 'authenticated' && !!session?.user;

  // === Hesap alanları (anonim ziyaretçi için) ===
  const [accountForm, setAccountForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
    tcKimlikNo: '', address: '', city: '', district: '', postalCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [kvkkConsent, setKvkkConsent] = useState(false);

  // === Şirket alanları (herkes için) ===
  const [companyForm, setCompanyForm] = useState({
    companyName: '', companyAddress: '', taxOffice: '', taxNumber: '',
    iban: '', description: '', mersisNo: '', contactEmail: '',
  });
  const [taxDocFile, setTaxDocFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<{ label: string; file: File }[]>([]);
  const [newAdditionalLabel, setNewAdditionalLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleAccountChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setAccountForm(p => ({ ...p, [field]: value }));
  };

  const uploadTaxDocument = async (file: File): Promise<{ url: string; path: string } | null> => {
    try {
      const res = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: false }),
      });
      const { uploadUrl, cloud_storage_path } = await res.json();
      await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      return { url: uploadUrl.split('?')[0], path: cloud_storage_path };
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // === Anonim kullanıcı: hesap alanları doğrula ===
    if (!isLoggedIn) {
      if (!accountForm.fullName.trim()) { toast.error('Ad Soyad zorunludur'); return; }
      if (!accountForm.email.trim()) { toast.error('E-posta zorunludur'); return; }
      if (!accountForm.phone.trim() || accountForm.phone.replace(/\D/g, '').length < 10) {
        toast.error('Geçerli bir telefon numarası giriniz (en az 10 hane)'); return;
      }
      if (!accountForm.password || accountForm.password.length < 8) {
        toast.error('Şifre en az 8 karakter olmalıdır'); return;
      }
      if (accountForm.password !== accountForm.confirmPassword) {
        toast.error('Şifreler eşleşmiyor'); return;
      }
      if (!accountForm.tcKimlikNo) { toast.error('TC Kimlik No zorunludur'); return; }
      if (!validateTCKimlikNo(accountForm.tcKimlikNo)) {
        toast.error('Geçersiz TC Kimlik No. Lütfen doğru TC Kimlik numaranızı girin.'); return;
      }
      if (!accountForm.address.trim()) { toast.error('Adres bilgisi zorunludur'); return; }
      if (!accepted) { toast.error('Üyelik sözleşmesini onaylamalısınız'); return; }
      if (!kvkkConsent) { toast.error('KVKK açık rıza onayı zorunludur'); return; }
    }

    // === Şirket alanları doğrula (herkes için) ===
    if (!companyForm.companyName.trim()) { toast.error('Firma Unvanı zorunludur'); return; }
    if (!companyForm.contactEmail.trim()) { toast.error('Firma E-posta adresi zorunludur'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.contactEmail.trim())) {
      toast.error('Geçerli bir firma e-posta adresi giriniz'); return;
    }
    if (!companyForm.taxOffice.trim()) { toast.error('Vergi Dairesi zorunludur'); return; }
    if (!companyForm.taxNumber.trim()) { toast.error('Vergi Numarası zorunludur'); return; }
    if (!companyForm.iban.trim()) { toast.error('Banka IBAN zorunludur'); return; }
    const ibanResult = validateIBAN(companyForm.iban);
    if (!ibanResult.valid) { toast.error(ibanResult.error); return; }
    if (!taxDocFile) { toast.error('Vergi Levhası yüklemek zorunludur'); return; }

    setLoading(true);
    try {
      if (isLoggedIn) {
        // === Giriş yapmış kullanıcı: önce dosya yükle, sonra başvuru ===
        setUploading(true);
        const docResult = await uploadTaxDocument(taxDocFile);
        setUploading(false);
        if (!docResult) { toast.error('Vergi levhası yüklenemedi'); setLoading(false); return; }

        const res = await fetch('/api/seller/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...companyForm,
            taxDocumentUrl: docResult.url,
            taxDocumentPath: docResult.path,
          }),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data?.error ?? 'Başvuru hatası'); setLoading(false); return; }

        // Ek belgeleri yükle
        for (const af of additionalFiles) {
          try {
            const adRes = await uploadTaxDocument(af.file);
            if (adRes) {
              await fetch('/api/seller/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: af.label, fileUrl: adRes.url, filePath: adRes.path, fileName: af.file.name, contentType: af.file.type }),
              });
            }
          } catch { console.error('Additional doc upload failed:', af.label); }
        }

        setSubmitted(true);
      } else {
        // === Anonim kullanıcı: 1) Hesap oluştur  2) Giriş yap  3) Dosya yükle  4) Profili güncelle ===
        // Adım 1: Hesap + SellerProfile oluştur (vergi levhası OLMADAN)
        const res = await fetch('/api/seller/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: accountForm.email,
            password: accountForm.password,
            fullName: accountForm.fullName,
            phone: accountForm.phone,
            tcKimlikNo: accountForm.tcKimlikNo,
            address: accountForm.address,
            city: accountForm.city || null,
            district: accountForm.district || null,
            postalCode: accountForm.postalCode || null,
            ...companyForm,
          }),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data?.error ?? 'Kayıt hatası'); setLoading(false); return; }

        // Adım 2: Otomatik giriş yap (session cookie alınır)
        const signInResult = await signIn('credentials', {
          email: accountForm.email,
          password: accountForm.password,
          redirect: false,
        });
        if (signInResult?.error) {
          console.error('Auto sign-in failed:', signInResult.error);
          // Kayıt başarılı ama giriş yapılamadı — dosya yüklemesi atlansın, yine de başarılı say
          toast.info('Hesabınız oluşturuldu. Vergi levhanızı giriş yaptıktan sonra yükleyebilirsiniz.');
          setSubmitted(true);
          setLoading(false);
          return;
        }

        // Adım 3: Artık oturum var — vergi levhasını yükle
        setUploading(true);
        const docResult = await uploadTaxDocument(taxDocFile);
        setUploading(false);
        if (!docResult) {
          // Kayıt başarılı ama dosya yüklenemedi
          console.error('Tax document upload failed after registration');
          toast.info('Hesabınız oluşturuldu ancak vergi levhası yüklenemedi. Panelden tekrar yükleyebilirsiniz.');
          setSubmitted(true);
          setLoading(false);
          return;
        }

        // Adım 4: SellerProfile'ı vergi levhası ile güncelle
        const updateRes = await fetch('/api/seller/update-document', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taxDocumentUrl: docResult.url,
            taxDocumentPath: docResult.path,
          }),
        });
        if (!updateRes.ok) {
          console.error('Tax document profile update failed');
          toast.info('Hesabınız oluşturuldu ancak vergi levhası kaydedilemedi. Panelden tekrar yükleyebilirsiniz.');
        }

        // Ek belgeleri yükle
        for (const af of additionalFiles) {
          try {
            const adRes = await uploadTaxDocument(af.file);
            if (adRes) {
              await fetch('/api/seller/documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: af.label, fileUrl: adRes.url, filePath: adRes.path, fileName: af.file.name, contentType: af.file.type }),
              });
            }
          } catch { console.error('Additional doc upload failed:', af.label); }
        }

        setSubmitted(true);
      }
    } catch {
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  // Session yüklenirken loading göster
  if (status === 'loading') {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#d4af37] mx-auto mb-3" />
            <p className="text-muted-foreground">Yükleniyor...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Başvuru başarılı ekranı
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-12">
          <div className="mx-auto max-w-md px-4 text-center">
            <div className="rounded-xl border border-[#d4af37]/30 bg-card p-8">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="font-display text-2xl font-bold mb-3">Başvurunuz Alındı!</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Satıcı başvurunuz başarıyla oluşturuldu. Admin ekibimiz başvurunuzu en kısa sürede inceleyecektir.
                Onay verildiğinde e-posta ile bilgilendirileceksiniz.
              </p>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mb-6">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-amber-400">Önemli:</strong> Başvurunuz onaylanana kadar ürün ekleyemez veya satış yapamazsınız.
                  Bu süreçte müzayedeleri izleyebilir ve teklif verebilirsiniz.
                </p>
              </div>
              <button
                onClick={() => router.replace('/panel')}
                className="w-full rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black hover:bg-[#c9a430] transition-colors"
              >
                Panelime Git
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-lg px-4">
          <div className="mb-4">
            <button type="button" onClick={() => router.back()} className="rounded-lg border border-border p-2 hover:bg-muted transition-colors inline-flex items-center gap-2 text-sm"><ArrowLeft className="h-4 w-4" /> Geri</button>
          </div>
          <div className="mb-6 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-4">
            <p className="text-sm text-muted-foreground">
              📖 Başvuru yapmadan önce <Link href="/satici/rehber" className="text-[#d4af37] font-medium hover:underline">Satıcı Rehberimizi</Link> incelemenizi öneririz.
            </p>
          </div>
          <div className="text-center mb-8">
            <Store className="h-10 w-10 text-[#d4af37] mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold">Satıcı Başvurusu</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {isLoggedIn
                ? 'Mevcut hesabınıza satıcı profili ekleyin. Sadece vergi mükellefi işletmeler satış yapabilir.'
                : 'Satıcı olarak kayıt olun. Hesap ve firma bilgilerinizi tek adımda girin.'}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* === ANONİM: Kişisel Bilgiler === */}
              {!isLoggedIn && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-[#d4af37] flex items-center gap-1.5"><User className="h-4 w-4" /> Kişisel Bilgiler</h3>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Ad Soyad *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="text" value={accountForm.fullName} onChange={handleAccountChange('fullName')} placeholder="Adınız Soyadınız" className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-[#d4af37] focus:outline-none" required />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">E-posta (Giriş) *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="email" value={accountForm.email} onChange={handleAccountChange('email')} placeholder="ornek@email.com" className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-[#d4af37] focus:outline-none" required />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Hesap giriş e-postanız (firma e-postasından farklı olabilir)</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Telefon *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="tel" value={accountForm.phone} onChange={handleAccountChange('phone')} placeholder="555 123 45 67" className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-[#d4af37] focus:outline-none" required />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">TC Kimlik No *</label>
                      <input type="text" value={accountForm.tcKimlikNo} onChange={handleAccountChange('tcKimlikNo')} placeholder="11 haneli TC Kimlik Numaranız" maxLength={11} className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none" required />
                    </div>
                  </div>

                  {/* Adres */}
                  <div className="space-y-3 border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-[#d4af37] flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Adres Bilgileri</h3>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Adres *</label>
                      <textarea value={accountForm.address} onChange={handleAccountChange('address') as any} placeholder="Mahalle, sokak, bina no, daire no" rows={2} className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none resize-none" required />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">İl</label>
                        <input type="text" value={accountForm.city} onChange={handleAccountChange('city')} placeholder="İstanbul" className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">İlçe</label>
                        <input type="text" value={accountForm.district} onChange={handleAccountChange('district')} placeholder="Kadıköy" className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1.5 block">P.Kodu</label>
                        <input type="text" value={accountForm.postalCode} onChange={handleAccountChange('postalCode')} placeholder="34000" maxLength={5} className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* Şifre */}
                  <div className="space-y-3 border-t border-border pt-4">
                    <h3 className="text-sm font-semibold text-[#d4af37] flex items-center gap-1.5"><Lock className="h-4 w-4" /> Şifre Oluşturun</h3>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Şifre *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type={showPassword ? 'text' : 'password'} value={accountForm.password} onChange={handleAccountChange('password')} placeholder="En az 8 karakter" className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm focus:border-[#d4af37] focus:outline-none" required />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Şifre Tekrar *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type={showPassword ? 'text' : 'password'} value={accountForm.confirmPassword} onChange={handleAccountChange('confirmPassword')} placeholder="Şifrenizi tekrar girin" className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-[#d4af37] focus:outline-none" required />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Bölüm ayırıcı */}
              {!isLoggedIn && <div className="border-t-2 border-[#d4af37]/30 pt-4" />}

              {/* === FİRMA BİLGİLERİ (herkes için) === */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#d4af37] flex items-center gap-1.5"><Building className="h-4 w-4" /> Firma Bilgileri</h3>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Firma Unvanı *</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" value={companyForm.companyName} onChange={(e) => setCompanyForm(p => ({ ...p, companyName: e.target.value }))} placeholder="Resmi firma unvanınız" className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-[#d4af37] focus:outline-none" required />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Firma E-posta *</label>
                  <input type="email" value={companyForm.contactEmail} onChange={(e) => setCompanyForm(p => ({ ...p, contactEmail: e.target.value }))} placeholder="info@firma.com" className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none" required />
                  <p className="text-[10px] text-muted-foreground mt-1">Firma iletişim e-postası (hesap e-postanızdan farklı olabilir)</p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Firma Adresi *</label>
                  <textarea value={companyForm.companyAddress} onChange={(e) => setCompanyForm(p => ({ ...p, companyAddress: e.target.value }))} placeholder="Resmi firma adresiniz" rows={2} className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none" required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Vergi Dairesi *</label>
                    <input type="text" value={companyForm.taxOffice} onChange={(e) => setCompanyForm(p => ({ ...p, taxOffice: e.target.value }))} placeholder="Vergi dairesi" className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Vergi No (VKN) *</label>
                    <input type="text" value={companyForm.taxNumber} onChange={(e) => setCompanyForm(p => ({ ...p, taxNumber: e.target.value }))} placeholder="Vergi kimlik numarası" className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none" required />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Mersis No</label>
                  <input type="text" value={companyForm.mersisNo} onChange={(e) => setCompanyForm(p => ({ ...p, mersisNo: e.target.value }))} placeholder="16 haneli Mersis numarası (opsiyonel)" maxLength={16} className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm font-mono focus:border-[#d4af37] focus:outline-none" />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Banka IBAN *</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" value={companyForm.iban} onChange={(e) => setCompanyForm(p => ({ ...p, iban: e.target.value.toUpperCase() }))} onBlur={() => { const r = validateIBAN(companyForm.iban); if (companyForm.iban.trim() && !r.valid) toast.error(r.error); }} placeholder="TR00 0000 0000 0000 0000 0000 00" maxLength={32} className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm font-mono focus:border-[#d4af37] focus:outline-none" required />
                  </div>
                </div>

                {/* Vergi Levhası Upload */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Vergi Levhası (PDF/Görsel) *</label>
                  <div className="relative">
                    <label
                      htmlFor="taxDoc"
                      className={`flex items-center gap-3 w-full rounded-lg border border-dashed py-4 px-4 cursor-pointer transition-colors ${
                        taxDocFile ? 'border-[#d4af37] bg-[#d4af37]/5' : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      {taxDocFile ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-[#d4af37] shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{taxDocFile.name}</p>
                            <p className="text-[10px] text-muted-foreground">{(taxDocFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Vergi levhanızı yükleyin</p>
                            <p className="text-[10px] text-muted-foreground">PDF, JPG veya PNG (max 10MB)</p>
                          </div>
                        </>
                      )}
                    </label>
                    <input
                      id="taxDoc"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error('Dosya boyutu 10MB\'dan büyük olamaz');
                            return;
                          }
                          setTaxDocFile(file);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Ek Belgeler (Opsiyonel) */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Ek Belgeler (Opsiyonel)</label>
                  <p className="text-[10px] text-muted-foreground mb-2">İmza sirküleri, faaliyet belgesi vb. ek belgelerinizi ekleyebilirsiniz.</p>
                  {additionalFiles.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      {additionalFiles.map((af, idx) => (
                        <div key={idx} className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2 text-xs">
                          <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate flex-1">{af.label}</span>
                          <span className="text-muted-foreground truncate max-w-[120px]">{af.file.name}</span>
                          <button type="button" onClick={() => setAdditionalFiles(prev => prev.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAdditionalLabel}
                      onChange={(e) => setNewAdditionalLabel(e.target.value)}
                      placeholder="Belge açıklaması (ör: İmza Sirküleri)"
                      className="flex-1 rounded-lg border border-border bg-background py-1.5 px-3 text-xs focus:border-[#d4af37] focus:outline-none"
                    />
                    <label className={`inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs cursor-pointer hover:border-[#d4af37] transition-colors ${!newAdditionalLabel.trim() ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Upload className="h-3.5 w-3.5" /> Dosya Seç
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && newAdditionalLabel.trim()) {
                          if (file.size > 10 * 1024 * 1024) { toast.error('Dosya 10MB\'dan büyük olamaz'); return; }
                          setAdditionalFiles(prev => [...prev, { label: newAdditionalLabel.trim(), file }]);
                          setNewAdditionalLabel('');
                        }
                        e.target.value = '';
                      }} />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Açıklama</label>
                  <textarea value={companyForm.description} onChange={(e) => setCompanyForm(p => ({ ...p, description: e.target.value }))} placeholder="Müzayede eviniz hakkında kısa bilgi" rows={3} className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none" />
                </div>
              </div>

              {/* Sözleşme onayları (sadece anonim) */}
              {!isLoggedIn && (
                <div className="space-y-2 border-t border-border pt-4">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 rounded border-border" id="terms" />
                    <label htmlFor="terms" className="text-xs text-muted-foreground">
                      <Link href="/yasal/uyelik-sozlesmesi" target="_blank" className="text-[#d4af37] hover:underline">Üyelik Sözleşmesi</Link>,{' '}
                      <Link href="/yasal/muzayede-sartnamesi" target="_blank" className="text-[#d4af37] hover:underline">Müzayede Şartnamesi</Link> ve{' '}
                      <Link href="/yasal/kvkk" target="_blank" className="text-[#d4af37] hover:underline">KVKK Aydınlatma Metni</Link>&apos;ni okudum, kabul ediyorum.
                    </label>
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={kvkkConsent} onChange={(e) => setKvkkConsent(e.target.checked)} className="mt-0.5 rounded border-border" id="kvkk-consent" />
                    <label htmlFor="kvkk-consent" className="text-xs text-muted-foreground">
                      Kişisel verilerimin KVKK kapsamında müzayede hizmetlerinin yürütülmesi, fatura düzenlenmesi ve yasal yükümlülüklerin yerine getirilmesi amacıyla işlenmesine <strong className="text-[#d4af37]">açık rıza</strong> veriyorum.
                    </label>
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-amber-400">Önemli:</strong> Başvurunuz admin tarafından kontrol edildikten sonra onaylanacaktır. Onay verilmeden ürün ekleyemez veya satış yapamazsınız.
                </p>
              </div>

              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black hover:bg-[#c9a430] transition-colors disabled:opacity-50">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {uploading ? 'Dosya Yükleniyor...' : 'Gönderiliyor...'}
                  </>
                ) : isLoggedIn ? 'Başvuruyu Gönder' : 'Satıcı Kaydı Oluştur'}
              </button>
            </form>
          </div>

          {!isLoggedIn && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Zaten hesabınız var mı?{' '}
              <Link href="/giris" className="text-[#d4af37] hover:underline font-medium">Giriş Yapın</Link>
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
