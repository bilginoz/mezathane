export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mailer';

/*
  E-posta değiştirme (kullanıcı kararı, 2026-08-01): "değiştirilemez" kilidi kaldırıldı; mailini
  kaybeden kullanıcı artık kilitlenmiyor, ama güvenlik için doğrulama şart:
  1) request: yeni adrese 6 haneli kod gönderilir (15 dk geçerli); ESKİ adrese de "değişiklik
     talep edildi, siz değilseniz..." bilgilendirmesi gider.
  2) confirm: doğru kod girilince User.email güncellenir.
  Şifre değişmiyor, oturum kapatılmıyor — sadece giriş adresi değişiyor.
*/

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id as string;

    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'request') {
      const newEmail = String(body?.newEmail ?? '').trim().toLowerCase();
      if (!EMAIL_RE.test(newEmail)) {
        return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin' }, { status: 400 });
      }
      const me = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, fullName: true } });
      if (!me) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
      if (newEmail === me.email.toLowerCase()) {
        return NextResponse.json({ error: 'Bu zaten mevcut e-posta adresiniz' }, { status: 400 });
      }
      const taken = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
      if (taken) return NextResponse.json({ error: 'Bu e-posta adresi başka bir hesapta kayıtlı' }, { status: 400 });

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiry = new Date(Date.now() + 15 * 60 * 1000);
      await prisma.user.update({
        where: { id: userId },
        data: { pendingEmail: newEmail, pendingEmailCode: code, pendingEmailExpiry: expiry },
      });

      await sendEmail({
        to: newEmail,
        subject: 'E-posta Değişikliği Doğrulama Kodu - Mezathane.tr',
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e7eb;padding:32px;border-radius:12px">
          <h2 style="color:#d4af37;text-align:center">E-posta Adresi Doğrulama</h2>
          <p style="text-align:center">Merhaba ${me.fullName ?? ''},</p>
          <p style="text-align:center">Hesabınızın e-posta adresini bu adrese değiştirmek için aşağıdaki kodu girin:</p>
          <div style="text-align:center;margin:24px 0">
            <span style="font-size:32px;font-weight:bold;color:#d4af37;letter-spacing:6px;font-family:monospace;background:#1a1a1a;border:2px solid #d4af37;border-radius:12px;padding:16px 32px;display:inline-block">${code}</span>
          </div>
          <p style="text-align:center;color:#9ca3af;font-size:13px">Bu kod 15 dakika geçerlidir. Bu değişikliği siz talep etmediyseniz bu e-postayı yok sayabilirsiniz.</p>
        </div>`,
      });

      // Eski adrese bilgilendirme — hesap ele geçirilmiş olabilir, fark edilsin.
      try {
        await sendEmail({
          to: me.email,
          subject: 'E-posta Adresiniz Değiştiriliyor - Mezathane.tr',
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e7eb;padding:32px;border-radius:12px">
            <h2 style="color:#d4af37;text-align:center">Güvenlik Bilgilendirmesi</h2>
            <p>Merhaba ${me.fullName ?? ''},</p>
            <p>Hesabınızın e-posta adresini <strong>${newEmail}</strong> olarak değiştirme talebi alındı. Yeni adrese gönderilen kod doğrulanınca değişiklik tamamlanacak.</p>
            <p style="color:#ef4444"><strong>Bu talebi siz yapmadıysanız</strong> derhal şifrenizi değiştirin ve bilgi@mezathane.tr ile iletişime geçin.</p>
          </div>`,
        });
      } catch { /* eski adrese gönderim başarısız olsa da akışı bozmasın */ }

      return NextResponse.json({ success: true, message: 'Doğrulama kodu yeni adresinize gönderildi' });
    }

    if (action === 'confirm') {
      const code = String(body?.code ?? '').trim();
      const me = await prisma.user.findUnique({
        where: { id: userId },
        select: { pendingEmail: true, pendingEmailCode: true, pendingEmailExpiry: true },
      });
      if (!me?.pendingEmail || !me.pendingEmailCode) {
        return NextResponse.json({ error: 'Bekleyen bir e-posta değişikliği yok' }, { status: 400 });
      }
      if (!me.pendingEmailExpiry || me.pendingEmailExpiry < new Date()) {
        return NextResponse.json({ error: 'Kodun süresi doldu, tekrar talep edin' }, { status: 400 });
      }
      if (code !== me.pendingEmailCode) {
        return NextResponse.json({ error: 'Kod hatalı' }, { status: 400 });
      }
      // Onay anında tekrar çakışma kontrolü (bu süre içinde başka biri almış olabilir).
      const taken = await prisma.user.findUnique({ where: { email: me.pendingEmail }, select: { id: true } });
      if (taken) return NextResponse.json({ error: 'Bu e-posta adresi bu sırada başka bir hesapta kayıt oldu' }, { status: 400 });

      await prisma.user.update({
        where: { id: userId },
        data: {
          email: me.pendingEmail,
          isEmailVerified: true,
          pendingEmail: null,
          pendingEmailCode: null,
          pendingEmailExpiry: null,
        },
      });
      return NextResponse.json({ success: true, email: me.pendingEmail });
    }

    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
  } catch (error: any) {
    console.error('change-email error:', error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
