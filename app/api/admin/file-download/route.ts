export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { getFileUrl } from '@/lib/s3';

/**
 * Admin-only endpoint: private dosyalar için geçici presigned URL üretir.
 * POST { cloud_storage_path, contentType? }
 * Döner { url } — 1 saatlik geçici erişim URL'si
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    }
    // Sadece ADMIN erişebilsin
    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const { cloud_storage_path, contentType } = await request.json();
    if (!cloud_storage_path) {
      return NextResponse.json({ error: 'cloud_storage_path gerekli' }, { status: 400 });
    }

    // Private dosya — presigned URL üret (1 saat geçerli)
    const url = await getFileUrl(
      cloud_storage_path,
      contentType || 'application/pdf',
      false // isPublic = false → presigned URL üretir
    );

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('Admin file download error:', error);
    return NextResponse.json({ error: 'Dosya URL\'si oluşturulamadı' }, { status: 500 });
  }
}
