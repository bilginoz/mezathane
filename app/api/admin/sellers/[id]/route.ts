export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { grantTrialRight, AUCTION_RIGHT_TRIAL_DAYS } from '@/lib/auction-rights';
import { createInAppNotification } from '@/lib/notifications';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.commissionRate !== undefined) updateData.commissionRate = body.commissionRate;
    if (body.companyName !== undefined) updateData.companyName = body.companyName;
    if (body.companyAddress !== undefined) updateData.companyAddress = body.companyAddress || null;
    if (body.taxOffice !== undefined) updateData.taxOffice = body.taxOffice || null;
    if (body.taxNumber !== undefined) updateData.taxNumber = body.taxNumber || null;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.isVerified !== undefined) updateData.isVerified = Boolean(body.isVerified);

    const seller = await prisma.sellerProfile.update({
      where: { id },
      data: updateData,
      include: { user: { select: { id: true, fullName: true } } },
    });

    // Satıcı ONAYLANDIYSA: ücretsiz "deneme" müzayede hakkı ver (kampanya açıksa, satıcı başına 1 kez).
    // Hata olursa onay işlemini bozma — sadece logla.
    if (body.status === 'APPROVED') {
      try {
        const res = await grantTrialRight(id);
        if (res.granted) {
          await createInAppNotification({
            userId: seller.user.id,
            title: '🎁 Ücretsiz Deneme Hakkınız Hazır',
            message: `Hoş geldiniz! Hesabınıza 1 ücretsiz müzayede açma hakkı tanımlandı (${AUCTION_RIGHT_TRIAL_DAYS} gün geçerli). İlk müzayedenizi ücretsiz oluşturabilirsiniz.`,
            type: 'AUCTION_RIGHT',
            link: '/satici/haklarim',
          });
        }
      } catch (grantErr) {
        console.error('[SellerApprove] Deneme hakkı verilemedi:', grantErr);
      }
    }

    await logAudit({
      userId: (session.user as any).id,
      userName: (session.user as any).fullName || (session.user as any).email,
      action: body.status === 'APPROVED' ? 'APPROVE' : body.status === 'REJECTED' ? 'REJECT' : 'UPDATE',
      entity: 'Seller',
      entityId: id,
      details: { companyName: seller.companyName, ...updateData },
    });

    return NextResponse.json({ seller });
  } catch (error: any) {
    console.error('Admin seller update error:', error);
    return NextResponse.json({ error: 'Güncelleme hatası' }, { status: 500 });
  }
}
