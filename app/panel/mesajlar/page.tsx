import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { MessagingInbox } from '@/components/messaging/inbox';

export const dynamic = 'force-dynamic';

export default function BuyerMessagesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <MessagingInbox />
      <Footer />
    </div>
  );
}
