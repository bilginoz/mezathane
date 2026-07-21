export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { checkMessageForContactInfo } from '@/lib/message-filter';

// GET: Get messages for a conversation
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = session.user as any;

    // Get conversation and verify access
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        buyer: { select: { id: true, fullName: true, avatarUrl: true } },
        seller: { select: { id: true, companyName: true, logoUrl: true, userId: true } },
        lot: { select: { id: true, title: true, images: { take: 1, select: { imageUrl: true } } } },
      },
    });

    if (!conversation) return NextResponse.json({ error: 'Konuşma bulunamadı' }, { status: 404 });

    // Verify access
    const isBuyer = conversation.buyerId === user.id;
    const isSeller = conversation.seller.userId === user.id;
    if (!isBuyer && !isSeller && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 });
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    // Mark as read
    if (isBuyer) {
      await prisma.conversation.update({ where: { id: conversationId }, data: { buyerUnread: 0 } });
      await prisma.message.updateMany({
        where: { conversationId, senderRole: 'SELLER', isRead: false },
        data: { isRead: true },
      });
    } else if (isSeller) {
      await prisma.conversation.update({ where: { id: conversationId }, data: { sellerUnread: 0 } });
      await prisma.message.updateMany({
        where: { conversationId, senderRole: 'BUYER', isRead: false },
        data: { isRead: true },
      });
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        subject: conversation.subject,
        buyer: conversation.buyer,
        seller: { id: conversation.seller.id, name: conversation.seller.companyName, avatarUrl: conversation.seller.logoUrl },
        lot: conversation.lot ? { id: conversation.lot.id, title: conversation.lot.title, imageUrl: conversation.lot.images[0]?.imageUrl } : null,
        createdAt: conversation.createdAt,
      },
      messages: messages.map((m: any) => ({
        id: m.id,
        senderId: m.senderId,
        senderRole: m.senderRole,
        content: m.content,
        isRead: m.isRead,
        createdAt: m.createdAt,
      })),
      currentRole: isBuyer ? 'BUYER' : 'SELLER',
    });
  } catch (error) {
    console.error('GET /api/conversations/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Send a message in conversation
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = session.user as any;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { seller: { select: { userId: true } } },
    });

    if (!conversation) return NextResponse.json({ error: 'Konuşma bulunamadı' }, { status: 404 });

    const isBuyer = conversation.buyerId === user.id;
    const isSeller = conversation.seller.userId === user.id;
    if (!isBuyer && !isSeller) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 });
    }

    const body = await req.json();
    const { message } = body;
    if (!message?.trim()) return NextResponse.json({ error: 'Mesaj boş olamaz' }, { status: 400 });

    // İletişim bilgisi filtresi
    const filterResult = checkMessageForContactInfo(message.trim());
    if (filterResult.blocked) {
      return NextResponse.json({ error: filterResult.reason }, { status: 400 });
    }

    const senderRole = isBuyer ? 'BUYER' : 'SELLER';

    // Create message
    const newMessage = await prisma.message.create({
      data: {
        conversationId,
        senderId: user.id,
        senderRole,
        content: message.trim(),
      },
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: message.trim(),
        lastMessageAt: new Date(),
        ...(isBuyer ? { sellerUnread: { increment: 1 } } : { buyerUnread: { increment: 1 } }),
      },
    });

    return NextResponse.json({
      message: {
        id: newMessage.id,
        senderId: newMessage.senderId,
        senderRole: newMessage.senderRole,
        content: newMessage.content,
        isRead: false,
        createdAt: newMessage.createdAt,
      },
    });
  } catch (error) {
    console.error('POST /api/conversations/[id] error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
