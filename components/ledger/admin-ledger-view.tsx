'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import LedgerStatement, { AccountRef } from './ledger-statement';

export default function AdminLedgerView({ type, id }: { type: 'buyer' | 'seller' | 'platform'; id?: string }) {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated' && user?.role !== 'ADMIN') { router.replace('/panel'); return; }
  }, [status, router, user?.role]);

  if (status === 'loading' || status === 'unauthenticated' || (status === 'authenticated' && user?.role !== 'ADMIN')) {
    return (
      <div className="flex-1 flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#d4af37' }} />
      </div>
    );
  }

  const endpoint = type === 'platform'
    ? '/api/admin/ledger?type=platform'
    : `/api/admin/ledger?type=${type}&id=${id}`;
  const accountRef: AccountRef = { scope: 'admin', type, id };

  return (
    <LedgerStatement dataEndpoint={endpoint} accountRef={accountRef} backHref="/admin/finans" canEdit={type !== 'platform'} />
  );
}
