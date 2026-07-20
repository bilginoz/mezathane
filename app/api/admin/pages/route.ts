export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const pages = await prisma.page.findMany({ orderBy: { sortOrder: 'asc' } });
    return NextResponse.json({ pages });
  } catch (error: any) {
    console.error('Pages GET error:', error);
    return NextResponse.json({ error: 'Sayfalar yüklenemedi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const body = await request.json();
    const { title, slug, content, icon, isActive, sortOrder } = body;
    if (!title || !slug || !content) {
      return NextResponse.json({ error: 'Başlık, slug ve içerik zorunludur' }, { status: 400 });
    }
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const existing = await prisma.page.findUnique({ where: { slug: cleanSlug } });
    if (existing) {
      return NextResponse.json({ error: 'Bu slug zaten kullanımda' }, { status: 400 });
    }
    const page = await prisma.page.create({
      data: {
        title,
        slug: cleanSlug,
        content,
        icon: icon || 'FileText',
        isActive: isActive !== false,
        sortOrder: sortOrder || 0,
      },
    });
    return NextResponse.json({ page });
  } catch (error: any) {
    console.error('Pages POST error:', error);
    return NextResponse.json({ error: 'Sayfa oluşturulamadı' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const body = await request.json();
    const { id, title, slug, content, icon, isActive, sortOrder } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID zorunludur' }, { status: 400 });
    }
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) {
      const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const existing = await prisma.page.findFirst({ where: { slug: cleanSlug, NOT: { id } } });
      if (existing) {
        return NextResponse.json({ error: 'Bu slug zaten kullanımda' }, { status: 400 });
      }
      updateData.slug = cleanSlug;
    }
    if (content !== undefined) updateData.content = content;
    if (icon !== undefined) updateData.icon = icon;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    const page = await prisma.page.update({ where: { id }, data: updateData });
    return NextResponse.json({ page });
  } catch (error: any) {
    console.error('Pages PATCH error:', error);
    return NextResponse.json({ error: 'Sayfa güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID zorunludur' }, { status: 400 });
    }
    await prisma.page.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Pages DELETE error:', error);
    return NextResponse.json({ error: 'Sayfa silinemedi' }, { status: 500 });
  }
}
