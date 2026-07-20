import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { BuyerDashboard } from './_components/buyer-dashboard';

export const dynamic = 'force-dynamic';

export default function BuyerPanelPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <BuyerDashboard />
      <Footer />
    </div>
  );
}
