import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ExpensesManagement } from './_components/expenses-management';

export const dynamic = 'force-dynamic';

export default function AdminExpensesPage() {
  return (
    <>
      <Header />
      <ExpensesManagement />
      <Footer />
    </>
  );
}
