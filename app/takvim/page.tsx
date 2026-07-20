export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import CalendarContent from './_components/calendar-content';

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      <CalendarContent />
      <Footer />
    </div>
  );
}
