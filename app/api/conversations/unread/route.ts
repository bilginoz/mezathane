export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ count: 0 });
    const user = session.user as any;

    let totalUnread = 0;

    if (user.role === 'SELLER') {
      const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: user.id } });
      if (sellerProfile) {
        const result = await prisma.conversation.aggregate({
          where: { sellerId: sellerProfile.id, isArchived: false },
          _sum: { sellerUnread: true },
        });
        totalUnread = result._sum.sellerUnread || 0;
      }
    } else {
      const result = await prisma.conversation.aggregate({
        where: { buyerId: user.id, isArchived: false },
        _sum: { buyerUnread: true },
      });
      totalUnread = result._sum.buyerUnread || 0;
    }

    return NextResponse.json({ count: totalUnread });
  } catch (error) {
    console.error('GET /api/conversations/unread error:', error);
    return NextResponse.json({ count: 0 });
  }
}
