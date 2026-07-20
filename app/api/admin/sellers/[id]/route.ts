export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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
      where: { id: params.id },
      data: updateData,
      include: { user: { select: { fullName: true } } },
    });

    await logAudit({
      userId: (session.user as any).id,
      userName: (session.user as any).fullName || (session.user as any).email,
      action: body.status === 'APPROVED' ? 'APPROVE' : body.status === 'REJECTED' ? 'REJECT' : 'UPDATE',
      entity: 'Seller',
      entityId: params.id,
      details: { companyName: seller.companyName, ...updateData },
    });

    return NextResponse.json({ seller });
  } catch (error: any) {
    console.error('Admin seller update error:', error);
    return NextResponse.json({ error: 'Güncelleme hatası' }, { status: 500 });
  }
}
