export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const body = await request.json();
    const { type, ids, action, data } = body;

    if (!type || !ids?.length || !action) {
      return NextResponse.json({ error: 'Eksik parametreler' }, { status: 400 });
    }

    let result = { updated: 0 };

    switch (type) {
      case 'auctions': {
        if (action === 'updateStatus') {
          const { count } = await prisma.auction.updateMany({
            where: { id: { in: ids } },
            data: { status: data.status },
          });
          result.updated = count;
        }
        break;
      }
      case 'lots': {
        if (action === 'updateStatus') {
          const { count } = await prisma.lot.updateMany({
            where: { id: { in: ids } },
            data: { status: data.status },
          });
          result.updated = count;
        }
        break;
      }
      case 'users': {
        if (action === 'toggleActive') {
          const { count } = await prisma.user.updateMany({
            where: { id: { in: ids } },
            data: { isActive: data.isActive },
          });
          result.updated = count;
        }
        break;
      }
      default:
        return NextResponse.json({ error: 'Geçersiz tip' }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Bulk action error:', error);
    return NextResponse.json({ error: 'Toplu işlem başarısız' }, { status: 500 });
  }
}
