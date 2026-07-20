export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { FinanceManagement } from './_components/finance-management';

export default function AdminFinancePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <FinanceManagement />
      <Footer />
    </div>
  );
}
