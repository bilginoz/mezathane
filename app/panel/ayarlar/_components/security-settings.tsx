'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ShieldCheck, ShieldOff, Copy, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

/*
  İki adımlı doğrulama (2FA) ayarları.
  Akış: durum → kurulumu başlat (QR + secret) → uygulamadaki kodu gir → açılır,
  tek kullanımlık yedek kodlar BİR KEZ gösterilir. Kapatmak için şifre istenir.
*/
export function SecuritySettings() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  // Kurulum adımı
  const [setupData, setSetupData] = useState<{ secret: string; qrDataUri: string } | null>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);

  // Kapatma adımı
  const [disabling, setDisabling] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    fetch('/api/user/2fa/status')
      .then(r => r.json())
      .then(d => setEnabled(d.enabled === true))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function startSetup() {
    setBusy(true);
    try {
      const res = await fetch('/api/user/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Kurulum başlatılamadı'); return; }
      setSetupData({ secret: data.secret, qrDataUri: data.qrDataUri });
    } finally { setBusy(false); }
  }

  async function confirmSetup() {
    if (!code.trim()) { toast.error('Uygulamadaki 6 haneli kodu girin'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/user/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Kod doğrulanamadı'); return; }
      setEnabled(true);
      setSetupData(null);
      setCode('');
      setBackupCodes(data.backupCodes ?? []);
      toast.success('İki adımlı doğrulama açıldı.');
    } finally { setBusy(false); }
  }

  async function disable2fa() {
    if (!password) { toast.error('Şifrenizi girin'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/user/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Kapatılamadı'); return; }
      setEnabled(false);
      setDisabling(false);
      setPassword('');
      toast.success('İki adımlı doğrulama kapatıldı.');
    } finally { setBusy(false); }
  }

  function copyBackup() {
    if (!backupCodes) return;
    navigator.clipboard.writeText(backupCodes.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  if (loading) return <p className="text-sm text-muted-foreground">Yükleniyor…</p>;

  // Yedek kodlar ekranı (yalnızca açıldıktan hemen sonra bir kez)
  if (backupCodes) {
    return (
      <div className="rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/5 p-5">
        <div className="flex items-start gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-[#d4af37] shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold">Yedek kodlarınızı saklayın</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Telefonunuza erişemezseniz bu kodlarla giriş yapabilirsiniz. Her kod
              <strong> yalnızca bir kez</strong> kullanılır. Bu ekran bir daha gösterilmeyecek —
              şimdi kopyalayıp güvenli bir yere kaydedin.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 my-4">
          {backupCodes.map(c => (
            <code key={c} className="rounded-lg bg-background border border-border px-3 py-2 text-center font-mono text-sm tracking-wider">{c}</code>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={copyBackup} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Kopyalandı' : 'Kodları kopyala'}
          </button>
          <button onClick={() => setBackupCodes(null)} className="rounded-lg bg-[#d4af37] text-black px-4 py-2 text-sm font-medium hover:bg-[#c9a430]">
            Kaydettim, kapat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {enabled
              ? <ShieldCheck className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
              : <ShieldOff className="h-6 w-6 text-muted-foreground shrink-0 mt-0.5" />}
            <div>
              <h3 className="font-semibold">İki Adımlı Doğrulama</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Açıkken, şifrenizi bilen biri bile telefonunuzdaki koda erişemeden hesabınıza giremez.
                Google Authenticator, Authy veya benzeri bir uygulama gerekir.
              </p>
              <p className={`text-sm mt-2 font-medium ${enabled ? 'text-green-500' : 'text-muted-foreground'}`}>
                Durum: {enabled ? 'Açık' : 'Kapalı'}
              </p>
            </div>
          </div>
        </div>

        {/* Kapalı ve kurulum başlamamış */}
        {!enabled && !setupData && (
          <button onClick={startSetup} disabled={busy}
            className="mt-4 rounded-lg bg-[#d4af37] text-black px-4 py-2 text-sm font-medium hover:bg-[#c9a430] disabled:opacity-60">
            {busy ? 'Hazırlanıyor…' : 'İki adımlı doğrulamayı aç'}
          </button>
        )}

        {/* Kurulum ekranı */}
        {!enabled && setupData && (
          <div className="mt-5 border-t border-border pt-5">
            <ol className="space-y-4 text-sm">
              <li>
                <strong>1.</strong> Telefonunuzda bir doğrulama uygulaması açın
                (Google Authenticator, Authy, 1Password…).
              </li>
              <li>
                <strong>2.</strong> Aşağıdaki kare kodu okutun:
                <div className="mt-2 inline-block rounded-lg bg-white p-2">
                  <Image src={setupData.qrDataUri} alt="QR kod" width={200} height={200} unoptimized />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Kare kodu okutamıyorsanız bu anahtarı elle girin:
                </p>
                <code className="mt-1 block rounded-lg bg-muted border border-border px-3 py-2 font-mono text-xs break-all">
                  {setupData.secret}
                </code>
              </li>
              <li>
                <strong>3.</strong> Uygulamanın gösterdiği 6 haneli kodu yazın:
                <div className="flex gap-2 mt-2">
                  <input
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    inputMode="numeric"
                    placeholder="123456"
                    className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-center font-mono tracking-[0.25em] focus:border-[#d4af37] focus:outline-none"
                  />
                  <button onClick={confirmSetup} disabled={busy}
                    className="rounded-lg bg-[#d4af37] text-black px-4 py-2 text-sm font-medium hover:bg-[#c9a430] disabled:opacity-60">
                    {busy ? 'Doğrulanıyor…' : 'Doğrula ve aç'}
                  </button>
                  <button onClick={() => { setSetupData(null); setCode(''); }}
                    className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
                    Vazgeç
                  </button>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* Açık — kapatma */}
        {enabled && !disabling && (
          <button onClick={() => setDisabling(true)}
            className="mt-4 rounded-lg border border-red-500/40 text-red-500 px-4 py-2 text-sm font-medium hover:bg-red-500/10">
            Kapat
          </button>
        )}
        {enabled && disabling && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm mb-2">Güvenlik için şifrenizi girin:</p>
            <div className="flex gap-2">
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Şifreniz"
                className="flex-1 max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-[#d4af37] focus:outline-none"
              />
              <button onClick={disable2fa} disabled={busy}
                className="rounded-lg bg-red-500 text-white px-4 py-2 text-sm font-medium hover:bg-red-600 disabled:opacity-60">
                {busy ? 'Kapatılıyor…' : 'Kapat'}
              </button>
              <button onClick={() => { setDisabling(false); setPassword(''); }}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
                Vazgeç
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
