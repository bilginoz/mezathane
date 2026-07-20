'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Gavel, ArrowLeft } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export function MyBidsContent() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated') {
      fetch('/api/buyer/dashboard')
        .then(r => r.json())
        .then(d => setBids(d?.recentBids ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></button>
          <h1 className="font-display text-2xl font-bold">Tekliflerim</h1>
        </div>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />)}</div>
        ) : (bids?.length ?? 0) === 0 ? (
          <div className="text-center py-20">
            <Gavel className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p>Henüz teklif vermediniz</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {(bids ?? []).map((bid: any) => (
              <Link key={bid?.id} href={`/lot/${bid?.lotId ?? ''}`} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <Image src={bid?.lot?.images?.[0]?.imageUrl ?? 'https://cdn.abacus.ai/images/46235948-79f3-4f4e-aab0-cdfd81b98b42.png'} alt="" fill className="object-cover" sizes="56px" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{bid?.lot?.title ?? ''}</p>
                  <p className="text-xs text-muted-foreground">{bid?.lot?.auction?.title ?? ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold font-mono text-[#d4af37]">{formatPrice(bid?.amount ?? 0)}</p>
                  <p className={`text-xs ${bid?.isWinning ? 'text-green-400' : 'text-red-400'}`}>{bid?.isWinning ? 'Önde' : 'Geçildi'}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
