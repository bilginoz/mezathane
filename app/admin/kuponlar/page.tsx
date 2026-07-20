import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { CouponsManagement } from './_components/coupons-management';

export const dynamic = 'force-dynamic';

export default function AdminCouponsPage() {
  return (
    <>
      <Header />
      <CouponsManagement />
      <Footer />
    </>
  );
}
