export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { CalendarView } from './_components/calendar-view';

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      <CalendarView />
      <Footer />
    </div>
  );
}
