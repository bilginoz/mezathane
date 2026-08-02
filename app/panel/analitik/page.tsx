import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { BuyerAnalytics } from './_components/buyer-analytics';

export const dynamic = 'force-dynamic';

export default function BuyerAnalyticsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <BuyerAnalytics />
      <Footer />
    </div>
  );
}
