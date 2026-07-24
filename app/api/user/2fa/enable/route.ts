export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { verifyTOTP } from '@/lib/totp';
import bcrypt from 'bcryptjs';

// Rastgele okunaklı yedek kod (ör. "A3F9-7K2Q")
function generateBackupCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // karışabilen 0/O/1/I çıkarıldı
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

/*
  2FA kurulumu 2. adım: kullanıcı authenticator kodunu girer. Kod doğruysa 2FA
  aktifleşir ve tek kullanımlık YEDEK KODLAR üretilip (hash'lenerek) saklanır;
  düz metin kodlar SADECE bu yanıtta bir kez döner (kullanıcı saklamalı).
*/
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;

    const { token } = await request.json();
    if (typeof token !== 'string') {
      return NextResponse.json({ error: 'Kod gerekli' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { twoFactorSecret: true, twoFactorEnabled: true } });
    if (!user?.twoFactorSecret) {
      return NextResponse.json({ error: 'Önce kurulumu başlatın.' }, { status: 400 });
    }
    if (user.twoFactorEnabled) {
      return NextResponse.json({ error: 'İki adımlı doğrulama zaten açık.' }, { status: 400 });
    }
    if (!verifyTOTP(token, user.twoFactorSecret)) {
      return NextResponse.json({ error: 'Kod doğrulanamadı. Lütfen tekrar deneyin.' }, { status: 400 });
    }

    // Yedek kodlar üret + hash'le
    const backupCodes = Array.from({ length: 10 }, generateBackupCode);
    const hashed = await Promise.all(backupCodes.map(c => bcrypt.hash(c.replace('-', ''), 10)));

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorBackupCodes: JSON.stringify(hashed) },
    });

    return NextResponse.json({ success: true, backupCodes });
  } catch (error) {
    console.error('2FA enable error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
