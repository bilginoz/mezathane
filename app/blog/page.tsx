import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { BlogListContent } from './_components/blog-list-content';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog | Mezathane',
  description: 'Müzayede dünyasından haberler, rehberler ve ipucları',
};

export default function BlogPage() {
  return (
    <>
      <Header />
      <BlogListContent />
      <Footer />
    </>
  );
}
