export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { encrypt } from '@/lib/encryption';
import { prisma } from '@/lib/prisma';
import { validateTCKimlikNo } from '@/lib/tc-kimlik';
import { generateEmailVerifyCode, sendVerificationEmail } from '@/lib/email-verify';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const rl = checkRateLimit(`register:${ip}`, RATE_LIMITS.REGISTER);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla kayıt denemesi. Lütfen 15 dakika sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }
    const body = await request.json();
    const {
      email, password, fullName, phone,
      tcKimlikNo, isCompany, companyName, taxOffice, taxNumber,
      address, city, district, postalCode, kvkkConsent, referralCode,
    } = body ?? {};

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'E-posta, şifre ve ad soyad zorunludur' },
        { status: 400 }
      );
    }

    // Şifre güvenlik kontrolü
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'Şifre en az 8 karakter olmalıdır' },
        { status: 400 }
      );
    }

    if (!address) {
      return NextResponse.json(
        { error: 'Adres bilgisi zorunludur' },
        { status: 400 }
      );
    }

    // Telefon numarasını normalize et: başındaki 0 ve +90 kaldır
    let normalizedPhone: string | null = null;
    if (phone && String(phone).trim()) {
      normalizedPhone = String(phone).replace(/[\s\-\(\)]/g, '').replace(/^\+90/, '').replace(/^0/, '');
      if (normalizedPhone.replace(/\D/g, '').length < 10) {
        return NextResponse.json(
          { error: 'Geçerli bir telefon numarası giriniz (en az 10 hane)' },
          { status: 400 }
        );
      }
    }

    if (!isCompany && !tcKimlikNo) {
      return NextResponse.json(
        { error: 'TC Kimlik No zorunludur' },
        { status: 400 }
      );
    }

    if (!isCompany && tcKimlikNo && !validateTCKimlikNo(tcKimlikNo)) {
      return NextResponse.json(
        { error: 'Geçersiz TC Kimlik No. Lütfen doğru TC Kimlik numaranızı girin.' },
        { status: 400 }
      );
    }

    if (isCompany && (!taxOffice || !taxNumber)) {
      return NextResponse.json(
        { error: 'Şirket hesabı için Vergi Dairesi ve Vergi Numarası zorunludur' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Bu e-posta adresi zaten kayıtlı' },
        { status: 400 }
      );
    }

    if (normalizedPhone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
      if (existingPhone) {
        return NextResponse.json(
          { error: 'Bu telefon numarası zaten kayıtlı' },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Adres bilgisini oluştur
    const fullAddress = [address, district, city, postalCode].filter(Boolean).join(', ');

    // Otomatik üye numarası ata
    const maxMember = await prisma.user.aggregate({ _max: { memberNumber: true } });
    const nextMemberNumber = (maxMember._max.memberNumber || 1000) + 1;

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        phone: normalizedPhone,
        tcKimlikNo: tcKimlikNo ? encrypt(tcKimlikNo) : null,
        isCompany: isCompany ?? false,
        companyName: isCompany ? (companyName ?? null) : null,
        taxOffice: isCompany ? (taxOffice ?? null) : null,
        taxNumber: isCompany ? (taxNumber ?? null) : null,
        address: fullAddress || address,
        shippingAddress: fullAddress || address,
        billingAddress: fullAddress || address,
        city: city ?? null,
        district: district ?? null,
        postalCode: postalCode ?? null,
        memberNumber: nextMemberNumber,
        role: 'BUYER',
        isEmailVerified: false,
        isPhoneVerified: !!phone,
        hasAcceptedTerms: true,
        hasKvkkConsent: !!kvkkConsent,
        kvkkConsentDate: kvkkConsent ? new Date() : null,
      },
    });

    // Referans kodu işleme
    if (referralCode) {
      try {
        const referral = await prisma.referral.findFirst({
          where: { referralCode: referralCode, status: 'PENDING', referredUserId: null },
        });
        if (referral && referral.referrerUserId !== user.id) {
          await prisma.referral.update({
            where: { id: referral.id },
            data: { referredUserId: user.id, referredEmail: email, status: 'REGISTERED' },
          });
        }
      } catch (refErr) {
        console.error('Referral processing error:', refErr);
      }
    }

    // Doğrulama kodu oluştur ve e-posta gönder
    try {
      console.log(`[SIGNUP] Generating verification code for user: ${user.email} (${user.id})`);
      const code = await generateEmailVerifyCode(user.id);
      console.log(`[SIGNUP] Code generated, sending verification email to: ${user.email}`);
      await sendVerificationEmail(user.email, user.fullName, code);
      console.log(`[SIGNUP] Verification email process completed for: ${user.email}`);
    } catch (err) {
      console.error('[SIGNUP] Verification email error:', err);
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, fullName: user.fullName },
      needsVerification: true,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Kayıt sırasında bir hata oluştu' },
      { status: 500 }
    );
  }
}
