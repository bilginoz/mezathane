export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { buildBuyerLedger } from '@/lib/ledger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const userId = (session.user as any).id;
    const res = await buildBuyerLedger(userId);
    if (!res) return NextResponse.json({ error: 'Hesap bulunamadı' }, { status: 404 });
    return NextResponse.json(res);
  } catch (error: any) {
    console.error('Buyer ledger error:', error);
    return NextResponse.json({ error: 'Ekstre yüklenemedi' }, { status: 500 });
  }
}
