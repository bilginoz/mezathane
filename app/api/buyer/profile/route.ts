export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, fullName: true, email: true, phone: true,
        tcKimlikNo: true, isCompany: true, companyName: true,
        taxOffice: true, taxNumber: true,
        address: true, shippingAddress: true, billingAddress: true,
        city: true, district: true, postalCode: true,
      },
    });

    if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    return NextResponse.json({ ...user, tcKimlikNo: user.tcKimlikNo ? decrypt(user.tcKimlikNo) : null });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Profil yüklenemedi' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;

    const body = await request.json();
    // Kayıt sırasında girilen alanlar kilitlidir — sadece boş alanlar ilk kez doldurulabilir
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });

    const updateData: any = {};

    // Kilitli alanlar: sadece henüz boşsa ilk kez yazılabilir, aksi halde Değişiklik Talebi gerekir
    const lockedFields = ['fullName', 'phone', 'tcKimlikNo', 'address', 'shippingAddress', 'billingAddress', 'city', 'district', 'postalCode', 'companyName', 'taxOffice', 'taxNumber'];
    for (const field of lockedFields) {
      if (body[field] === undefined) continue;
      const currentVal = (existingUser as any)[field];
      if (!currentVal || currentVal === '') {
        // Alan boşsa ilk kez yazılabilir
        if (field === 'tcKimlikNo') {
          updateData.tcKimlikNo = body.tcKimlikNo ? encrypt(body.tcKimlikNo) : null;
        } else {
          updateData[field] = body[field];
        }
      }
      // Dolu alan gönderilmişse ve değeri aynıysa sorun yok, farklıysa sessizce atla (kilitle)
    }

    // isCompany toggle'a izin ver (bu bir kilit alanı değil, tip bilgisi)
    if (body.isCompany !== undefined) updateData.isCompany = body.isCompany;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, fullName: true, email: true, phone: true,
        tcKimlikNo: true, isCompany: true, companyName: true,
        taxOffice: true, taxNumber: true,
        address: true, shippingAddress: true, billingAddress: true,
        city: true, district: true, postalCode: true,
      },
    });

    return NextResponse.json({ success: true, user: { ...user, tcKimlikNo: user.tcKimlikNo ? decrypt(user.tcKimlikNo) : null } });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'Profil güncellenemedi' }, { status: 500 });
  }
}
