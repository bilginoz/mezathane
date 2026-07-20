export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

/**
 * Satıcı profili vergi levhası URL/path güncellemesi.
 * Sadece oturum açmış kullanıcıların kendi profilini güncellemesi için.
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    }

    const { taxDocumentUrl, taxDocumentPath } = await request.json();
    if (!taxDocumentUrl || !taxDocumentPath) {
      return NextResponse.json({ error: 'Belge bilgileri eksik' }, { status: 400 });
    }

    const seller = await prisma.sellerProfile.findFirst({
      where: { userId: session.user.id },
    });
    if (!seller) {
      return NextResponse.json({ error: 'Satıcı profili bulunamadı' }, { status: 404 });
    }

    const updated = await prisma.sellerProfile.update({
      where: { id: seller.id },
      data: { taxDocumentUrl, taxDocumentPath },
    });

    return NextResponse.json({ success: true, id: updated.id });
  } catch (error: any) {
    console.error('Seller update-document error:', error);
    return NextResponse.json({ error: 'Belge güncellenemedi' }, { status: 500 });
  }
}
