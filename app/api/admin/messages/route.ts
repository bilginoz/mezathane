export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const filter = searchParams.get('filter'); // 'unread', 'read', null=all

    const where: any = {};
    if (filter === 'unread') where.isRead = false;
    if (filter === 'read') where.isRead = true;

    const [messages, total, unreadCount] = await Promise.all([
      prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contactMessage.count({ where }),
      prisma.contactMessage.count({ where: { isRead: false } }),
    ]);

    return NextResponse.json({ messages, total, totalPages: Math.ceil(total / limit), unreadCount });
  } catch (error: any) {
    console.error('Admin messages GET error:', error);
    return NextResponse.json({ error: 'Mesajlar yüklenemedi' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const body = await request.json();
    const { messageId, action } = body ?? {};

    if (!messageId || !action) {
      return NextResponse.json({ error: 'messageId ve action zorunlu' }, { status: 400 });
    }

    switch (action) {
      case 'markRead':
        await prisma.contactMessage.update({
          where: { id: messageId },
          data: { isRead: true },
        });
        break;

      case 'markUnread':
        await prisma.contactMessage.update({
          where: { id: messageId },
          data: { isRead: false },
        });
        break;

      case 'delete':
        await prisma.contactMessage.delete({
          where: { id: messageId },
        });
        break;

      default:
        return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Admin messages PATCH error:', error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
