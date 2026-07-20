import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Yayınlanmış blog yazılarını listele (public)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const post = await prisma.blogPost.findUnique({ where: { slug } });
      if (!post || !post.isPublished) {
        return NextResponse.json({ error: 'Yazı bulunamadı' }, { status: 404 });
      }
      // Görüntülenme sayısını artır
      await prisma.blogPost.update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } });
      return NextResponse.json({ post });
    }

    const posts = await prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true, title: true, slug: true, excerpt: true, coverImage: true,
        tags: true, publishedAt: true, viewCount: true,
      },
    });
    return NextResponse.json({ posts });
  } catch (e) {
    console.error('Blog public GET error:', e);
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}
