export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;
    const { lotId } = await request.json();

    const existing = await prisma.watchlist.findUnique({
      where: { userId_lotId: { userId, lotId } },
    });

    if (existing) {
      await prisma.watchlist.delete({ where: { id: existing.id } });
      await prisma.lot.update({ where: { id: lotId }, data: { watchCount: { decrement: 1 } } });
      return NextResponse.json({ watching: false });
    }

    await prisma.watchlist.create({ data: { userId, lotId } });
    await prisma.lot.update({ where: { id: lotId }, data: { watchCount: { increment: 1 } } });
    return NextResponse.json({ watching: true });
  } catch (error: any) {
    console.error('Watchlist error:', error);
    return NextResponse.json({ error: 'Hata oluştu' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const lotId = searchParams.get('lotId');

    if (lotId) {
      const w = await prisma.watchlist.findUnique({
        where: { userId_lotId: { userId, lotId } },
      });
      return NextResponse.json({ watching: !!w });
    }

    const watchlist = await prisma.watchlist.findMany({
      where: { userId },
      include: {
        lot: {
          include: {
            images: { take: 1, orderBy: { sortOrder: 'asc' } },
            category: true,
            auction: { select: { title: true, status: true, startDate: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ watchlist });
  } catch (error: any) {
    console.error('Watchlist GET error:', error);
    return NextResponse.json({ error: 'Hata oluştu' }, { status: 500 });
  }
}
