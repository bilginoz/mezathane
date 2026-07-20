export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { encrypt } from '@/lib/encryption';
import { prisma } from '@/lib/prisma';
import { validateTCKimlikNo } from '@/lib/tc-kimlik';
import { generateEmailVerifyCode, sendVerificationEmail } from '@/lib/email-verify';
import { sendNotificationEmail, createInAppNotification } from '@/lib/notifications';
import { validateIBAN } from '@/lib/iban';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * Anonim ziyaretçi için tek adımda satıcı kaydı:
 * 1. User oluştur (role: SELLER)
 * 2. SellerProfile oluştur (status: PENDING)
 * Her ikisi tek bir transaction'da — biri başarısız olursa tamamı geri alınır.
 */
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
      // Hesap alanları
      email, password, fullName, phone, tcKimlikNo,
      address, city, district, postalCode,
      // Şirket alanları
      companyName, companyAddress, taxOffice, taxNumber,
      iban, mersisNo, contactEmail, description,
      taxDocumentUrl, taxDocumentPath,
    } = body ?? {};

    // === Hesap alanları doğrulama ===
    if (!email || !password || !fullName) {
      return NextResponse.json({ error: 'E-posta, şifre ve ad soyad zorunludur' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'Şifre en az 8 karakter olmalıdır' }, { status: 400 });
    }
    if (!address) {
      return NextResponse.json({ error: 'Adres bilgisi zorunludur' }, { status: 400 });
    }

    // Telefon normalize
    let normalizedPhone: string | null = null;
    if (phone && String(phone).trim()) {
      normalizedPhone = String(phone).replace(/[\s\-\(\)]/g, '').replace(/^\+90/, '').replace(/^0/, '');
      if (normalizedPhone.replace(/\D/g, '').length < 10) {
        return NextResponse.json({ error: 'Geçerli bir telefon numarası giriniz (en az 10 hane)' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Telefon numarası zorunludur' }, { status: 400 });
    }

    // TC Kimlik doğrulama
    if (!tcKimlikNo) {
      return NextResponse.json({ error: 'TC Kimlik No zorunludur' }, { status: 400 });
    }
    if (!validateTCKimlikNo(tcKimlikNo)) {
      return NextResponse.json({ error: 'Geçersiz TC Kimlik No. Lütfen doğru TC Kimlik numaranızı girin.' }, { status: 400 });
    }

    // === Şirket alanları doğrulama ===
    if (!companyName?.trim()) {
      return NextResponse.json({ error: 'Firma Unvanı zorunludur' }, { status: 400 });
    }
    if (!taxOffice?.trim()) {
      return NextResponse.json({ error: 'Vergi Dairesi zorunludur' }, { status: 400 });
    }
    if (!taxNumber?.trim()) {
      return NextResponse.json({ error: 'Vergi Numarası zorunludur' }, { status: 400 });
    }
    if (!iban?.trim()) {
      return NextResponse.json({ error: 'Banka IBAN zorunludur' }, { status: 400 });
    }
    const ibanResult = validateIBAN(iban);
    if (!ibanResult.valid) {
      return NextResponse.json({ error: ibanResult.error }, { status: 400 });
    }
    if (!contactEmail?.trim()) {
      return NextResponse.json({ error: 'Firma E-posta adresi zorunludur' }, { status: 400 });
    }

    // === Duplicate kontrolleri ===
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: 'Bu e-posta adresi zaten kayıtlı' }, { status: 400 });
    }

    if (normalizedPhone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
      if (existingPhone) {
        return NextResponse.json({ error: 'Bu telefon numarası zaten kayıtlı' }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const fullAddress = [address, district, city, postalCode].filter(Boolean).join(', ');

    // Otomatik üye numarası
    const maxMember = await prisma.user.aggregate({ _max: { memberNumber: true } });
    const nextMemberNumber = (maxMember._max.memberNumber || 1000) + 1;

    // === Transaction: User + SellerProfile ===
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName,
          phone: normalizedPhone,
          tcKimlikNo: tcKimlikNo ? encrypt(tcKimlikNo) : null,
          isCompany: true, // Satıcılar her zaman şirket
          companyName: companyName ?? null,
          taxOffice: taxOffice ?? null,
          taxNumber: taxNumber ?? null,
          address: fullAddress || address,
          shippingAddress: fullAddress || address,
          billingAddress: fullAddress || address,
          city: city ?? null,
          district: district ?? null,
          postalCode: postalCode ?? null,
          memberNumber: nextMemberNumber,
          role: 'SELLER',
          isEmailVerified: false,
          isPhoneVerified: !!phone,
          hasAcceptedTerms: true,
          hasKvkkConsent: true,
          kvkkConsentDate: new Date(),
        },
      });

      const seller = await tx.sellerProfile.create({
        data: {
          userId: user.id,
          companyName: companyName.trim(),
          companyAddress: companyAddress ?? null,
          taxOffice: taxOffice.trim(),
          taxNumber: taxNumber.trim(),
          iban: ibanResult.valid ? ibanResult.normalized : (iban?.trim() ?? null),
          taxDocumentUrl: taxDocumentUrl ?? null,
          taxDocumentPath: taxDocumentPath ?? null,
          mersisNo: mersisNo ?? null,
          contactEmail: contactEmail?.trim() ?? null,
          description: description ?? null,
          status: 'PENDING',
        },
      });

      return { user, seller };
    });

    // === Transaction dışı (başarısız olursa kayıt yine geçerli) ===

    // E-posta doğrulama kodu gönder
    try {
      const code = await generateEmailVerifyCode(result.user.id);
      await sendVerificationEmail(result.user.email, result.user.fullName, code);
      console.log(`[SellerRegister] Verification email sent to: ${result.user.email}`);
    } catch (err) {
      console.error('[SellerRegister] Verification email error:', err);
    }

    // Admin bildirimi — e-posta
    const adminUserId = 'cmqqfig5p0000ry08n4onlth4';
    try {
      const notifId = process.env.NOTIF_ID_YENI_SATC_BAVURUSU;
      if (notifId) {
        await sendNotificationEmail({
          notificationId: notifId,
          recipientEmail: 'bilginoz@icloud.com',
          subject: `Yeni Satıcı Başvurusu - ${companyName}`,
          body: `<div style="font-family:Arial;max-width:600px;margin:0 auto;"><h2 style="color:#d4af37;">Yeni Satıcı Başvurusu</h2><p><strong>${companyName}</strong> satıcı olarak başvurdu.</p><p><strong>Başvuran:</strong> ${email}</p>${contactEmail ? `<p><strong>Firma E-posta:</strong> ${contactEmail}</p>` : ''}<p>Admin panelinden (<a href="${process.env.NEXTAUTH_URL}/admin/saticilar">Satıcı Yönetimi</a>) onaylayabilirsiniz.</p></div>`,
        });
      }
    } catch (notifError: any) {
      console.error('[SellerRegister] Notification email failed:', notifError?.message ?? notifError);
    }

    // Admin bildirimi — uygulama içi
    try {
      await createInAppNotification({
        userId: adminUserId,
        title: 'Yeni Satıcı Başvurusu',
        message: `${companyName} satıcı olarak başvurdu. Başvuran: ${email}`,
        type: 'SELLER_APPLICATION',
        link: '/admin/saticilar',
      });
    } catch (inAppError: any) {
      console.error('[SellerRegister] In-app notification failed:', inAppError?.message ?? inAppError);
    }

    return NextResponse.json({
      success: true,
      user: { id: result.user.id, email: result.user.email, fullName: result.user.fullName },
      seller: { id: result.seller.id, status: result.seller.status },
    });
  } catch (error: any) {
    console.error('Seller register error:', error);
    // Prisma unique constraint hatası
    if (error?.code === 'P2002') {
      const field = error?.meta?.target?.[0];
      if (field === 'email') return NextResponse.json({ error: 'Bu e-posta adresi zaten kayıtlı' }, { status: 400 });
      if (field === 'phone') return NextResponse.json({ error: 'Bu telefon numarası zaten kayıtlı' }, { status: 400 });
      return NextResponse.json({ error: 'Bu bilgiler zaten kayıtlı' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Kayıt sırasında bir hata oluştu' }, { status: 500 });
  }
}
