export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { LiveAuctionContent } from './_components/live-auction-content';

export default function LiveAuctionPage({ params }: { params: { id: string } }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <LiveAuctionContent auctionId={params.id} />
      <Footer />
    </div>
  );
}
