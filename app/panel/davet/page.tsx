import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ReferralContent } from './_components/referral-content';

export const dynamic = 'force-dynamic';

export default function ReferralPage() {
  return (
    <>
      <Header />
      <ReferralContent />
      <Footer />
    </>
  );
}
