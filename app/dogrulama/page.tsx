'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Gavel, Mail, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function VerificationPage() {
  const { data: session, status, update } = useSession() || {};
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isVerified = (session?.user as any)?.isEmailVerified;
  const userEmail = session?.user?.email;

  const userRole = (session?.user as any)?.role;
  // Zaten doğrulanmışsa role'e göre yönlendir
  useEffect(() => {
    if (isVerified) {
      if (userRole === 'SELLER') router.replace('/satici');
      else if (userRole === 'ADMIN') router.replace('/admin');
      else router.replace('/');
    }
  }, [isVerified, router, userRole]);

  // Giriş yapılmamışsa giriş sayfasına
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/giris');
    }
  }, [status, router]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Sonraki input'a geç
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      toast.error('Lütfen 6 haneli kodu girin');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', type: 'email', code: fullCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Hata');

      setSuccess(true);
      toast.success('E-posta doğrulaması başarılı!');

      // Session'ı güncelle
      await update();

      setTimeout(() => {
        if (userRole === 'SELLER') router.replace('/satici');
        else if (userRole === 'ADMIN') router.replace('/admin');
        else router.replace('/');
      }, 2000);
    } catch (err: any) {
      toast.error(err?.message ?? 'Doğrulama başarısız');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResendLoading(true);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', type: 'email' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Hata');
      toast.success('Yeni doğrulama kodu gönderildi');
      setResendCooldown(60);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      toast.error(err?.message ?? 'Kod gönderilemedi');
    } finally {
      setResendLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#d4af37]"></div>
      </div>
    );
  }

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
          <h1 className="font-display text-2xl font-bold">E-posta Doğrulama</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>{userEmail}</strong> adresine gönderilen 6 haneli kodu girin
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="text-lg font-bold">Doğrulama Başarılı!</h2>
              <p className="text-sm text-muted-foreground">Hesabınız doğrulandı. Panele yönlendiriliyorsunuz...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-1">
                <Mail className="h-5 w-5 text-[#d4af37]" />
                <span className="text-sm text-muted-foreground">Doğrulama kodu gönderildi</span>
              </div>

              {/* 6 haneli kod girişi */}
              <div className="flex justify-center gap-2" onPaste={handlePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-11 h-13 text-center text-xl font-bold font-mono rounded-lg border border-border bg-background focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37] transition-colors"
                  />
                ))}
              </div>

              <button
                onClick={handleVerify}
                disabled={loading || code.join('').length !== 6}
                className="w-full rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black hover:bg-[#c9a430] transition-colors disabled:opacity-50"
              >
                {loading ? 'Doğrulanıyor...' : 'Doğrula'}
              </button>

              <div className="text-center">
                <button
                  onClick={handleResend}
                  disabled={resendLoading || resendCooldown > 0}
                  className="text-sm text-muted-foreground hover:text-[#d4af37] transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${resendLoading ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 ? `Yeniden gönder (${resendCooldown}s)` : 'Kodu yeniden gönder'}
                </button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Kod 15 dakika süreyle geçerlidir. Gelen kutunuzu kontrol edin,
                spam/junk klasörüne de bakmanızı öneririz.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
