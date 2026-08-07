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
        serviceFeeRate: true,
        salesTerms: true,
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

    // Satıcının kendi satış/iade/teslimat şartları (isteğe bağlı, DIRECT modelinde geçerli). Boş bırakılırsa
    // platform varsayılanı uygulanır. 8000 karakter sınırı.
    if (body.salesTerms !== undefined) {
      const t = typeof body.salesTerms === 'string' ? body.salesTerms.trim() : '';
      if (t.length > 8000) {
        return NextResponse.json({ error: 'Satış şartları en fazla 8000 karakter olabilir.' }, { status: 400 });
      }
      updateData.salesTerms = t || null;
    }

    // (2026-08-08) Hizmet bedeli oranı artık satıcı tarafından belirlenmiyor — sadece admin,
    // satıcı bazında belirler (SellerProfile.serviceFeeRate, admin/saticilar ekranından).
    // body.buyerPremiumRate artık kabul edilmiyor.

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
