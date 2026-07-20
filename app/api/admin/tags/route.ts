export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ tags });
  } catch (error: any) {
    console.error('Tags fetch error:', error);
    return NextResponse.json({ tags: [] });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session?.user || (role !== 'ADMIN' && role !== 'SELLER')) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const { name, color } = await request.json();
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Etiket adı en az 2 karakter olmalı' }, { status: 400 });
    }

    const slug = name.trim().toLowerCase()
      .replace(/\u011f/g, 'g').replace(/\u00fc/g, 'u').replace(/\u015f/g, 's')
      .replace(/\u0131/g, 'i').replace(/\u00f6/g, 'o').replace(/\u00e7/g, 'c')
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const tag = await prisma.tag.upsert({
      where: { slug },
      update: { color: color || null },
      create: { name: name.trim(), slug, color: color || null },
    });

    return NextResponse.json({ tag });
  } catch (error: any) {
    console.error('Tag create error:', error);
    return NextResponse.json({ error: 'Etiket oluşturulamadı' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('id');
    if (!tagId) return NextResponse.json({ error: 'Tag ID gerekli' }, { status: 400 });

    await prisma.lotTag.deleteMany({ where: { tagId } });
    await prisma.tag.delete({ where: { id: tagId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Tag delete error:', error);
    return NextResponse.json({ error: 'Etiket silinemedi' }, { status: 500 });
  }
}
