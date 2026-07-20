export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { SiteManagement } from './_components/site-management';

export default function AdminSitePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <SiteManagement />
      <Footer />
    </div>
  );
}
