'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Store, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function SellerLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error('E-posta/telefon ve şifre gereklidir');
      return;
    }
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: identifier,
        password,
        redirect: false,
      });
      if (result?.error) {
        toast.error('E-posta/telefon veya şifre hatalı');
      } else {
        // Session'dan rol ve doğrulama durumunu kontrol et
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        const user = sessionData?.user as any;

        if (user && !user.isEmailVerified) {
          toast.info('Lütfen e-posta adresinizi doğrulayın.');
          router.replace('/dogrulama');
        } else if (user?.role === 'SELLER' || user?.role === 'ADMIN') {
          toast.success('Satıcı girişi başarılı!');
          router.replace('/satici');
        } else {
          toast.error('Bu hesap bir satıcı hesabı değildir. Satıcı başvurusu yapabilirsiniz.');
          await signOut({ redirect: false });
          router.replace('/satici-basvuru');
        }
      }
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
            <Store className="h-8 w-8 text-[#d4af37]" />
            <span className="font-display text-2xl font-bold">
              <span className="gold-text">Mezathane</span>
              <span className="text-muted-foreground text-sm">.tr</span>
            </span>
          </Link>
          <h1 className="font-display text-2xl font-bold">Satıcı Girişi</h1>
          <p className="text-sm text-muted-foreground mt-1">Satıcı panelinize erişin</p>
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
                  placeholder="satici@firma.com veya 555 123 45 67"
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
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black hover:bg-[#c9a430] transition-colors disabled:opacity-50"
            >
              {loading ? 'Giriş Yapılıyor...' : 'Satıcı Girişi Yap'}
            </button>
          </form>
          <div className="mt-3 text-center">
            <Link href="/sifremi-unuttum" className="text-xs text-muted-foreground hover:text-[#d4af37] transition-colors">
              Şifremi Unuttum
            </Link>
          </div>
        </div>

        <div className="text-center mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Satıcı değil misiniz?{' '}
            <Link href="/giris" className="text-[#d4af37] hover:underline font-medium">Üye Girişi</Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Satıcı olmak ister misiniz?{' '}
            <Link href="/satici-basvuru" className="text-[#d4af37] hover:underline font-medium">Başvuru Yapın</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
