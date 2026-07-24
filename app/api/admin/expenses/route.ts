export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

// Not: Next.js route dosyaları yalnızca HTTP metodlarını ve belirli ayarları
// dışa aktarabilir; bu sabitler bilerek export EDİLMEDİ.
const EXPENSE_CATEGORIES: readonly string[] = [
  'hosting', 'reklam', 'kira', 'maas', 'kargo', 'ofis', 'yazilim', 'vergi', 'diger',
];

const CATEGORY_LABELS: Record<string, string> = {
  hosting: 'Sunucu / Hosting',
  reklam: 'Reklam / Pazarlama',
  kira: 'Kira',
  maas: 'Maaş / Personel',
  kargo: 'Kargo',
  ofis: 'Ofis / Kırtasiye',
  yazilim: 'Yazılım / Abonelik',
  vergi: 'Vergi / Resmi Ödeme',
  diger: 'Diğer',
};

function round(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// GET: gider listesi + dönem özeti. ?from=&to=&category=
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const category = searchParams.get('category');

    const where: any = {};
    if (from || to) {
      where.expenseDate = {};
      if (from) where.expenseDate.gte = new Date(from);
      // Bitiş tarihi dahil olsun diye günün sonuna çek
      if (to) { const t = new Date(to); t.setHours(23, 59, 59, 999); where.expenseDate.lte = t; }
    }
    if (category) where.category = category;

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      take: 500,
    });

    // Özet: toplam + kategori kırılımı
    const totalAmount = round(expenses.reduce((s, e) => s + e.totalAmount, 0));
    const totalKdv = round(expenses.reduce((s, e) => s + e.kdvAmount, 0));
    const byCategory: Record<string, number> = {};
    for (const e of expenses) {
      byCategory[e.category] = round((byCategory[e.category] ?? 0) + e.totalAmount);
    }

    return NextResponse.json({
      expenses,
      summary: { count: expenses.length, totalAmount, totalKdv, byCategory },
      categoryLabels: CATEGORY_LABELS,
    });
  } catch (error) {
    console.error('Expenses GET error:', error);
    return NextResponse.json({ error: 'Giderler yüklenemedi' }, { status: 500 });
  }
}

// POST: yeni gider kaydı
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const category = EXPENSE_CATEGORIES.includes(body.category) ? body.category : 'diger';
    const amount = Number(body.amount);
    const kdvRate = body.kdvRate === undefined || body.kdvRate === null ? 20 : Number(body.kdvRate);

    if (!title) return NextResponse.json({ error: 'Açıklama gerekli' }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Geçerli bir tutar girin' }, { status: 400 });
    }
    if (!Number.isFinite(kdvRate) || kdvRate < 0 || kdvRate > 100) {
      return NextResponse.json({ error: 'Geçersiz KDV oranı' }, { status: 400 });
    }

    const kdvAmount = round(amount * (kdvRate / 100));
    const totalAmount = round(amount + kdvAmount);

    const expense = await prisma.expense.create({
      data: {
        title,
        category,
        amount: round(amount),
        kdvRate,
        kdvAmount,
        totalAmount,
        supplier: body.supplier?.trim() || null,
        documentNo: body.documentNo?.trim() || null,
        paymentMethod: body.paymentMethod || null,
        bankName: body.bankName?.trim() || null,
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date(),
        notes: body.notes?.trim() || null,
        createdById: (session.user as any).id,
      },
    });

    return NextResponse.json({ expense });
  } catch (error) {
    console.error('Expenses POST error:', error);
    return NextResponse.json({ error: 'Gider kaydedilemedi' }, { status: 500 });
  }
}

// DELETE: gider sil (?id=)
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 });

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });

    await prisma.expense.delete({ where: { id } });

    // Para ile ilgili bir kaydın silinmesi iz bırakmalı
    await logAudit({
      userId: (session.user as any).id,
      userName: (session.user as any).name ?? undefined,
      action: 'DELETE_EXPENSE',
      entity: 'Expense',
      entityId: id,
      details: { title: existing.title, totalAmount: existing.totalAmount, category: existing.category },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Expenses DELETE error:', error);
    return NextResponse.json({ error: 'Gider silinemedi' }, { status: 500 });
  }
}
