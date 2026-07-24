export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

/*
  Giriş akışının 1. adımı: e-posta/telefon + şifre doğruysa, bu hesapta iki adımlı
  doğrulama açık mı bilgisini döner. Oturum AÇMAZ.

  Neden gerekli: NextAuth v4, authorize() içinde fırlatılan hata mesajını istemciye
  geçirmiyor — "şifre yanlış" ile "2FA kodu lazım" ayırt edilemiyor. Bu uç sayesinde
  giriş sayfası, kod alanını ne zaman göstereceğini bilir.

  Güvenlik: asıl zorunluluk authorize() içindedir. Bu uç yalnızca arayüz içindir;
  atlanması güvenliği zayıflatmaz (2FA açık kullanıcı kodsuz giriş yapamaz).
*/
export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const rl = checkRateLimit(`login:${ip}`, RATE_LIMITS.LOGIN);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }

    const { identifier, password } = await request.json();
    if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier || !password) {
      return NextResponse.json({ error: 'E-posta/telefon ve şifre gereklidir' }, { status: 400 });
    }

    // authorize() ile aynı kimlik çözümleme mantığı (e-posta veya telefon)
    const id = identifier.trim();
    const isPhone = /^\d/.test(id) && !id.includes('@');
    let user;
    if (isPhone) {
      let phone = id.replace(/[\s\-\(\)]/g, '');
      phone = phone.replace(/^\+90/, '').replace(/^0/, '');
      user = await prisma.user.findUnique({ where: { phone }, select: { password: true, isActive: true, twoFactorEnabled: true } });
    } else {
      user = await prisma.user.findUnique({ where: { email: id }, select: { password: true, isActive: true, twoFactorEnabled: true } });
    }

    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Geçersiz kimlik bilgileri' }, { status: 401 });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return NextResponse.json({ error: 'Geçersiz kimlik bilgileri' }, { status: 401 });
    }

    return NextResponse.json({ ok: true, twoFactorRequired: user.twoFactorEnabled === true });
  } catch (error) {
    console.error('2FA check error:', error);
    return NextResponse.json({ error: 'Giriş sırasında hata oluştu' }, { status: 500 });
  }
}
