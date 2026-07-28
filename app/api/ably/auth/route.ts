export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Ably from 'ably';

// Canlı müzayede istemcisi için Ably TOKEN üretir — API anahtarı tarayıcıya AÇILMAZ.
// Yetki: yalnızca ilgili "auction-<id>" kanalını DİNLEME (subscribe). Yayınlama (publish)
// sunucuda kalır (lib/realtime.ts). Böylece açıktaki anahtarla sahte sinyal/maliyet
// suistimali riski ortadan kalkar.
export async function GET(request: Request) {
  const key = process.env.ABLY_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'Ably yapılandırılmamış' }, { status: 503 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const auction = (searchParams.get('auction') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
    const channel = auction ? `auction-${auction}` : 'auction-*';

    const client = new Ably.Rest({ key });
    const tokenRequest = await client.auth.createTokenRequest({
      capability: JSON.stringify({ [channel]: ['subscribe'] }),
      ttl: 60 * 60 * 1000, // 1 saat
    });
    return NextResponse.json(tokenRequest);
  } catch (e) {
    console.error('Ably token error:', e);
    return NextResponse.json({ error: 'Token üretilemedi' }, { status: 500 });
  }
}
