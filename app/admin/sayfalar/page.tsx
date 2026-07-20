export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { PagesManagement } from './_components/pages-management';

export default function AdminPagesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <PagesManagement />
      <Footer />
    </div>
  );
}
