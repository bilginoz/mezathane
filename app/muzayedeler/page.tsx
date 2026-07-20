import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { AuctionsPageContent } from './_components/auctions-content';

export const dynamic = 'force-dynamic';

export default function AuctionsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <AuctionsPageContent />
      <Footer />
    </div>
  );
}
