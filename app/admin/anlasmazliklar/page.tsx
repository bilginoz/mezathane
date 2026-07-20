export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { DisputesManagement } from './_components/disputes-management';

export default function DisputesPage() {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      <DisputesManagement />
      <Footer />
    </div>
  );
}
