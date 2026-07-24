'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Gavel, Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // İki adımlı doğrulama: şifre doğrulandıktan sonra kod adımına geçilir
  const [needsTotp, setNeedsTotp] = useState(false);
  const [totp, setTotp] = useState('');

  // Giriş başarılı olduktan sonraki yönlendirme
  const afterLogin = async () => {
    const sessionRes = await fetch('/api/auth/session');
    const sessionData = await sessionRes.json();
    if (sessionData?.user && !(sessionData.user as any).isEmailVerified) {
      toast.info('Lütfen e-posta adresinizi doğrulayın.');
      router.replace('/dogrulama');
    } else if ((sessionData?.user as any)?.role === 'ADMIN') {
      toast.success('Giriş başarılı!');
      router.replace('/admin');
    } else if ((sessionData?.user as any)?.role === 'SELLER') {
      toast.success('Giriş başarılı!');
      router.replace('/satici');
    } else {
      toast.success('Giriş başarılı!');
      router.replace('/panel');
    }
  };

  const doSignIn = async (code?: string) => {
    const result = await signIn('credentials', {
      email: identifier,
      password,
      totp: code ?? '',
      redirect: false,
    });
    if (result?.error) {
      toast.error(code ? 'Doğrulama kodu hatalı veya süresi geçmiş' : 'E-posta/telefon veya şifre hatalı');
      return false;
    }
    await afterLogin();
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error('E-posta/telefon ve şifre gereklidir');
      return;
    }
    setLoading(true);
    try {
      // 2. adım: kod girildi, doğrudan giriş dene
      if (needsTotp) {
        if (!totp.trim()) {
          toast.error('Doğrulama kodunu girin');
          return;
        }
        await doSignIn(totp.trim());
        return;
      }

      // 1. adım: şifreyi doğrula ve 2FA gerekiyor mu öğren
      const res = await fetch('/api/auth/2fa-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? 'E-posta/telefon veya şifre hatalı');
        return;
      }
      if (data.twoFactorRequired) {
        setNeedsTotp(true);
        toast.info('Doğrulama uygulamanızdaki 6 haneli kodu girin.');
        return;
      }
      await doSignIn();
    } catch {
      toast.error('Giriş sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Gavel className="h-8 w-8 text-[#d4af37]" />
            <span className="font-display text-2xl font-bold">
              <span className="gold-text">Mezathane</span>
              <span className="text-muted-foreground text-sm">.tr</span>
            </span>
          </Link>
          <h1 className="font-display text-2xl font-bold">Hoş Geldiniz</h1>
          <p className="text-sm text-muted-foreground mt-1">Üye girişi yapın</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">E-posta veya Telefon</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ornek@email.com veya 555 123 45 67"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifreniz"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {needsTotp && (
              <div className="rounded-lg border border-[#d4af37]/40 bg-[#d4af37]/5 p-3">
                <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-[#d4af37]" />
                  Doğrulama Kodu
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={totp}
                  onChange={(e) => setTotp(e.target.value)}
                  placeholder="6 haneli kod"
                  className="w-full rounded-lg border border-border bg-background py-2.5 px-4 text-center text-lg tracking-[0.3em] font-mono focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Doğrulama uygulamanızdaki 6 haneli kodu girin. Telefonunuza erişemiyorsanız
                  yedek kodlarınızdan birini de kullanabilirsiniz.
                </p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black hover:bg-[#c9a430] transition-colors disabled:opacity-50"
            >
              {loading ? 'Giriş Yapılıyor...' : needsTotp ? 'Doğrula ve Giriş Yap' : 'Giriş Yap'}
            </button>
            {needsTotp && (
              <button
                type="button"
                onClick={() => { setNeedsTotp(false); setTotp(''); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Geri dön
              </button>
            )}
          </form>
          <div className="mt-3 text-center">
            <Link href="/sifremi-unuttum" className="text-xs text-muted-foreground hover:text-[#d4af37] transition-colors">
              Şifremi Unuttum
            </Link>
          </div>
        </div>

        <div className="text-center mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Hesabınız yok mu?{' '}
            <Link href="/kayit" className="text-[#d4af37] hover:underline font-medium">Kayıt Olun</Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Satıcı mısınız?{' '}
            <Link href="/satici-giris" className="text-[#d4af37] hover:underline font-medium">Satıcı Girişi</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
