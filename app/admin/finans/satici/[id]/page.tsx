export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import AdminLedgerView from '@/components/ledger/admin-ledger-view';

export default function AdminSellerLedgerPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <AdminLedgerView type="seller" id={params.id} />
      <Footer />
    </div>
  );
}
