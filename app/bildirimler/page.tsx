import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { NotificationsContent } from './_components/notifications-content';

export const dynamic = 'force-dynamic';

export default function NotificationsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <NotificationsContent />
      <Footer />
    </div>
  );
}
