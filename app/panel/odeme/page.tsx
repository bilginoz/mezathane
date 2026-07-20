export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { PaymentPage } from './_components/payment-page';

export default function OdemePage() {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      <PaymentPage />
      <Footer />
    </div>
  );
}
