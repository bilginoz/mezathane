import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { AdminDashboard } from './_components/admin-dashboard';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <AdminDashboard />
      <Footer />
    </div>
  );
}
