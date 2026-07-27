export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

async function getOrCreate() {
  let s = await prisma.platformSettings.findFirst();
  if (!s) s = await prisma.platformSettings.create({ data: {} });
  return s;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    return NextResponse.json({ settings: await getOrCreate() });
  } catch (error: any) {
    console.error('Platform settings GET error:', error);
    return NextResponse.json({ error: 'Ayarlar yüklenemedi' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const body = await request.json();

    // Sadece ödeme/limit kuralları düzenlenebilir. Komisyon/prim gibi alanlar bilinçli
    // olarak dışarıda (buyer premium %7 kodun birçok yerinde sabit; buradan değiştirmek
    // yanıltıcı olurdu).
    const floatFields = ['newUserOutstandingLimit', 'trustedUserOutstandingLimit'];
    const intFields = ['newUserMaxUnpaidCount', 'trustedUserMaxUnpaidCount', 'autoSuspendAfterDefaults'];

    const updateData: any = {};
    for (const key of floatFields) {
      if (body[key] !== undefined) {
        const n = Number(body[key]);
        if (!Number.isFinite(n) || n < 0) {
          return NextResponse.json({ error: `${key} için geçerli bir tutar girin (0 veya üzeri).` }, { status: 400 });
        }
        updateData[key] = n;
      }
    }
    for (const key of intFields) {
      if (body[key] !== undefined) {
        const n = Number(body[key]);
        if (!Number.isInteger(n) || n < 1) {
          return NextResponse.json({ error: `${key} için 1 veya üzeri bir tam sayı girin.` }, { status: 400 });
        }
        updateData[key] = n;
      }
    }

    const current = await getOrCreate();
    const settings = await prisma.platformSettings.update({
      where: { id: current.id },
      data: updateData,
    });
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Platform settings PATCH error:', error);
    return NextResponse.json({ error: 'Ayarlar güncellenemedi' }, { status: 500 });
  }
}
