export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/*
  2FA'yı kapat: güvenlik için mevcut ŞİFRE ile doğrulama ister. Doğruysa 2FA
  kapatılır, secret ve yedek kodlar silinir.
*/
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;

    const { password } = await request.json();
    if (typeof password !== 'string' || !password) {
      return NextResponse.json({ error: 'Şifrenizi girin' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true, twoFactorEnabled: true } });
    if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    if (!user.twoFactorEnabled) {
      return NextResponse.json({ error: 'İki adımlı doğrulama zaten kapalı.' }, { status: 400 });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return NextResponse.json({ error: 'Şifre yanlış.' }, { status: 401 });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
