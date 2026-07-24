export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { generateSecret, otpauthURL } from '@/lib/totp';
import QRCode from 'qrcode';

/*
  2FA kurulumu 1. adım: yeni bir TOTP secret üretir ve kullanıcıya kaydeder
  (henüz AKTİF ETMEZ — twoFactorEnabled false kalır). Kullanıcı authenticator
  uygulamasına ekleyip 6 haneli kodla /enable çağırınca aktifleşir.
*/
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, twoFactorEnabled: true } });
    if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: 'İki adımlı doğrulama zaten açık.' }, { status: 400 });
    }

    const secret = generateSecret();
    // Secret'i sakla ama aktif etme (enable adımında doğrulanınca aktifleşir)
    await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });

    const otpauth = otpauthURL(secret, user.email ?? userId);
    const qrDataUri = await QRCode.toDataURL(otpauth, { margin: 1, width: 220 });

    return NextResponse.json({ secret, otpauthUrl: otpauth, qrDataUri });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
