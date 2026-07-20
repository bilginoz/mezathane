export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { MyDisputes } from './_components/my-disputes';

export default function MyDisputesPage() {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      <MyDisputes />
      <Footer />
    </div>
  );
}
