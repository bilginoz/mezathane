export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/*
  Dış uptime izleme (UptimeRobot) için sağlık kontrolü.
  Sadece sayfanın açılıp açılmadığına değil, veritabanına gerçekten
  ulaşılıp ulaşılamadığına bakar — "site ayakta ama DB düşmüş" durumu
  ana sayfayı izlemekle yakalanamıyor.

  Bilerek hiçbir veri/sayı döndürmüyor (herkese açık bir adres).
*/
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
