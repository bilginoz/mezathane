export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// Alarm aç/kapat (ve benzeri güncellemeler)
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;
    const { id } = await params;

    // Sadece kendi kaydını güncelleyebilir
    const existing = await prisma.savedSearch.findUnique({ where: { id }, select: { userId: true } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    }

    const body = await request.json();
    const data: any = {};
    if (typeof body.alertEnabled === 'boolean') data.alertEnabled = body.alertEnabled;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 });
    }

    const updated = await prisma.savedSearch.update({ where: { id }, data });
    return NextResponse.json({ search: updated });
  } catch (error) {
    console.error('SavedSearch PATCH error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Kayıtlı aramayı sil
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;
    const { id } = await params;

    const existing = await prisma.savedSearch.findUnique({ where: { id }, select: { userId: true } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Bulunamadı' }, { status: 404 });
    }

    await prisma.savedSearch.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('SavedSearch DELETE error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
