export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { CategoriesManagement } from './_components/categories-management';

export default function AdminCategoriesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CategoriesManagement />
      <Footer />
    </div>
  );
}
