export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import AdminLedgerView from '@/components/ledger/admin-ledger-view';

export default async function AdminSellerLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <AdminLedgerView type="seller" id={id} />
      <Footer />
    </div>
  );
}
