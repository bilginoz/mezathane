export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const rl = checkRateLimit(`contact:${ip}`, RATE_LIMITS.CONTACT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla mesaj gönderildi. Lütfen 15 dakika sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      );
    }
    const body = await request.json();
    const { name, email, subject, message } = body ?? {};
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Zorunlu alanları doldurun' }, { status: 400 });
    }
    await prisma.contactMessage.create({
      data: { name, email, subject: subject ?? null, message },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Contact error:', error);
    return NextResponse.json({ error: 'Hata oluştu' }, { status: 500 });
  }
}
