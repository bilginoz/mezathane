export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// Satıcının ek belgelerini listele
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    const seller = await prisma.sellerProfile.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!seller) return NextResponse.json({ error: 'Satıcı profili bulunamadı' }, { status: 404 });

    const docs = await prisma.sellerDocument.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, label: true, fileName: true, createdAt: true },
    });

    return NextResponse.json({ documents: docs });
  } catch (error) {
    console.error('Seller documents GET error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Yeni ek belge ekle
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    const seller = await prisma.sellerProfile.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!seller) return NextResponse.json({ error: 'Satıcı profili bulunamadı' }, { status: 404 });

    const body = await req.json();
    const { label, fileUrl, filePath, fileName, contentType } = body;

    if (!label || !label.trim()) {
      return NextResponse.json({ error: 'Belge etiketi zorunludur' }, { status: 400 });
    }

    const doc = await prisma.sellerDocument.create({
      data: {
        sellerId: seller.id,
        label: label.trim(),
        fileUrl: fileUrl || null,
        filePath: filePath || null,
        fileName: fileName || null,
        contentType: contentType || null,
      },
    });

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error('Seller document POST error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Belge sil
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const docId = searchParams.get('id');
    if (!docId) return NextResponse.json({ error: 'Belge ID gerekli' }, { status: 400 });

    const seller = await prisma.sellerProfile.findFirst({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!seller) return NextResponse.json({ error: 'Satıcı profili bulunamadı' }, { status: 404 });

    // Sadece kendi belgelerini silebilir
    const doc = await prisma.sellerDocument.findFirst({ where: { id: docId, sellerId: seller.id } });
    if (!doc) return NextResponse.json({ error: 'Belge bulunamadı' }, { status: 404 });

    await prisma.sellerDocument.delete({ where: { id: docId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Seller document DELETE error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
