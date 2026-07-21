export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/mailer';

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const rl = checkRateLimit(`forgot:${ip}`, RATE_LIMITS.FORGOT_PASSWORD);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla istek. Lütfen 15 dakika sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'E-posta adresi gereklidir' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Güvenlik: Kullanıcı bulunamasa bile aynı mesajı göster
    if (!user) {
      return NextResponse.json({ success: true, message: 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.' });
    }

    // Token oluştur (32 byte hex)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 saat geçerli

    // Token'ı kaydet
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    // Şifre sıfırlama URL'i
    const baseUrl = process.env.NEXTAUTH_URL || 'https://mezathane.tr';
    const resetUrl = `${baseUrl}/sifre-sifirla?token=${resetToken}`;

    // E-posta gönder
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #d4af37; font-size: 28px; margin: 0;">Mezathane</h1>
          <p style="color: #888; font-size: 12px; margin: 5px 0 0 0;">.tr</p>
        </div>
        <h2 style="color: #d4af37; text-align: center; font-size: 20px;">Şifre Sıfırlama</h2>
        <p style="color: #ccc; text-align: center; line-height: 1.6;">Merhaba <strong>${user.fullName}</strong>,</p>
        <p style="color: #ccc; text-align: center; line-height: 1.6;">Hesabınız için şifre sıfırlama talebinde bulundunuz. Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #d4af37; color: #000; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Şifremi Sıfırla</a>
        </div>
        <p style="color: #888; text-align: center; font-size: 13px;">Bu bağlantı <strong>1 saat</strong> süreyle geçerlidir.</p>
        <p style="color: #888; text-align: center; font-size: 13px;">Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
        <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;" />
        <p style="color: #666; text-align: center; font-size: 11px;">Mezathane.tr - Türkiye'nin Premium Müzayede Platformu</p>
      </div>
    `;

    const result = await sendEmail({
      to: user.email,
      subject: 'Şifre Sıfırlama - Mezathane.tr',
      html: htmlBody,
    });

    if (!result.success) {
      console.error('Password reset email send failed:', result.error);
    } else {
      console.log('Password reset email sent successfully to:', user.email);
    }

    return NextResponse.json({ success: true, message: 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.' });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 });
  }
}
