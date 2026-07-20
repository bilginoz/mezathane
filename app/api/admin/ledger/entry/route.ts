export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

const ACCOUNT_TYPES = ['BUYER', 'SELLER', 'PLATFORM'];
const ENTRY_TYPES = ['DEBIT', 'CREDIT'];

// Elle cari hareket ekle (borç/alacak, tahsilat, iade, kesinti, avans...)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    const body = await request.json();
    const {
      accountType, ownerId, entryType, amount, description,
      category, paymentMethod, bankName, entryDate, relatedPaymentId, relatedLotId,
    } = body;

    if (!ACCOUNT_TYPES.includes(accountType)) return NextResponse.json({ error: 'Geçersiz hesap tipi' }, { status: 400 });
    if (!ENTRY_TYPES.includes(entryType)) return NextResponse.json({ error: 'Borç/Alacak seçiniz' }, { status: 400 });
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return NextResponse.json({ error: 'Geçerli bir tutar giriniz' }, { status: 400 });
    if (!description || !description.trim()) return NextResponse.json({ error: 'Açıklama giriniz' }, { status: 400 });
    if (accountType === 'BUYER' && !ownerId) return NextResponse.json({ error: 'Alıcı gerekli' }, { status: 400 });
    if (accountType === 'SELLER' && !ownerId) return NextResponse.json({ error: 'Satıcı gerekli' }, { status: 400 });

    const entry = await prisma.ledgerEntry.create({
      data: {
        accountType,
        userId: accountType === 'BUYER' ? ownerId : null,
        sellerId: accountType === 'SELLER' ? ownerId : null,
        entryType,
        amount: amt,
        description: description.trim(),
        category: category || 'diger',
        paymentMethod: paymentMethod || null,
        bankName: bankName || null,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        relatedPaymentId: relatedPaymentId || null,
        relatedLotId: relatedLotId || null,
        createdById: (session.user as any).id,
      },
    });
    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    console.error('Ledger entry POST error:', error);
    return NextResponse.json({ error: 'Kayıt eklenemedi' }, { status: 500 });
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
    await prisma.ledgerEntry.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Ledger entry DELETE error:', error);
    return NextResponse.json({ error: 'Kayıt silinemedi' }, { status: 500 });
  }
}
