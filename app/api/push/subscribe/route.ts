export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// İstemci, push aboneliğini (endpoint + anahtarlar) buraya kaydeder. Giriş gerekli:
// bildirimler kullanıcıya bağlıdır. Aynı endpoint tekrar gelirse güncellenir (upsert).
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  const userId = (session.user as any).id as string;

  try {
    const body = await request.json();
    const sub = body?.subscription ?? body;
    const endpoint: string | undefined = sub?.endpoint;
    const p256dh: string | undefined = sub?.keys?.p256dh;
    const auth: string | undefined = sub?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Geçersiz abonelik' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent')?.slice(0, 300) ?? null;

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh, auth, userAgent },
      update: { userId, p256dh, auth, userAgent },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('push subscribe error', e);
    return NextResponse.json({ error: 'Kaydedilemedi' }, { status: 500 });
  }
}
