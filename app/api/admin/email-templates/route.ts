export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { DEFAULT_TEMPLATES, seedDefaultTemplates } from '@/lib/email-templates';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    // Varsayılan şablonları seed et (yoksa)
    await seedDefaultTemplates();

    const templates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error('Email templates GET error:', error);
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
    const { id, subject, bodyHtml, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Şablon ID gerekli' }, { status: 400 });
    }

    const updateData: any = {};
    if (subject !== undefined) updateData.subject = subject;
    if (bodyHtml !== undefined) updateData.bodyHtml = bodyHtml;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (error: any) {
    console.error('Email templates PATCH error:', error);
    return NextResponse.json({ error: 'Güncellenemedi' }, { status: 500 });
  }
}

// Varsayılana sıfırla
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const body = await request.json();
    const { key } = body;

    if (!key || !DEFAULT_TEMPLATES[key]) {
      return NextResponse.json({ error: 'Geçersiz şablon anahtarı' }, { status: 400 });
    }

    const def = DEFAULT_TEMPLATES[key];
    const updated = await prisma.emailTemplate.update({
      where: { key },
      data: { subject: def.subject, bodyHtml: def.bodyHtml, isActive: true },
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (error: any) {
    console.error('Email templates PUT error:', error);
    return NextResponse.json({ error: 'Sıfırlanamadı' }, { status: 500 });
  }
}
