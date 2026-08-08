export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { notFound } from 'next/navigation';
import { SellerLegalReference } from '../_components/seller-legal-reference';

const VALID_SLUGS = ['mesafeli-satis', 'on-bilgilendirme', 'iptal-iade'];

export default async function SellerLegalReferencePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!VALID_SLUGS.includes(slug)) return notFound();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <SellerLegalReference slug={slug} />
      <Footer />
    </div>
  );
}
