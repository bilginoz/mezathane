export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { LiveAuctionContent } from './_components/live-auction-content';

export default async function LiveAuctionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <LiveAuctionContent auctionId={id} />
      <Footer />
    </div>
  );
}
