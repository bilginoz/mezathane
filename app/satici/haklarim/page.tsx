export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { AuctionRightsContent } from './_components/auction-rights-content';

export default function AuctionRightsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <AuctionRightsContent />
      <Footer />
    </div>
  );
}
