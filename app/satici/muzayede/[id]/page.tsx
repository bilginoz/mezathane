export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import ManageAuctionContent from './_components/manage-auction-content';

export default function ManageAuctionPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        <ManageAuctionContent />
      </main>
      <Footer />
    </div>
  );
}
