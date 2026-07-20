export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { SellerTemplates } from './_components/seller-templates';

export default function SellerTemplatesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <SellerTemplates />
      <Footer />
    </div>
  );
}
