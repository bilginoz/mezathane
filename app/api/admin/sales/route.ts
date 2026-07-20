export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

/*
  Admin: Ödenmeyen satış yönetimi
  ----------------------------------
  action = 'cancel'   -> Satışı iptal et. Lot 'UNSOLD' (satılmadı) olur, kazanan temizlenir,
                         bekleyen ödeme kaydı silinir. İstenirse alıcı engellenir.
  action = 'transfer' -> Ürünü bir sonraki (ikinci) en yüksek teklif verene devret.
                         Yeni kazanan + yeni ödeme kaydı oluşturulur, bildirim gönderilir.
                         İstenirse eski alıcı engellenir.
*/
// GET: Ödemesi bekleyen / geciken tüm satışların merkezi listesi
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const onlyOverdue = searchParams.get('overdue') === '1';
    const search = (searchParams.get('search') ?? '').trim();

    const payments = await prisma.payment.findMany({
      where: {
        buyerPaymentReceived: false,
        status: 'PENDING',
        lot: { status: 'SOLD' },
      },
      orderBy: { dueDate: 'asc' },
      select: {
        id: true, amount: true, dueDate: true, createdAt: true,
        user: { select: { id: true, fullName: true, email: true, phone: true, isActive: true } },
        lot: {
          select: {
            id: true, lotNumber: true, title: true, soldPrice: true, currentPrice: true,
            images: { take: 1, orderBy: { sortOrder: 'asc' }, select: { imageUrl: true } },
            auction: { select: { id: true, title: true, seller: { select: { companyName: true } } } },
          },
        },
      },
    });

    const now = Date.now();
    let items = payments.map((p) => {
      const due = p.dueDate ? new Date(p.dueDate).getTime() : null;
      const isOverdue = due != null && due < now;
      const daysOverdue = isOverdue && due != null ? Math.floor((now - due) / 86400000) : 0;
      return {
        paymentId: p.id,
        lotId: p.lot?.id ?? null,
        lotNumber: p.lot?.lotNumber ?? null,
        title: p.lot?.title ?? '-',
        image: p.lot?.images?.[0]?.imageUrl ?? null,
        auctionId: p.lot?.auction?.id ?? null,
        auctionTitle: p.lot?.auction?.title ?? '-',
        sellerName: p.lot?.auction?.seller?.companyName ?? '-',
        amount: p.lot?.soldPrice ?? p.lot?.currentPrice ?? p.amount ?? 0,
        dueDate: p.dueDate ?? null,
        isOverdue,
        daysOverdue,
        buyerId: p.user?.id ?? null,
        buyerName: p.user?.fullName ?? '-',
        buyerEmail: p.user?.email ?? '-',
        buyerPhone: p.user?.phone ?? null,
        buyerActive: p.user?.isActive ?? true,
      };
    });

    if (onlyOverdue) items = items.filter((i) => i.isOverdue);
    if (search) {
      const q = search.toLocaleLowerCase('tr');
      items = items.filter((i) =>
        i.title.toLocaleLowerCase('tr').includes(q) ||
        i.buyerName.toLocaleLowerCase('tr').includes(q) ||
        i.buyerEmail.toLocaleLowerCase('tr').includes(q) ||
        i.sellerName.toLocaleLowerCase('tr').includes(q) ||
        String(i.lotNumber ?? '').includes(q)
      );
    }

    const totalAmount = items.reduce((s, i) => s + (i.amount || 0), 0);
    const overdueCount = items.filter((i) => i.isOverdue).length;

    return NextResponse.json({
      items,
      stats: { total: items.length, overdueCount, totalAmount },
    });
  } catch (error: any) {
    console.error('Admin unpaid sales list error:', error);
    return NextResponse.json({ error: 'Liste yüklenemedi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const body = await request.json();
    const { lotId, action, banBuyer, note } = body ?? {};

    if (!lotId || !action) {
      return NextResponse.json({ error: 'lotId ve action zorunlu' }, { status: 400 });
    }

    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        auction: { select: { commissionRate: true, paymentDays: true } },
        bids: { orderBy: { amount: 'desc' } },
        payments: true,
      },
    });

    if (!lot) {
      return NextResponse.json({ error: 'Lot bulunamadı' }, { status: 404 });
    }

    const previousWinnerId = lot.winnerId;

    // Bu alıcı zaten ödemesini yaptıysa engelle (yanlışlıkla iptali önle)
    const paidPayment = lot.payments.find(
      (p) => p.status === 'PAID' || p.buyerPaymentReceived
    );
    if (paidPayment) {
      return NextResponse.json(
        { error: 'Bu satışın ödemesi alınmış görünüyor. Önce Finans ekranından “Alıcı Ödemesi” işaretini kaldırın.' },
        { status: 400 }
      );
    }

    if (action === 'cancel') {
      // Bekleyen ödeme kayıtlarını sil
      await prisma.payment.deleteMany({ where: { lotId, status: 'PENDING' } });

      const appendedNote = note
        ? `${lot.notes ? lot.notes + '\n' : ''}[Satış iptali] ${note}`
        : lot.notes;

      await prisma.lot.update({
        where: { id: lotId },
        data: {
          status: 'UNSOLD',
          winnerId: null,
          soldPrice: null,
          notes: appendedNote,
        },
      });

      if (banBuyer && previousWinnerId) {
        await prisma.user.update({
          where: { id: previousWinnerId },
          data: { isActive: false },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Satış iptal edildi, ürün “satılmadı” durumuna alındı.',
      });
    }

    if (action === 'transfer') {
      // Mevcut kazanan dışında, en yüksek teklifi veren farklı kullanıcıyı bul
      const nextBid = lot.bids.find((b) => b.userId !== previousWinnerId);

      if (!nextBid) {
        return NextResponse.json(
          { error: 'Devredilecek ikinci bir teklif sahibi bulunamadı.' },
          { status: 400 }
        );
      }

      // Eski bekleyen ödemeyi sil
      await prisma.payment.deleteMany({ where: { lotId, status: 'PENDING' } });

      // isWinning bayraklarını güncelle
      await prisma.bid.updateMany({ where: { lotId }, data: { isWinning: false } });
      await prisma.bid.update({ where: { id: nextBid.id }, data: { isWinning: true } });

      const appendedNote = `${lot.notes ? lot.notes + '\n' : ''}[Devir] Ürün 2. en yüksek teklife devredildi.${note ? ' ' + note : ''}`;

      await prisma.lot.update({
        where: { id: lotId },
        data: {
          status: 'SOLD',
          winnerId: nextBid.userId,
          soldPrice: nextBid.amount,
          currentPrice: nextBid.amount,
          notes: appendedNote,
        },
      });

      // Yeni alıcı için ödeme kaydı
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (lot.auction?.paymentDays ?? 5));
      const commAmt = nextBid.amount * ((lot.auction?.commissionRate ?? 15) / 100);
      // Alıcı komisyonu (buyer premium) hesapla
      const buyerPremiumRate = 10.0;
      const buyerPremiumAmount = nextBid.amount * (buyerPremiumRate / 100);
      const lotKdvRate = (lot.kdvRate ?? 20) / 100;
      const buyerPremiumKDV = Math.round(buyerPremiumAmount * lotKdvRate * 100) / 100;
      const buyerTotalAmount = nextBid.amount + buyerPremiumAmount + buyerPremiumKDV;
      const buyer = await prisma.user.findUnique({
        where: { id: nextBid.userId },
        select: { fullName: true, phone: true, shippingAddress: true },
      });
      await prisma.payment.create({
        data: {
          lotId,
          userId: nextBid.userId,
          amount: nextBid.amount,
          commissionAmount: commAmt,
          buyerPremiumRate,
          buyerPremiumAmount,
          buyerPremiumKDV,
          totalAmount: buyerTotalAmount,
          status: 'PENDING',
          dueDate,
          shippingName: buyer?.fullName ?? null,
          shippingAddress: buyer?.shippingAddress ?? null,
          shippingPhone: buyer?.phone ?? null,
        },
      });

      // Yeni kazanana bildirim
      await prisma.notification.create({
        data: {
          userId: nextBid.userId,
          title: 'Bir ürün size devredildi',
          message: `“${lot.title}” lotu size devredildi. Ödeme yapmak için siparişlerinizi inceleyin.`,
          type: 'SALE',
          link: '/panel/siparislerim',
        },
      });

      if (banBuyer && previousWinnerId) {
        await prisma.user.update({
          where: { id: previousWinnerId },
          data: { isActive: false },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Ürün ikinci en yüksek teklif sahibine devredildi.',
      });
    }

    return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin sales action error:', error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
