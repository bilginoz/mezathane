import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { MyBidsContent } from './_components/my-bids-content';

export const dynamic = 'force-dynamic';

export default function MyBidsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <MyBidsContent />
      <Footer />
    </div>
  );
}
