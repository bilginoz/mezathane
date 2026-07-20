import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST - Kupon kodunu doğrula
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;
    const { code, purchaseAmount } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Kupon kodu gerekli' }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: { _count: { select: { usages: true } } },
    });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş kupon kodu' }, { status: 400 });
    }

    // Kullanıcıya özel kupon kontrolü
    if (coupon.assignedUserId && coupon.assignedUserId !== userId) {
      return NextResponse.json({ error: 'Bu kupon size tanımlanmamıştır' }, { status: 400 });
    }

    const now = new Date();
    if (coupon.validFrom > now) {
      return NextResponse.json({ error: 'Bu kupon henüz aktif değil' }, { status: 400 });
    }
    if (coupon.validUntil && coupon.validUntil < now) {
      return NextResponse.json({ error: 'Bu kuponun süresi dolmuş' }, { status: 400 });
    }

    if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) {
      return NextResponse.json({ error: 'Bu kuponun kullanım limiti dolmuş' }, { status: 400 });
    }

    // Kullanıcı bazlı limit kontrolü
    const userUsageCount = await prisma.couponUsage.count({
      where: { couponId: coupon.id, userId },
    });
    if (userUsageCount >= coupon.perUserLimit) {
      return NextResponse.json({ error: 'Bu kuponu daha önce kullandınız' }, { status: 400 });
    }

    // Minimum alışveriş tutarı kontrolü
    const amount = purchaseAmount ? parseFloat(purchaseAmount) : 0;
    if (coupon.minPurchase && amount < coupon.minPurchase) {
      return NextResponse.json({ error: `Minimum alışveriş tutarı: ₺${coupon.minPurchase.toLocaleString('tr-TR')}` }, { status: 400 });
    }

    // İndirim hesapla
    let discount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      discount = amount * (coupon.discountValue / 100);
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.discountValue;
    }
    discount = Math.min(discount, amount); // indirim tutarı aşamaz

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscount: coupon.maxDiscount,
      },
      calculatedDiscount: discount,
    });
  } catch (e) {
    console.error('Coupon validate error:', e);
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}
