export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import LedgerStatement from '@/components/ledger/ledger-statement';

export default function BuyerLedgerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <LedgerStatement
        dataEndpoint="/api/buyer/ledger"
        accountRef={{ scope: 'self', type: 'buyer' }}
        backHref="/panel/hesabim"
        canEdit={false}
      />
      <Footer />
    </div>
  );
}
