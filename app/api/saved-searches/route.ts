export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// Kullanıcının kayıtlı aramalarını listele
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;

    const searches = await prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Kategori adlarını ekle (varsa)
    const categoryIds = searches.map(s => s.categoryId).filter(Boolean) as string[];
    const categories = categoryIds.length
      ? await prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } })
      : [];
    const catMap = new Map(categories.map(c => [c.id, c.name]));

    return NextResponse.json({
      searches: searches.map(s => ({ ...s, categoryName: s.categoryId ? catMap.get(s.categoryId) ?? null : null })),
    });
  } catch (error) {
    console.error('SavedSearch GET error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Yeni kayıtlı arama oluştur
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await request.json();
    const keyword = typeof body.keyword === 'string' && body.keyword.trim() ? body.keyword.trim().slice(0, 100) : null;
    const categoryId = typeof body.categoryId === 'string' && body.categoryId ? body.categoryId : null;
    const minPrice = typeof body.minPrice === 'number' && Number.isFinite(body.minPrice) && body.minPrice >= 0 ? body.minPrice : null;
    const maxPrice = typeof body.maxPrice === 'number' && Number.isFinite(body.maxPrice) && body.maxPrice >= 0 ? body.maxPrice : null;
    const alertEnabled = body.alertEnabled !== false;

    // En az bir kriter olmalı — boş arama kaydedilmez
    if (!keyword && !categoryId && minPrice == null && maxPrice == null) {
      return NextResponse.json({ error: 'En az bir arama kriteri girin (kelime, kategori veya fiyat).' }, { status: 400 });
    }

    // Aynı kullanıcı için makul bir üst sınır (kötüye kullanımı engelle)
    const count = await prisma.savedSearch.count({ where: { userId } });
    if (count >= 50) {
      return NextResponse.json({ error: 'En fazla 50 kayıtlı arama tutabilirsiniz.' }, { status: 400 });
    }

    const created = await prisma.savedSearch.create({
      data: { userId, keyword, categoryId, minPrice, maxPrice, alertEnabled },
    });
    return NextResponse.json({ search: created });
  } catch (error) {
    console.error('SavedSearch POST error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
