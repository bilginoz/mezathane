export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;

    const disputes = await prisma.dispute.findMany({
      where,
      include: {
        lot: { select: { id: true, title: true, lotNumber: true } },
        reporter: { select: { id: true, fullName: true, email: true } },
        against: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(disputes);
  } catch (error) {
    console.error('Admin disputes GET error:', error);
    return NextResponse.json({ error: 'Yüklenemedi' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const body = await request.json();
    const { disputeId, status, adminNote, resolution } = body;

    if (!disputeId) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 });

    const updateData: any = {};
    if (status) updateData.status = status;
    if (adminNote !== undefined) updateData.adminNote = adminNote;
    if (resolution !== undefined) updateData.resolution = resolution;
    if (status === 'RESOLVED' || status === 'REJECTED') {
      updateData.resolvedAt = new Date();
    }

    const dispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: updateData,
    });

    return NextResponse.json(dispute);
  } catch (error) {
    console.error('Admin disputes PATCH error:', error);
    return NextResponse.json({ error: 'Güncellenemedi' }, { status: 500 });
  }
}
