export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { SellerAnalytics } from './_components/seller-analytics';

export default function SellerAnalyticsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <SellerAnalytics />
      <Footer />
    </div>
  );
}
