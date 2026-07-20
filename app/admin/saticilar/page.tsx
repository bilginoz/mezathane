export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { SellersManagement } from './_components/sellers-management';

export default function AdminSellersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <SellersManagement />
      <Footer />
    </div>
  );
}
