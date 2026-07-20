export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// GET: List seller's templates
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) return NextResponse.json({ error: 'Satıcı profili yok' }, { status: 403 });

    const templates = await prisma.auctionTemplate.findMany({
      where: { sellerId: seller.id },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error('List templates error:', error);
    return NextResponse.json({ error: 'Şablonlar yüklenemedi' }, { status: 500 });
  }
}

// POST: Create template from auction or from scratch
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller || seller.status !== 'APPROVED') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

    const body = await request.json();
    const { name, fromAuctionId, auctionData } = body;

    if (!name) {
      return NextResponse.json({ error: 'Şablon adı gerekli' }, { status: 400 });
    }

    // Limit to 10 templates per seller
    const count = await prisma.auctionTemplate.count({ where: { sellerId: seller.id } });
    if (count >= 10) {
      return NextResponse.json({ error: 'En fazla 10 şablon oluşturabilirsiniz' }, { status: 400 });
    }

    let templateData: any = {};

    if (fromAuctionId) {
      // Create from existing auction
      const auction = await prisma.auction.findFirst({
        where: { id: fromAuctionId, sellerId: seller.id },
        include: {
          lots: {
            include: { images: true, category: true },
            orderBy: { lotNumber: 'asc' },
          },
        },
      });
      if (!auction) return NextResponse.json({ error: 'Müzayede bulunamadı' }, { status: 404 });

      templateData = {
        description: auction.description,
        waitingTime: auction.waitingTime,
        fairWaitingTime: auction.fairWaitingTime,
        liveOnly: auction.liveOnly,
        liveDelayMinutes: auction.liveDelayMinutes,
        paymentDays: auction.paymentDays,
        lots: auction.lots.map(l => ({
          title: l.title,
          description: l.description,
          notes: l.notes,
          categoryId: l.categoryId,
          categoryName: l.category?.name,
          startingPrice: l.startingPrice,
          estimatedPrice: l.estimatedPrice,
          images: l.images.map(img => img.imageUrl),
        })),
      };
    } else if (auctionData) {
      templateData = auctionData;
    }

    const template = await prisma.auctionTemplate.create({
      data: {
        name,
        sellerId: seller.id,
        templateData: JSON.stringify(templateData),
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error('Create template error:', error);
    return NextResponse.json({ error: 'Şablon oluşturulamadı' }, { status: 500 });
  }
}

// PATCH: Update template
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

    const body = await request.json();
    const { id, name, templateData } = body;

    if (!id) return NextResponse.json({ error: 'Şablon ID gerekli' }, { status: 400 });

    const existing = await prisma.auctionTemplate.findFirst({
      where: { id, sellerId: seller.id },
    });
    if (!existing) return NextResponse.json({ error: 'Şablon bulunamadı' }, { status: 404 });

    const updated = await prisma.auctionTemplate.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(templateData ? { templateData: JSON.stringify(templateData) } : {}),
      },
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (error: any) {
    console.error('Update template error:', error);
    return NextResponse.json({ error: 'Şablon güncellenemedi' }, { status: 500 });
  }
}

// DELETE: Delete template
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Şablon ID gerekli' }, { status: 400 });

    const existing = await prisma.auctionTemplate.findFirst({
      where: { id, sellerId: seller.id },
    });
    if (!existing) return NextResponse.json({ error: 'Şablon bulunamadı' }, { status: 404 });

    await prisma.auctionTemplate.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete template error:', error);
    return NextResponse.json({ error: 'Şablon silinemedi' }, { status: 500 });
  }
}
