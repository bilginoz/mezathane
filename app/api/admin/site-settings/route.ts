export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    let settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.siteSettings.create({ data: { id: 'default' } });
    }
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Site settings GET error:', error);
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
    const allowedFields = [
      'logoUrl', 'logoCloudPath', 'faviconUrl',
      'heroImageUrl', 'heroCloudPath', 'heroTitle', 'heroSubtitle', 'heroDescription',
      'heroCta1Text', 'heroCta1Link', 'heroCta2Text', 'heroCta2Link',
      'contactEmail', 'contactPhone', 'contactAddress',
      'siteTitle', 'siteDescription',
      'announcementText', 'announcementLink', 'announcementActive',
      'footerDescription',
      'bankName', 'bankAccountHolder', 'bankIban',
    ];
    const updateData: any = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key];
      }
    }
    const settings = await prisma.siteSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...updateData },
      update: updateData,
    });
    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Site settings PATCH error:', error);
    return NextResponse.json({ error: 'Ayarlar güncellenemedi' }, { status: 500 });
  }
}
