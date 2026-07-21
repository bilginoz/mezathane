export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) return NextResponse.json({ error: 'Satıcı profili yok' }, { status: 403 });

    const auction = await prisma.auction.findFirst({
      where: { id, sellerId: seller.id },
      include: {
        lots: {
          orderBy: { sortOrder: 'asc' },
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            category: true,
            lotCategories: { include: { category: true }, orderBy: { createdAt: 'asc' } },
            _count: { select: { bids: true, watchlist: true } },
          },
        },
        _count: { select: { lots: true } },
      },
    });

    if (!auction) return NextResponse.json({ error: 'Müzayede bulunamadı' }, { status: 404 });

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ auction, categories });
  } catch (error: any) {
    console.error('Get seller auction error:', error);
    return NextResponse.json({ error: 'Veri yüklenemedi' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller) return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

    const existing = await prisma.auction.findFirst({ where: { id, sellerId: seller.id } });
    if (!existing) return NextResponse.json({ error: 'Müzayede bulunamadı' }, { status: 404 });

    const body = await request.json();
    const { title, description, startDate, endDate, liveStartDate, liveOnly, liveDelayMinutes, waitingTime, fairWaitingTime, status } = body;

    // Status değişikliği her zaman izinli (DRAFT->ACTIVE, ACTIVE->LIVE vs.)
    // Ama bilgi düzenleme sadece DRAFT'ta izinli
    const isStatusChangeOnly = status && Object.keys(body).filter(k => body[k] !== undefined && k !== 'status').length === 0;
    const isDraft = existing.status === 'DRAFT';

    if (!isStatusChangeOnly && !isDraft) {
      return NextResponse.json({ error: 'Müzayede bilgileri sadece taslak durumunda düzenlenebilir.' }, { status: 400 });
    }

    // "Canlıya Al" (LIVE) yapılırken tarih alanlarını senkronize et
    const now = new Date();
    const liveStartFix: Record<string, any> = {};
    if (status === 'LIVE') {
      // liveStartDate gelecekte veya boşsa şimdiye ayarla
      if (!existing.liveStartDate || new Date(existing.liveStartDate) > now) {
        liveStartFix.liveStartDate = now;
      }
      // startDate gelecekteyse şimdiye ayarla (teklif kontrolü startDate'e bakıyor)
      if (existing.startDate && new Date(existing.startDate) > now) {
        liveStartFix.startDate = now;
      }
    }

    const auction = await prisma.auction.update({
      where: { id },
      data: {
        ...(isDraft && title && { title }),
        ...(isDraft && description !== undefined && { description }),
        ...(isDraft && startDate && { startDate: new Date(startDate) }),
        ...(isDraft && endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(isDraft && liveStartDate && { liveStartDate: new Date(liveStartDate) }),
        ...(isDraft && liveOnly !== undefined && { liveOnly }),
        ...(isDraft && liveDelayMinutes !== undefined && { liveDelayMinutes: Math.min(1440, Math.max(0, liveDelayMinutes)) }),
        ...(isDraft && waitingTime !== undefined && { waitingTime: Math.min(120, Math.max(5, waitingTime)) }),
        ...(isDraft && fairWaitingTime !== undefined && { fairWaitingTime: Math.min(15, Math.max(5, fairWaitingTime)) }),
        ...(isDraft && body.paymentDays !== undefined && { paymentDays: Math.min(7, Math.max(2, body.paymentDays)) }),
        ...(status && { status }),
        ...liveStartFix,
      },
    });

    return NextResponse.json({ success: true, auction });
  } catch (error: any) {
    console.error('Update auction error:', error);
    return NextResponse.json({ error: 'Güncelleme başarısız' }, { status: 500 });
  }
}
