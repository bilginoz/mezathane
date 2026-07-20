export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    if (slug) {
      const page = await prisma.page.findUnique({ where: { slug } });
      if (!page || !page.isActive) {
        return NextResponse.json({ error: 'Sayfa bulunamadı' }, { status: 404 });
      }
      return NextResponse.json({ page });
    }
    const pages = await prisma.page.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, title: true, slug: true, icon: true },
    });
    return NextResponse.json({ pages });
  } catch (error: any) {
    console.error('Public pages error:', error);
    return NextResponse.json({ error: 'Sayfalar yüklenemedi' }, { status: 500 });
  }
}
