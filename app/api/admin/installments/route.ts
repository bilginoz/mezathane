export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// Bir alıcının taksit planlarını getir
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId gerekli' }, { status: 400 });

    const plans = await prisma.installmentPlan.findMany({
      where: { userId },
      include: {
        installments: { orderBy: { seq: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // lot başlıklarını ekle
    const lotIds = plans.map((p) => p.lotId);
    const lots = await prisma.lot.findMany({ where: { id: { in: lotIds } }, select: { id: true, title: true, lotNumber: true, auction: { select: { title: true } } } });
    const lotMap = new Map(lots.map((l) => [l.id, l]));
    const enriched = plans.map((p) => ({
      ...p,
      lot: lotMap.get(p.lotId) ?? null,
    }));
    return NextResponse.json({ plans: enriched });
  } catch (error: any) {
    console.error('Installments GET error:', error);
    return NextResponse.json({ error: 'Taksit planları yüklenemedi' }, { status: 500 });
  }
}

// Yeni taksit planı oluştur
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    const body = await request.json();
    const { userId, lotId, paymentId, totalAmount, installmentCount, firstDueDate, intervalDays, note } = body;

    const count = parseInt(installmentCount);
    const total = parseFloat(totalAmount);
    if (!userId || !lotId) return NextResponse.json({ error: 'Alıcı ve ürün gerekli' }, { status: 400 });
    if (!count || count < 2 || count > 36) return NextResponse.json({ error: 'Taksit sayısı 2-36 arası olmalı' }, { status: 400 });
    if (!total || total <= 0) return NextResponse.json({ error: 'Geçerli tutar giriniz' }, { status: 400 });

    const interval = parseInt(intervalDays) || 30;
    const start = firstDueDate ? new Date(firstDueDate) : new Date();
    const per = Math.floor((total / count) * 100) / 100;
    const last = Math.round((total - per * (count - 1)) * 100) / 100;

    const plan = await prisma.installmentPlan.create({
      data: {
        userId, lotId, paymentId: paymentId || null,
        totalAmount: total, installmentCount: count, note: note || null,
        createdById: (session.user as any).id,
        installments: {
          create: Array.from({ length: count }, (_, i) => {
            const due = new Date(start);
            due.setDate(due.getDate() + interval * i);
            return { seq: i + 1, amount: i === count - 1 ? last : per, dueDate: due };
          }),
        },
      },
      include: { installments: { orderBy: { seq: 'asc' } } },
    });
    return NextResponse.json({ success: true, plan });
  } catch (error: any) {
    console.error('Installments POST error:', error);
    return NextResponse.json({ error: 'Taksit planı oluşturulamadı' }, { status: 500 });
  }
}

// Taksit öde / geri al
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    const body = await request.json();
    const { installmentId, action, paymentMethod, bankName } = body;
    if (!installmentId) return NextResponse.json({ error: 'installmentId gerekli' }, { status: 400 });

    const inst = await prisma.installment.findUnique({ where: { id: installmentId }, include: { plan: true } });
    if (!inst) return NextResponse.json({ error: 'Taksit bulunamadı' }, { status: 404 });

    if (action === 'pay') {
      await prisma.installment.update({
        where: { id: installmentId },
        data: { isPaid: true, paidAmount: inst.amount, paidAt: new Date() },
      });
      // ekstreye tahsilat kaydı düş
      await prisma.ledgerEntry.create({
        data: {
          accountType: 'BUYER',
          userId: inst.plan.userId,
          entryType: 'CREDIT',
          amount: inst.amount,
          description: `${inst.seq}. taksit tahsilatı`,
          category: 'tahsilat',
          paymentMethod: paymentMethod || null,
          bankName: bankName || null,
          relatedPaymentId: inst.plan.paymentId,
          relatedLotId: inst.plan.lotId,
          createdById: (session.user as any).id,
        },
      });
    } else if (action === 'unpay') {
      await prisma.installment.update({
        where: { id: installmentId },
        data: { isPaid: false, paidAmount: 0, paidAt: null },
      });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Installments PATCH error:', error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 });
    await prisma.installmentPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Installments DELETE error:', error);
    return NextResponse.json({ error: 'Plan silinemedi' }, { status: 500 });
  }
}
