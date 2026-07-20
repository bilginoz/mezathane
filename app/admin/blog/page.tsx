import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { BlogManagement } from './_components/blog-management';

export const dynamic = 'force-dynamic';

export default function AdminBlogPage() {
  return (
    <>
      <Header />
      <BlogManagement />
      <Footer />
    </>
  );
}
