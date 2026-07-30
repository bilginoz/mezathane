export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { AuctionRightsManagement } from './_components/auction-rights-management';

export default function AdminAuctionRightsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <AuctionRightsManagement />
      <Footer />
    </div>
  );
}
