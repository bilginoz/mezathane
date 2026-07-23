export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { generatePresignedUploadUrl } from '@/lib/s3';

// Güvenli içerik türleri — yalnızca bunlara yükleme izni var.
// html/svg/js gibi çalıştırılabilir türler bilerek DIŞARIDA: aksi halde herkese açık
// bucket'a (dosyalar.mezathane.tr) yüklenip o alan adında stored XSS / kimlik avı
// sayfası olarak servis edilebilirdi.
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });

    const { fileName, contentType, isPublic } = await request.json();

    if (typeof fileName !== 'string' || !fileName.trim()) {
      return NextResponse.json({ error: 'Geçersiz dosya adı' }, { status: 400 });
    }
    if (typeof contentType !== 'string' || !ALLOWED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: 'Bu dosya türü kabul edilmiyor. Yalnızca resim (JPEG/PNG/WebP/GIF), PDF ve Word belgeleri yüklenebilir.' },
        { status: 400 }
      );
    }

    // Dosya adını temizle — yol ayıracı ve tehlikeli karakterleri at (S3 anahtarını sadeleştirir)
    const safeName = fileName.replace(/[/\\]/g, '_').replace(/[^\w.\- ]/g, '').slice(0, 200) || 'dosya';

    const result = await generatePresignedUploadUrl(safeName, contentType, isPublic ?? true);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Presigned URL error:', error);
    return NextResponse.json({ error: 'URL oluşturulamadı' }, { status: 500 });
  }
}
