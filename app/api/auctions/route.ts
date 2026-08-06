export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { consumeOneRight } from '@/lib/auction-rights';
import { getDirectRevenueModel } from '@/lib/revenue-model';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '12');

    const where: any = { isPublic: true, seller: { status: 'APPROVED' } };
    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['SCHEDULED', 'ACTIVE', 'LIVE'] };
    }
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (category) {
      where.lots = { some: { category: { slug: category } } };
    }

    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
        where,
        include: {
          seller: { select: { companyName: true, logoUrl: true, isVerified: true } },
          lots: { take: 4, orderBy: { sortOrder: 'asc' }, select: { images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { imageUrl: true } } } },
          _count: { select: { lots: true } },
        },
        orderBy: { startDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auction.count({ where }),
    ]);

    return NextResponse.json({ auctions, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error: any) {
    console.error('Auctions fetch error:', error);
    return NextResponse.json({ error: 'Müzayedeler yüklenemedi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller || seller.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Onaylı satıcı profili gerekli' }, { status: 403 });
    }

    const body = await request.json();

    // Alıcı komisyon oranı (DIRECT modda): müzayede bazında satıcının belirlediği oran,
    // profildeki varsayılan orana ÖNCELİKLİDİR. Geçersiz/aralık dışıysa profil oranına düşer.
    const customPremium = Number(body.buyerPremiumRate);
    const resolvedPremiumRate = Number.isFinite(customPremium) && customPremium >= 0 && customPremium <= 30
      ? customPremium
      : ((seller as any).buyerPremiumRate ?? 7.0);

    const auctionData = {
      title: body.title,
      description: body.description ?? null,
      bannerUrl: body.bannerUrl ?? null,
      sellerId: seller.id,
      status: body.status ?? 'DRAFT',
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      liveStartDate: body.liveStartDate ? new Date(body.liveStartDate) : null,
      liveOnly: body.liveOnly ?? false,
      liveDelayMinutes: Math.min(1440, Math.max(0, body.liveDelayMinutes ?? 30)),
      waitingTime: Math.min(120, Math.max(5, body.waitingTime ?? 20)),
      fairWaitingTime: Math.min(15, Math.max(5, body.fairWaitingTime ?? 5)),
      commissionRate: seller.commissionRate,
      buyerPremiumRate: resolvedPremiumRate, // DIRECT modda alıcı komisyonu; müzayede bazlı belirlenebilir
      paymentDays: Math.min(7, Math.max(2, body.paymentDays ?? 5)),
      isPublic: body.isPublic ?? true,
    };

    const revenueModel = await getDirectRevenueModel();
    let auction;

    if (revenueModel === 'HIZMET_BEDELI') {
      // AŞAMA 3d (2026-08-06): bu modelde satıcı önden hak satın almaz, kontör tüketilmez.
      // Yerine kısıtlama: vadesi geçmiş, admin onayı almamış hizmet bedeli borcu varsa yeni
      // müzayede açılamaz (alıcı tarafındaki vade-aşımı kısıtının satıcıya uyarlanmış hâli).
      const overdue = await prisma.payment.findFirst({
        where: {
          lot: { auction: { sellerId: seller.id } },
          serviceFeeDueDate: { lt: new Date() },
          serviceFeePaidAt: null,
        },
        select: { id: true },
      });
      if (overdue) {
        return NextResponse.json(
          { error: 'Ödenmemiş hizmet bedeli borcunuz var. Yeni müzayede açmak için Cari sayfanızdan ödemenizi bildirin.', code: 'SERVICE_FEE_OVERDUE' },
          { status: 402 }
        );
      }
      auction = await prisma.auction.create({ data: auctionData });
    } else {
      // KONTOR (varsayılan, mevcut davranış): müzayede açmak 1 "Müzayede Hakkı" kullanır.
      // Kontrol + hak düşme + müzayede oluşturma tek transaction'da atomik yapılır.
      try {
        auction = await prisma.$transaction(async (tx) => {
          const consumed = await consumeOneRight(tx, seller.id);
          if (!consumed) throw new Error('NO_RIGHT');
          return tx.auction.create({ data: auctionData });
        });
      } catch (e: any) {
        if (e?.message === 'NO_RIGHT') {
          return NextResponse.json(
            { error: 'Müzayede hakkınız yok. Müzayede açmak için "Müzayede Hakkı" satın alın.', code: 'NO_RIGHT' },
            { status: 402 }
          );
        }
        throw e;
      }
    }
    return NextResponse.json({ auction });
  } catch (error: any) {
    console.error('Create auction error:', error);
    return NextResponse.json({ error: 'Müzayede oluşturulamadı' }, { status: 500 });
  }
}
