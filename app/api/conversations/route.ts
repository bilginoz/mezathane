export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { checkMessageForContactInfo } from '@/lib/message-filter';

// GET: List conversations for current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = session.user as any;
    const userId = user.id;
    const role = user.role;

    let conversations;

    if (role === 'SELLER') {
      // Find seller profile
      const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId } });
      if (!sellerProfile) return NextResponse.json({ conversations: [] });

      conversations = await prisma.conversation.findMany({
        where: { sellerId: sellerProfile.id, isArchived: false },
        include: {
          buyer: { select: { id: true, fullName: true, avatarUrl: true } },
          lot: { select: { id: true, title: true, images: { take: 1, select: { imageUrl: true } } } },
        },
        orderBy: { lastMessageAt: 'desc' },
        take: 50,
      });

      return NextResponse.json({
        conversations: conversations.map((c: any) => ({
          id: c.id,
          subject: c.subject,
          lastMessage: c.lastMessage,
          lastMessageAt: c.lastMessageAt,
          unreadCount: c.sellerUnread,
          otherParty: { name: c.buyer.fullName, avatarUrl: c.buyer.avatarUrl },
          lot: c.lot ? { id: c.lot.id, title: c.lot.title, imageUrl: c.lot.images[0]?.imageUrl } : null,
          createdAt: c.createdAt,
        })),
      });
    } else {
      // BUYER
      conversations = await prisma.conversation.findMany({
        where: { buyerId: userId, isArchived: false },
        include: {
          seller: { select: { id: true, companyName: true, logoUrl: true } },
          lot: { select: { id: true, title: true, images: { take: 1, select: { imageUrl: true } } } },
        },
        orderBy: { lastMessageAt: 'desc' },
        take: 50,
      });

      return NextResponse.json({
        conversations: conversations.map((c: any) => ({
          id: c.id,
          subject: c.subject,
          lastMessage: c.lastMessage,
          lastMessageAt: c.lastMessageAt,
          unreadCount: c.buyerUnread,
          otherParty: { name: c.seller.companyName, avatarUrl: c.seller.logoUrl },
          lot: c.lot ? { id: c.lot.id, title: c.lot.title, imageUrl: c.lot.images[0]?.imageUrl } : null,
          createdAt: c.createdAt,
        })),
      });
    }
  } catch (error) {
    console.error('GET /api/conversations error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Create a new conversation or get existing one
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = session.user as any;
    if (user.role === 'SELLER') {
      return NextResponse.json({ error: 'Satıcılar yeni konuşma başlatamaz' }, { status: 403 });
    }

    const body = await req.json();
    const { sellerId, lotId, subject, message } = body;

    if (!sellerId || !message) {
      return NextResponse.json({ error: 'sellerId ve message gereklidir' }, { status: 400 });
    }

    // İletişim bilgisi filtresi
    const filterResult = checkMessageForContactInfo(message.trim());
    if (filterResult.blocked) {
      return NextResponse.json({ error: filterResult.reason }, { status: 400 });
    }

    // Check seller exists
    const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
    if (!seller) return NextResponse.json({ error: 'Satıcı bulunamadı' }, { status: 404 });

    // Can't message yourself
    if (seller.userId === user.id) {
      return NextResponse.json({ error: 'Kendinize mesaj gönderemezsiniz' }, { status: 400 });
    }

    // Find or create conversation
    const defaultSubject = subject || (lotId ? 'Lot hakkında soru' : 'Genel soru');
    let conversation = await prisma.conversation.findFirst({
      where: { buyerId: user.id, sellerId, lotId: lotId || null },
    });

    const isNew = !conversation;

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          buyerId: user.id,
          sellerId,
          lotId: lotId || null,
          subject: defaultSubject,
          lastMessage: message,
          lastMessageAt: new Date(),
          sellerUnread: 1,
        },
      });
    }

    // Create the message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: user.id,
        senderRole: 'BUYER',
        content: message,
      },
    });

    // Update conversation (increment unread only if not newly created)
    if (!isNew) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: message,
          lastMessageAt: new Date(),
          sellerUnread: { increment: 1 },
        },
      });
    }

    return NextResponse.json({ conversationId: conversation.id });
  } catch (error) {
    console.error('POST /api/conversations error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
