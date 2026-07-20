export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true, phone: true },
    });

    const seller = await prisma.sellerProfile.findFirst({
      where: { userId },
      select: {
        id: true,
        companyName: true,
        companyAddress: true,
        taxOffice: true,
        taxNumber: true,
        description: true,
        logoUrl: true,
        iban: true,
        mersisNo: true,
        status: true,
      },
    });

    if (!seller) return NextResponse.json({ error: 'Satıcı profili bulunamadı' }, { status: 404 });

    return NextResponse.json({ ...seller, email: user?.email, fullName: user?.fullName, phone: user?.phone });
  } catch (error: any) {
    console.error('Seller profile GET error:', error);
    return NextResponse.json({ error: 'Profil yüklenemedi' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });

    const userId = (session.user as any).id;
    const seller = await prisma.sellerProfile.findFirst({ where: { userId } });
    if (!seller) return NextResponse.json({ error: 'Satıcı profili bulunamadı' }, { status: 404 });

    const body = await request.json();
    const updateData: any = {};

    // Tüm kayıt alanları kilitli — sadece description ve logoUrl değiştirilebilir
    if (body.description !== undefined) updateData.description = body.description;
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;

    // phone ve companyAddress artık kilitli — Değişiklik Talebi gerekir

    const updated = await prisma.sellerProfile.update({
      where: { id: seller.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Seller profile PATCH error:', error);
    return NextResponse.json({ error: 'Güncelleme başarısız' }, { status: 500 });
  }
}
