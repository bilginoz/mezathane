'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, CheckCheck, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export function NotificationsContent() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated') {
      fetch('/api/notifications').then(r => r.json()).then(d => setNotifications(d?.notifications ?? [])).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: 'all' }) });
      setNotifications(prev => (prev ?? []).map((n: any) => ({ ...(n ?? {}), isRead: true })));
      toast.success('Tüm bildirimler okundu olarak işaretlendi');
    } catch {}
  };

  const markOneRead = async (notifId: string) => {
    try {
      await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: notifId }) });
      setNotifications(prev => (prev ?? []).map((n: any) => n?.id === notifId ? { ...(n ?? {}), isRead: true } : n));
    } catch {}
  };

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[800px] px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></button>
            <h1 className="font-display text-2xl font-bold">Bildirimler</h1>
          </div>
          <button onClick={markAllRead} className="flex items-center gap-1 text-sm text-[#d4af37] hover:underline">
            <CheckCheck className="h-4 w-4" /> Tümünü Okundu Yap
          </button>
        </div>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : (notifications?.length ?? 0) === 0 ? (
          <div className="text-center py-20"><Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" /><p>Bildirim yok</p></div>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {(notifications ?? []).map((n: any) => (
              <div
                key={n?.id}
                className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${n?.isRead ? 'opacity-60' : ''}`}
                onClick={() => { if (!n?.isRead) markOneRead(n?.id); }}
              >
                {n?.link ? (
                  <Link href={n.link} className="block">
                    <p className="text-sm font-medium">{n?.title ?? ''}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n?.message ?? ''}</p>
                  </Link>
                ) : (
                  <div>
                    <p className="text-sm font-medium">{n?.title ?? ''}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n?.message ?? ''}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
