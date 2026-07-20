import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { FieldChangeRequestsContent } from './_components/field-change-requests-content';

export const dynamic = 'force-dynamic';

export default function FieldChangeRequestsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <FieldChangeRequestsContent />
      <Footer />
    </div>
  );
}
