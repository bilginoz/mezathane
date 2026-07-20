import { prisma } from '@/lib/prisma';

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

  const senderEmail = 'bilgi@mezathane.tr';

  try {
    console.log(`[EMAIL-VERIFY] Sending verification email to: ${email}, notification_id: ${process.env.NOTIF_ID_EPOSTA_DORULAMA}, app_id: ${process.env.WEB_APP_ID}`);
    const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: process.env.NOTIF_ID_EPOSTA_DORULAMA,
        subject: 'E-posta Doğrulama Kodu - Mezathane.tr',
        body: htmlBody,
        is_html: true,
        recipient_email: email,
        sender_email: senderEmail,
        sender_alias: 'Mezathane.tr',
      }),
    });
    const responseText = await response.text();
    if (!response.ok) {
      console.error(`[EMAIL-VERIFY] API error (${response.status}): ${responseText}`);
    } else {
      console.log(`[EMAIL-VERIFY] Email sent successfully to ${email}. Response: ${responseText}`);
    }
  } catch (error) {
    console.error('[EMAIL-VERIFY] Network/send error:', error);
  }
}
