import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { SavedSearchesContent } from './_components/saved-searches-content';

export const dynamic = 'force-dynamic';

export default function SavedSearchesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <SavedSearchesContent />
      <Footer />
    </div>
  );
}
