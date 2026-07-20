export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { generateEmailVerifyCode, sendVerificationEmail } from '@/lib/email-verify';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const body = await request.json();
    const { action, type, code } = body;

    if (action === 'send') {
      if (type === 'email') {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });

        if (user.isEmailVerified) {
          return NextResponse.json({ success: true, message: 'E-posta zaten doğrulanmış' });
        }

        // Rate limiting: 60 saniyede bir kod gönderilebilir
        if (user.emailVerifyExpiry && user.emailVerifyCode) {
          const codeCreatedAt = new Date(user.emailVerifyExpiry.getTime() - 15 * 60 * 1000);
          const secondsSinceLastCode = (Date.now() - codeCreatedAt.getTime()) / 1000;
          if (secondsSinceLastCode < 60) {
            const waitSeconds = Math.ceil(60 - secondsSinceLastCode);
            return NextResponse.json(
              { error: `Lütfen ${waitSeconds} saniye bekleyin` },
              { status: 429 }
            );
          }
        }

        console.log(`[VERIFY-RESEND] Generating new code for: ${user.email} (${userId})`);
        const newCode = await generateEmailVerifyCode(userId);
        console.log(`[VERIFY-RESEND] Sending verification email to: ${user.email}`);
        await sendVerificationEmail(user.email, user.fullName, newCode);
        console.log(`[VERIFY-RESEND] Verification email sent to: ${user.email}`);

        return NextResponse.json({
          success: true,
          message: 'Doğrulama kodu e-posta adresinize gönderildi',
        });
      }

      // Telefon doğrulaması (simülasyon)
      return NextResponse.json({
        success: true,
        message: 'Doğrulama kodu telefonunuza gönderildi',
      });
    }

    if (action === 'verify') {
      if (type === 'email') {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });

        if (user.isEmailVerified) {
          return NextResponse.json({ success: true, message: 'E-posta zaten doğrulanmış' });
        }

        if (!user.emailVerifyCode || !user.emailVerifyExpiry) {
          return NextResponse.json({ error: 'Doğrulama kodu bulunamadı. Yeni kod gönderin.' }, { status: 400 });
        }

        if (new Date() > user.emailVerifyExpiry) {
          return NextResponse.json({ error: 'Doğrulama kodunun süresi dolmuş. Yeni kod gönderin.' }, { status: 400 });
        }

        if (user.emailVerifyCode !== code) {
          return NextResponse.json({ error: 'Geçersiz doğrulama kodu' }, { status: 400 });
        }

        await prisma.user.update({
          where: { id: userId },
          data: {
            isEmailVerified: true,
            emailVerified: new Date(),
            emailVerifyCode: null,
            emailVerifyExpiry: null,
          },
        });

        return NextResponse.json({ success: true, message: 'E-posta doğrulaması başarılı!' });
      }

      return NextResponse.json({ error: 'Geçersiz doğrulama türü' }, { status: 400 });
    }

    if (action === 'accept-terms') {
      await prisma.user.update({
        where: { id: userId },
        data: { hasAcceptedTerms: true },
      });
      return NextResponse.json({ success: true, message: 'Sözleşmeler onaylandı' });
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Doğrulama hatası' }, { status: 500 });
  }
}
