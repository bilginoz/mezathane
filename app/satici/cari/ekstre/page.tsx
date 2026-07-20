export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import LedgerStatement from '@/components/ledger/ledger-statement';

export default function SellerLedgerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <LedgerStatement
        dataEndpoint="/api/seller/ledger"
        accountRef={{ scope: 'self', type: 'seller' }}
        backHref="/satici/cari"
        canEdit={false}
      />
      <Footer />
    </div>
  );
}
