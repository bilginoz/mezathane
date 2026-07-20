export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { SellerProfileSettings } from './_components/seller-profile-settings';

export default function SellerProfilePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SellerProfileSettings />
      <Footer />
    </div>
  );
}
