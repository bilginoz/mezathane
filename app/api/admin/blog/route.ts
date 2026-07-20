import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// GET - Blog yazılarını listele
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const posts = await prisma.blogPost.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ posts });
  } catch (e) {
    console.error('Blog GET error:', e);
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}

// POST - Yeni yazı oluştur
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;
    const body = await req.json();
    const { title, excerpt, content, coverImage, isPublished, tags, metaTitle, metaDesc } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Başlık ve içerik gerekli' }, { status: 400 });
    }

    let slug = slugify(title);
    // Benzersizlik kontrolü
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) {
      slug = slug + '-' + Date.now().toString(36);
    }

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        coverImage: coverImage || null,
        authorId: userId,
        isPublished: isPublished || false,
        publishedAt: isPublished ? new Date() : null,
        tags: tags || null,
        metaTitle: metaTitle || null,
        metaDesc: metaDesc || null,
      },
    });
    return NextResponse.json({ post });
  } catch (e) {
    console.error('Blog POST error:', e);
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}

// PATCH - Yazı güncelle
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    const data: any = {};
    if (updates.title !== undefined) data.title = updates.title;
    if (updates.excerpt !== undefined) data.excerpt = updates.excerpt || null;
    if (updates.content !== undefined) data.content = updates.content;
    if (updates.coverImage !== undefined) data.coverImage = updates.coverImage || null;
    if (updates.tags !== undefined) data.tags = updates.tags || null;
    if (updates.metaTitle !== undefined) data.metaTitle = updates.metaTitle || null;
    if (updates.metaDesc !== undefined) data.metaDesc = updates.metaDesc || null;
    if (updates.isPublished !== undefined) {
      data.isPublished = updates.isPublished;
      if (updates.isPublished) {
        // İlk yayın tarihini koru
        const existing = await prisma.blogPost.findUnique({ where: { id } });
        if (!existing?.publishedAt) data.publishedAt = new Date();
      }
    }

    const post = await prisma.blogPost.update({ where: { id }, data });
    return NextResponse.json({ post });
  } catch (e) {
    console.error('Blog PATCH error:', e);
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}

// DELETE - Yazı sil
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Blog DELETE error:', e);
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}
