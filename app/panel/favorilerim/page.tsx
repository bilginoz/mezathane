import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { WatchlistContent } from './_components/watchlist-content';

export const dynamic = 'force-dynamic';

export default function WatchlistPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <WatchlistContent />
      <Footer />
    </div>
  );
}
