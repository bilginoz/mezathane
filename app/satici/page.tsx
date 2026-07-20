import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { SellerDashboard } from './_components/seller-dashboard';

export const dynamic = 'force-dynamic';

export default function SellerPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <SellerDashboard />
      <Footer />
    </div>
  );
}
