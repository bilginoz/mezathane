export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// Lot'a etiket ekle/çıkar
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session?.user || (role !== 'ADMIN' && role !== 'SELLER')) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const { lotId, tagId, action } = await request.json();
    if (!lotId || !tagId) {
      return NextResponse.json({ error: 'lotId ve tagId gerekli' }, { status: 400 });
    }

    if (action === 'remove') {
      await prisma.lotTag.deleteMany({ where: { lotId, tagId } });
      await prisma.tag.update({ where: { id: tagId }, data: { lotCount: { decrement: 1 } } }).catch(() => {});
    } else {
      await prisma.lotTag.upsert({
        where: { lotId_tagId: { lotId, tagId } },
        update: {},
        create: { lotId, tagId },
      });
      await prisma.tag.update({ where: { id: tagId }, data: { lotCount: { increment: 1 } } }).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Lot tag error:', error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
