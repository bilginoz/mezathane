export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import AdminLedgerView from '@/components/ledger/admin-ledger-view';
import { AdminBuyerCari } from '@/app/admin/finans/_components/admin-buyer-cari';
import { getPaymentMode } from '@/lib/payment-mode';

export default async function AdminBuyerLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // DIRECT: tek ekranda alıcı carisi + rapor. ESCROW: eski ekstre görünümü.
  const mode = await getPaymentMode();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      {mode === 'DIRECT' ? <AdminBuyerCari buyerId={id} /> : <AdminLedgerView type="buyer" id={id} />}
      <Footer />
    </div>
  );
}
