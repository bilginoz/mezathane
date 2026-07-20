'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Gavel, Mail, Lock, Eye, EyeOff, User, Phone, MapPin, Building2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { validateTCKimlikNo } from '@/lib/tc-kimlik';

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-[#d4af37] border-t-transparent rounded-full" /></div>}>
      <RegisterPageInner />
    </Suspense>
  );
}

function RegisterPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get('ref') || '';
  const callbackUrl = searchParams.get('callbackUrl') || '';
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', password: '', confirmPassword: '',
    tcKimlikNo: '', isCompany: false, companyName: '', taxOffice: '', taxNumber: '',
    address: '', city: '', district: '', postalCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [kvkkConsent, setKvkkConsent] = useState(false);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((prev) => ({ ...(prev ?? {}), [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.password) {
      toast.error('Lütfen zorunlu alanları doldurun');
      return;
    }
    if (!form.phone || form.phone.replace(/\D/g, '').length < 10) {
      toast.error('Geçerli bir telefon numarası giriniz (en az 10 hane)');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Şifre en az 8 karakter olmalıdır');
      return;
    }
    if (!form.tcKimlikNo && !form.isCompany) {
      toast.error('TC Kimlik No zorunludur');
      return;
    }
    if (!form.isCompany && form.tcKimlikNo && !validateTCKimlikNo(form.tcKimlikNo)) {
      toast.error('Geçersiz TC Kimlik No. Lütfen doğru TC Kimlik numaranızı girin.');
      return;
    }
    if (form.isCompany && (!form.taxOffice || !form.taxNumber)) {
      toast.error('Şirket hesabı için Vergi Dairesi ve Vergi Numarası zorunludur');
      return;
    }
    if (!form.address) {
      toast.error('Adres bilgisi zorunludur');
      return;
    }
    if (!accepted) {
      toast.error('Kullanıcı sözleşmesini onaylamalısınız');
      return;
    }
    if (!kvkkConsent) {
      toast.error('KVKK açık rıza onayı zorunludur');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          tcKimlikNo: form.tcKimlikNo || null,
          kvkkConsent: true,
          isCompany: form.isCompany,
          companyName: form.isCompany ? form.companyName : null,
          taxOffice: form.isCompany ? form.taxOffice : null,
          taxNumber: form.isCompany ? form.taxNumber : null,
          address: form.address,
          city: form.city || null,
          district: form.district || null,
          postalCode: form.postalCode || null,
          referralCode: refCode || undefined,
        }),
      });
      const data = await res.json();
      if (data?.success) {
        toast.success('Kayıt başarılı! E-posta doğrulama kodu gönderildi.');
        // Önce giriş yap, sonra doğrulama sayfasına yönlendir
        const signInResult = await signIn('credentials', {
          email: form.email,
          password: form.password,
          redirect: false,
        });
        if (signInResult?.error) {
          router.replace('/giris');
        } else {
          router.replace(callbackUrl || '/dogrulama');
        }
      } else {
        toast.error(data?.error ?? 'Kayıt başarısız');
      }
    } catch {
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12">
      <div className="w-full max-w-lg px-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Gavel className="h-8 w-8 text-[#d4af37]" />
            <span className="font-display text-2xl font-bold">
              <span className="gold-text">Mezathane</span>
              <span className="text-muted-foreground text-sm">.tr</span>
            </span>
          </Link>
          <h1 className="font-display text-2xl font-bold">Yeni Üyelik</h1>
          <p className="text-sm text-muted-foreground mt-1">Hemen ücretsiz kayıt olun</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Kişisel Bilgiler */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#d4af37] flex items-center gap-1.5"><User className="h-4 w-4" /> Kişisel Bilgiler</h3>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Ad Soyad *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="text" value={form.fullName} onChange={handleChange('fullName')} placeholder="Adınız Soyadınız" className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]" required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">E-posta *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="email" value={form.email} onChange={handleChange('email')} placeholder="ornek@email.com" className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]" required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Telefon *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="tel" value={form.phone} onChange={handleChange('phone')} placeholder="555 123 45 67" className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]" required />
                </div>
              </div>
            </div>

            {/* Kimlik Bilgileri */}
            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-[#d4af37] flex items-center gap-1.5"><CreditCard className="h-4 w-4" /> Kimlik / Vergi Bilgileri</h3>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="accountType" checked={!form.isCompany} onChange={() => setForm(p => ({ ...p, isCompany: false }))} className="accent-[#d4af37]" />
                  <span className="text-sm">Bireysel</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="accountType" checked={form.isCompany} onChange={() => setForm(p => ({ ...p, isCompany: true }))} className="accent-[#d4af37]" />
                  <span className="text-sm">Kurumsal</span>
                </label>
              </div>
              {!form.isCompany ? (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">TC Kimlik No *</label>
                  <input type="text" value={form.tcKimlikNo} onChange={handleChange('tcKimlikNo')} placeholder="11 haneli TC Kimlik Numaranız" maxLength={11} className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]" />
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Şirket Adı *</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input type="text" value={form.companyName} onChange={handleChange('companyName')} placeholder="Şirket ünvanı" className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Vergi Dairesi *</label>
                      <input type="text" value={form.taxOffice} onChange={handleChange('taxOffice')} placeholder="Vergi dairesi" className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]" required />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Vergi No *</label>
                      <input type="text" value={form.taxNumber} onChange={handleChange('taxNumber')} placeholder="Vergi numarası" maxLength={10} className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]" required />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">TC Kimlik No (Yetkili Kişi)</label>
                    <input type="text" value={form.tcKimlikNo} onChange={handleChange('tcKimlikNo')} placeholder="Yetkili kişinin TC Kimlik No" maxLength={11} className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]" />
                  </div>
                </>
              )}
            </div>

            {/* Adres Bilgileri */}
            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-[#d4af37] flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Adres Bilgileri</h3>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Adres *</label>
                <textarea value={form.address} onChange={handleChange('address') as any} placeholder="Mahalle, sokak, bina no, daire no" rows={2} className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37] resize-none" required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">İl</label>
                  <input type="text" value={form.city} onChange={handleChange('city')} placeholder="İstanbul" className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">İlçe</label>
                  <input type="text" value={form.district} onChange={handleChange('district')} placeholder="Kadıköy" className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Posta Kodu</label>
                  <input type="text" value={form.postalCode} onChange={handleChange('postalCode')} placeholder="34000" maxLength={5} className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]" />
                </div>
              </div>
            </div>

            {/* Şifre */}
            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-[#d4af37] flex items-center gap-1.5"><Lock className="h-4 w-4" /> Şifre</h3>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Şifre *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={handleChange('password')} placeholder="En az 8 karakter" className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Şifre Tekrar *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={handleChange('confirmPassword')} placeholder="Şifrenizi tekrar girin" className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]" required />
                </div>
              </div>
            </div>

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
                  Kişisel verilerimin (TC Kimlik No, adres, iletişim bilgileri) KVKK kapsamında müzayede hizmetlerinin yürütülmesi, fatura düzenlenmesi ve yasal yükümlülüklerin yerine getirilmesi amacıyla işlenmesine <strong className="text-[#d4af37]">açık rıza</strong> veriyorum.
                </label>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black hover:bg-[#c9a430] transition-colors disabled:opacity-50">
              {loading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Zaten hesabınız var mı?{' '}
          <Link href="/giris" className="text-[#d4af37] hover:underline font-medium">Giriş Yapın</Link>
        </p>
      </div>
    </div>
  );
}
