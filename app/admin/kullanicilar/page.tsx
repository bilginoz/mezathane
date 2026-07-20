export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { UsersManagement } from './_components/users-management';

export default function AdminUsersPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <UsersManagement />
      <Footer />
    </div>
  );
}
