export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { DataManagement } from './_components/data-management';

export default function DataManagementPage() {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      <DataManagement />
      <Footer />
    </div>
  );
}
