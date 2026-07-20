export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { buildSellerLedger } from '@/lib/ledger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const userId = (session.user as any).id;
    const profile = await prisma.sellerProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) return NextResponse.json({ error: 'Satıcı profili bulunamadı' }, { status: 404 });
    const res = await buildSellerLedger(profile.id);
    if (!res) return NextResponse.json({ error: 'Hesap bulunamadı' }, { status: 404 });
    return NextResponse.json(res);
  } catch (error: any) {
    console.error('Seller ledger error:', error);
    return NextResponse.json({ error: 'Ekstre yüklenemedi' }, { status: 500 });
  }
}
