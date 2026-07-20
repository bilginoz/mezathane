export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { MessagesManagement } from './_components/messages-management';

export default function AdminMessagesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <MessagesManagement />
      <Footer />
    </div>
  );
}
