import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mailer';

/**
 * 6 haneli doğrulama kodu üret ve DB'ye kaydet
 */
export async function generateEmailVerifyCode(userId: string): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika geçerli

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerifyCode: code,
      emailVerifyExpiry: expiry,
    },
  });

  return code;
}

/**
 * Doğrulama kodu gönder (e-posta ile)
 */
export async function sendVerificationEmail(email: string, fullName: string, code: string) {
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fff; padding: 40px; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #d4af37; font-size: 28px; margin: 0;">Mezathane</h1>
        <p style="color: #888; font-size: 12px; margin: 5px 0 0 0;">.tr</p>
      </div>
      <h2 style="color: #d4af37; text-align: center; font-size: 20px;">E-posta Doğrulama</h2>
      <p style="color: #ccc; text-align: center; line-height: 1.6;">Merhaba <strong>${fullName}</strong>,</p>
      <p style="color: #ccc; text-align: center; line-height: 1.6;">Hesabınızı doğrulamak için aşağıdaki kodu kullanın:</p>
      <div style="text-align: center; margin: 30px 0;">
        <div style="background: #1a1a1a; border: 2px solid #d4af37; border-radius: 12px; padding: 20px 40px; display: inline-block;">
          <span style="font-size: 36px; font-weight: bold; color: #d4af37; letter-spacing: 8px; font-family: monospace;">${code}</span>
        </div>
      </div>
      <p style="color: #888; text-align: center; font-size: 13px;">Bu kod <strong>15 dakika</strong> süreyle geçerlidir.</p>
      <p style="color: #888; text-align: center; font-size: 13px;">Eğer bu kaydı siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
      <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;" />
      <p style="color: #666; text-align: center; font-size: 11px;">Mezathane.tr - Türkiye'nin Premium Müzayede Platformu</p>
    </div>
  `;

  const result = await sendEmail({
    to: email,
    subject: 'E-posta Doğrulama Kodu - Mezathane.tr',
    html: htmlBody,
  });
  if (!result.success) {
    console.error(`[EMAIL-VERIFY] Send error for ${email}:`, result.error);
  } else {
    console.log(`[EMAIL-VERIFY] Email sent successfully to ${email}. messageId: ${result.messageId}`);
  }
}
