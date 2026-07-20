export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import AdminLedgerView from '@/components/ledger/admin-ledger-view';

export default function AdminPlatformLedgerPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <AdminLedgerView type="platform" />
      <Footer />
    </div>
  );
}
