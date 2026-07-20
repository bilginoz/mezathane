'use client';

import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { MessagingInbox } from '@/components/messaging/inbox';
import { ArrowLeft } from 'lucide-react';

export default function SellerMessagesPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-[1200px] px-4 pt-6">
          <button onClick={() => router.push('/satici')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" /> Satıcı Paneline Dön
          </button>
        </div>
        <MessagingInbox />
      </main>
      <Footer />
    </div>
  );
}
