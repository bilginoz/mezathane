export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Kullanıcı bildirimi kapatınca / tarayıcı aboneliği iptal edince endpoint'i siler.
// Endpoint'e sahip olmak zaten cihaza özeldir; oturum şartı aranmaz (zararsız temizlik).
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const endpoint: string | undefined = body?.endpoint ?? body?.subscription?.endpoint;
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true }); // temizlik hatası kullanıcıyı etkilemesin
  }
}
