export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { BulkLotUpload } from './_components/bulk-lot-upload';

export default function BulkLotUploadPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <BulkLotUpload />
      <Footer />
    </div>
  );
}
