export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { RulesManagement } from './_components/rules-management';

export default function AdminRulesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <RulesManagement />
      <Footer />
    </div>
  );
}
