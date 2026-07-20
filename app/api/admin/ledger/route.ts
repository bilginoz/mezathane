export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { buildBuyerLedger, buildSellerLedger, buildPlatformLedger } from '@/lib/ledger';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (type === 'platform') {
      return NextResponse.json(await buildPlatformLedger());
    }
    if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 });
    if (type === 'buyer') {
      const res = await buildBuyerLedger(id);
      if (!res) return NextResponse.json({ error: 'Alıcı bulunamadı' }, { status: 404 });
      return NextResponse.json(res);
    }
    if (type === 'seller') {
      const res = await buildSellerLedger(id);
      if (!res) return NextResponse.json({ error: 'Satıcı bulunamadı' }, { status: 404 });
      return NextResponse.json(res);
    }
    return NextResponse.json({ error: 'Geçersiz tip' }, { status: 400 });
  } catch (error: any) {
    console.error('Admin ledger error:', error);
    return NextResponse.json({ error: 'Ekstre yüklenemedi' }, { status: 500 });
  }
}
