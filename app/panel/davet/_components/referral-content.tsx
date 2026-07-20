'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Gift, Copy, Users, CheckCircle, Clock, Share2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

export function ReferralContent() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [referralCode, setReferralCode] = useState('');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, registered: 0, rewarded: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated') {
      fetch('/api/referrals')
        .then(r => r.json())
        .then(d => {
          setReferralCode(d.referralCode || '');
          setReferrals(d.referrals || []);
          setStats(d.stats || { total: 0, registered: 0, rewarded: 0 });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/kayit?ref=${referralCode}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Davet linki kopyalandı!');
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mezathane\'ye katıl!',
          text: 'Türkiye\'nin premium müzayede platformu Mezathane\'ye davetlisiniz!',
          url: referralLink,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-[#d4af37] border-t-transparent rounded-full" /></div>;
  }

  return (
    <main className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/panel" className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Gift className="h-6 w-6 text-[#d4af37]" />
          <h1 className="text-xl font-bold">Arkadaşını Davet Et</h1>
        </div>

        {/* Davet Linki */}
        <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-6 mb-6">
          <h2 className="font-semibold mb-2">🎁 Arkadaşlarınızı Davet Edin</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Davet ettiğiniz kişiler Mezathane&apos;ye kayıt olduğunda hem siz hem de arkadaşınız indirim kuponu kazanabilirsiniz!
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={referralLink}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono truncate"
            />
            <button onClick={copyLink} className="px-3 py-2 rounded-lg bg-[#d4af37] text-black hover:bg-[#c5a028] transition-colors" title="Kopyala">
              <Copy className="h-4 w-4" />
            </button>
            <button onClick={shareLink} className="px-3 py-2 rounded-lg bg-[#d4af37] text-black hover:bg-[#c5a028] transition-colors" title="Paylaş">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-1 text-blue-400" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Davet Gönderildi</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-400" />
            <p className="text-2xl font-bold">{stats.registered}</p>
            <p className="text-xs text-muted-foreground">Kayıt Oldu</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <Gift className="h-5 w-5 mx-auto mb-1 text-[#d4af37]" />
            <p className="text-2xl font-bold">{stats.rewarded}</p>
            <p className="text-xs text-muted-foreground">Ödül Kazanıldı</p>
          </div>
        </div>

        {/* Davet Listesi */}
        {referrals.filter(r => r.referredUserId).length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Davet Edilenler</h3>
            <div className="space-y-2">
              {referrals.filter(r => r.referredUserId).map(ref => (
                <div key={ref.id} className="rounded-lg border border-border bg-card px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{ref.referredUser?.fullName || ref.referredEmail || 'Kullanıcı'}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(ref.createdAt)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    ref.status === 'REWARDED' ? 'bg-green-500/10 text-green-400' :
                    ref.status === 'REGISTERED' ? 'bg-blue-500/10 text-blue-400' :
                    'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {ref.status === 'REWARDED' ? 'Ödül Verildi' : ref.status === 'REGISTERED' ? 'Kayıt Oldu' : 'Bekliyor'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
