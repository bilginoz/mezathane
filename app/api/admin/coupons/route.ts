import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Kuponları listele
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { usages: true } },
      },
    });

    // Attach assigned user info
    const couponIds = coupons.filter(c => c.assignedUserId).map(c => c.assignedUserId as string);
    const assignedUsers = couponIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: couponIds } }, select: { id: true, fullName: true, email: true, memberNumber: true } })
      : [];
    const userMap = Object.fromEntries(assignedUsers.map(u => [u.id, u]));
    const enrichedCoupons = coupons.map(c => ({
      ...c,
      assignedUser: c.assignedUserId ? userMap[c.assignedUserId] || null : null,
    }));
    return NextResponse.json({ coupons: enrichedCoupons });
  } catch (e) {
    console.error('Coupon GET error:', e);
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}

// POST - Yeni kupon oluştur
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const body = await req.json();
    const { code, description, discountType, discountValue, minPurchase, maxDiscount, maxUsage, perUserLimit, validFrom, validUntil, isActive, assignedUserId } = body;

    if (!code || !discountValue) {
      return NextResponse.json({ error: 'Kupon kodu ve indirim değeri gerekli' }, { status: 400 });
    }

    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return NextResponse.json({ error: 'Bu kupon kodu zaten mevcut' }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description: description || null,
        discountType: discountType || 'PERCENTAGE',
        discountValue: parseFloat(discountValue),
        minPurchase: minPurchase ? parseFloat(minPurchase) : null,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        maxUsage: maxUsage ? parseInt(maxUsage) : null,
        perUserLimit: perUserLimit ? parseInt(perUserLimit) : 1,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        isActive: isActive !== false,
        assignedUserId: assignedUserId || null,
      },
    });
    return NextResponse.json({ coupon });
  } catch (e) {
    console.error('Coupon POST error:', e);
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}

// PATCH - Kupon güncelle
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    const data: any = {};
    if (updates.description !== undefined) data.description = updates.description || null;
    if (updates.discountType) data.discountType = updates.discountType;
    if (updates.discountValue) data.discountValue = parseFloat(updates.discountValue);
    if (updates.minPurchase !== undefined) data.minPurchase = updates.minPurchase ? parseFloat(updates.minPurchase) : null;
    if (updates.maxDiscount !== undefined) data.maxDiscount = updates.maxDiscount ? parseFloat(updates.maxDiscount) : null;
    if (updates.maxUsage !== undefined) data.maxUsage = updates.maxUsage ? parseInt(updates.maxUsage) : null;
    if (updates.perUserLimit !== undefined) data.perUserLimit = parseInt(updates.perUserLimit) || 1;
    if (updates.validUntil !== undefined) data.validUntil = updates.validUntil ? new Date(updates.validUntil) : null;
    if (updates.isActive !== undefined) data.isActive = updates.isActive;
    if (updates.assignedUserId !== undefined) data.assignedUserId = updates.assignedUserId || null;

    const coupon = await prisma.coupon.update({ where: { id }, data });
    return NextResponse.json({ coupon });
  } catch (e) {
    console.error('Coupon PATCH error:', e);
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}

// DELETE - Kupon sil
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    await prisma.coupon.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Coupon DELETE error:', e);
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}
