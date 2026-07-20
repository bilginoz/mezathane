export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ReportsManagement } from './_components/reports-management';

export default function AdminReportsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <ReportsManagement />
      <Footer />
    </div>
  );
}
