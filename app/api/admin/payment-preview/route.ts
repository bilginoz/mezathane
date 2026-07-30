export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

// ADMIN ÖNİZLEME: Canlı ödeme modu flag'ini DEĞİŞTİRMEDEN, yalnızca bu admin'in tarayıcısına
// DIRECT (veya ESCROW) gösterilmesini sağlayan `pm_preview` çerezini açar/kapatır.
// Test bitince 'OFF' ile kapatılır. Gerçek para akışları (check-live) bu çerezden etkilenmez.

export async function GET() {
  // Mevcut önizleme durumunu döner (buton etiketini doğru göstermek için).
  const { cookies } = await import('next/headers');
  const jar = await cookies();
  const v = jar.get('pm_preview')?.value ?? null;
  return NextResponse.json({ preview: v });
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const mode = body?.mode;

    const { cookies } = await import('next/headers');
    const jar = await cookies();

    if (mode === 'DIRECT' || mode === 'ESCROW') {
      jar.set('pm_preview', mode, {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: 60 * 60 * 6, // 6 saat sonra kendiliğinden kapanır (unutulmaya karşı güvenlik)
      });
      return NextResponse.json({ preview: mode });
    }

    // OFF / diğer → önizlemeyi kapat
    jar.delete('pm_preview');
    return NextResponse.json({ preview: null });
  } catch (error: any) {
    console.error('Payment preview error:', error);
    return NextResponse.json({ error: 'Önizleme ayarlanamadı' }, { status: 500 });
  }
}
