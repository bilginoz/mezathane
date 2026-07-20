export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const rl = checkRateLimit(`reset:${ip}`, RATE_LIMITS.RESET_PASSWORD);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla istek. Lütfen 15 dakika sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token ve yeni şifre gereklidir' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Şifre en az 8 karakter olmalıdır' }, { status: 400 });
    }

    // Token ile kullanıcıyı bul
    const user = await prisma.user.findUnique({ where: { resetToken: token } });

    if (!user) {
      return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş bağlantı' }, { status: 400 });
    }

    // Token süresi kontrolü
    if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      // Süresi dolmuş token'ı temizle
      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken: null, resetTokenExpiry: null },
      });
      return NextResponse.json({ error: 'Bağlantının süresi dolmuş. Lütfen yeni bir şifre sıfırlama talebinde bulunun.' }, { status: 400 });
    }

    // Yeni şifreyi hashle ve kaydet, token'ı temizle
    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return NextResponse.json({ success: true, message: 'Şifreniz başarıyla güncellendi' });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 });
  }
}
