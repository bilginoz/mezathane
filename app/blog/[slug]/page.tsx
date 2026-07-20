import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { BlogPostContent } from './_components/blog-post-content';
import { prisma } from '@/lib/prisma';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await prisma.blogPost.findUnique({ where: { slug: params.slug } });
  if (!post || !post.isPublished) return { title: 'Yazı Bulunamadı | Mezathane' };
  return {
    title: (post.metaTitle || post.title) + ' | Mezathane Blog',
    description: post.metaDesc || post.excerpt || post.title,
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDesc || post.excerpt || '',
      images: post.coverImage ? [{ url: post.coverImage }] : [],
    },
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await prisma.blogPost.findUnique({ where: { slug: params.slug } });
  if (!post || !post.isPublished) notFound();

  // Görüntülenme sayısını artır
  await prisma.blogPost.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } });

  return (
    <>
      <Header />
      <BlogPostContent post={JSON.parse(JSON.stringify(post))} />
      <Footer />
    </>
  );
}
