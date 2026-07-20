export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import SettingsTabs from './_components/settings-tabs';

export default function AyarlarPage() {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      <SettingsTabs />
      <Footer />
    </div>
  );
}
