export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { EmailTemplatesManagement } from './_components/email-templates-management';

export default function AdminEmailTemplatesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-4xl px-4">
          <EmailTemplatesManagement />
        </div>
      </main>
      <Footer />
    </div>
  );
}
