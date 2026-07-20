export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// Satıcı fatura yükler (alıcıya kestiği ürün faturası)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const user = session.user as any;

    const body = await request.json();
    const { invoiceUrl, invoicePath } = body;

    if (!invoiceUrl || !invoicePath) {
      return NextResponse.json({ error: 'Fatura dosyası gerekli' }, { status: 400 });
    }

    // Satıcının kendi siparişi olduğunu kontrol et
    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: {
        lot: {
          include: { auction: { include: { seller: true } } },
        },
      },
    });

    if (!payment) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 });
    
    const seller = payment.lot.auction.seller as any;
    if (seller.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const updated = await prisma.payment.update({
      where: { id: params.id },
      data: { invoiceUrl, invoicePath },
    });

    return NextResponse.json({ success: true, payment: updated });
  } catch (error: any) {
    console.error('Invoice upload error:', error);
    return NextResponse.json({ error: 'Fatura yüklenemedi' }, { status: 500 });
  }
}
