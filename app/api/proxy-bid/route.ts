export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// Kullanıcının aktif proxy bid'ini getir
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const lotId = searchParams.get('lotId');

    if (!lotId) {
      return NextResponse.json({ error: 'lotId gerekli' }, { status: 400 });
    }

    const proxyBid = await prisma.proxyBid.findUnique({
      where: { userId_lotId: { userId, lotId } },
    });

    return NextResponse.json({ proxyBid });
  } catch (error: any) {
    console.error('Proxy bid fetch error:', error);
    return NextResponse.json({ error: 'Hata oluştu' }, { status: 500 });
  }
}

// Proxy bid iptal et
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const lotId = searchParams.get('lotId');

    if (!lotId) {
      return NextResponse.json({ error: 'lotId gerekli' }, { status: 400 });
    }

    await prisma.proxyBid.updateMany({
      where: { userId, lotId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Proxy bid delete error:', error);
    return NextResponse.json({ error: 'Hata oluştu' }, { status: 500 });
  }
}
