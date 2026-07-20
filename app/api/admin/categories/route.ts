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
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { lots: true } } },
    });
    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('Admin categories GET error:', error);
    return NextResponse.json({ error: 'Kategoriler yüklenemedi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const body = await request.json();
    const { name, slug, description, imageUrl, sortOrder, isActive } = body;
    if (!name || !slug) {
      return NextResponse.json({ error: 'Ad ve slug zorunludur' }, { status: 400 });
    }
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const category = await prisma.category.create({
      data: {
        name,
        slug: cleanSlug,
        description: description || null,
        imageUrl: imageUrl || null,
        sortOrder: sortOrder || 0,
        isActive: isActive !== false,
      },
    });
    return NextResponse.json({ category });
  } catch (error: any) {
    console.error('Admin categories POST error:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Bu isim veya slug zaten kullanımda' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Kategori oluşturulamadı' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const body = await request.json();
    const { id, name, slug, description, imageUrl, sortOrder, isActive } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID zorunludur' }, { status: 400 });
    }
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) {
      updateData.slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    }
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = isActive;
    const category = await prisma.category.update({ where: { id }, data: updateData });
    return NextResponse.json({ category });
  } catch (error: any) {
    console.error('Admin categories PATCH error:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Bu isim veya slug zaten kullanımda' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Kategori güncellenemedi' }, { status: 500 });
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
    const category = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { lots: true } } } });
    if (category && category._count.lots > 0) {
      return NextResponse.json({ error: 'Bu kategoride lotlar var, silinemez' }, { status: 400 });
    }
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin categories DELETE error:', error);
    return NextResponse.json({ error: 'Kategori silinemedi' }, { status: 500 });
  }
}
