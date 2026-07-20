'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Gavel, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('E-posta adresi gereklidir');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Hata');
      setSent(true);
    } catch (err: any) {
      toast.error(err?.message ?? 'Bir hata oluştu');
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
          <h1 className="font-display text-2xl font-bold">Şifremi Unuttum</h1>
          <p className="text-sm text-muted-foreground mt-1">Kayıtlı e-posta adresinize sıfırlama bağlantısı göndereceğiz</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="text-lg font-bold">E-posta Gönderildi</h2>
              <p className="text-sm text-muted-foreground">
                Eğer <strong>{email}</strong> adresi sistemimizde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.
                Lütfen gelen kutunuzu kontrol edin.
              </p>
              <p className="text-xs text-muted-foreground">Bağlantı 1 saat süreyle geçerlidir.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">E-posta Adresi</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ornek@email.com"
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#d4af37] py-2.5 text-sm font-bold text-black hover:bg-[#c9a430] transition-colors disabled:opacity-50"
              >
                {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-4">
          <Link href="/giris" className="text-sm text-[#d4af37] hover:underline font-medium inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Giriş sayfasına dön
          </Link>
        </div>
      </div>
    </div>
  );
}
