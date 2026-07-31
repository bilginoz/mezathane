export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import AdminLedgerView from '@/components/ledger/admin-ledger-view';
import { AdminSellerCari } from '@/app/admin/finans/_components/admin-seller-cari';
import { getPaymentMode } from '@/lib/payment-mode';

export default async function AdminSellerLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // DIRECT: tek ekranda satıcı carisi + Müzayede Hakkı + rapor. ESCROW: eski ekstre görünümü.
  const mode = await getPaymentMode();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      {mode === 'DIRECT' ? <AdminSellerCari sellerId={id} /> : <AdminLedgerView type="seller" id={id} />}
      <Footer />
    </div>
  );
}
