'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Heart, ArrowLeft } from 'lucide-react';
import { LotCard } from '@/components/lot-card';

export function WatchlistContent() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated') {
      fetch('/api/watchlist')
        .then(r => r.json())
        .then(d => setItems(d?.watchlist ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></button>
          <div>
            <h1 className="font-display text-2xl font-bold">Favorilerim</h1>
            <p className="text-xs text-muted-foreground mt-0.5">🔔 Favori lotlarınızın müzayedesi başlamadan 15 dk önce size hatırlatma gönderilir.</p>
          </div>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />)}</div>
        ) : (items?.length ?? 0) === 0 ? (
          <div className="text-center py-20">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p>Henüz favori eklemediniz</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(items ?? []).map((item: any, i: number) => (
              <LotCard key={item?.id ?? i} lot={item?.lot} index={i} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
