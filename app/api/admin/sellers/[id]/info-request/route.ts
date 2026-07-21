export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { sendNotificationEmail } from '@/lib/notifications';

// Admin "Eksik Bilgi / Düzeltme İste" gönderir
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    }

    const { note } = await req.json();
    if (!note || !note.trim()) {
      return NextResponse.json({ error: 'Not/açıklama zorunludur' }, { status: 400 });
    }

    const seller = await prisma.sellerProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, fullName: true } } },
    });
    if (!seller) return NextResponse.json({ error: 'Satıcı bulunamadı' }, { status: 404 });

    // Durumu INFO_REQUESTED olarak güncelle
    await prisma.sellerProfile.update({
      where: { id },
      data: {
        status: 'INFO_REQUESTED',
        adminNote: note.trim(),
        adminNoteDate: new Date(),
        sellerResponse: null,
        sellerResponseDate: null,
      },
    });

    // Satıcıya platform bildirimi gönder
    await prisma.notification.create({
      data: {
        userId: seller.user.id,
        title: 'Başvurunuz Hakkında Düzeltme İstendi',
        message: `Admin not: ${note.trim()}`,
        type: 'SYSTEM',
        link: '/satici',
      },
    });

    // Satıcıya e-posta gönder
    if (process.env.NOTIF_ID_SATC_EKSIK_BILGI_DZELTME_STEI) {
      try {
        await sendNotificationEmail({
          notificationId: process.env.NOTIF_ID_SATC_EKSIK_BILGI_DZELTME_STEI,
          recipientEmail: seller.user.email,
          subject: 'Satıcı Başvurunuz Hakkında Düzeltme İstendi',
          body: `<p>Merhaba <strong>${seller.user.fullName}</strong>,</p><p>Satıcı başvurunuz incelendi ve aşağıdaki düzeltme/ek bilgi istenmektedir:</p><blockquote style="border-left: 3px solid #d4af37; padding-left: 12px; color: #666;">${note.trim()}</blockquote><p>Lütfen satıcı panelinize giriş yaparak gerekli belgeleri yükleyin veya bilgileri güncelleyin.</p><p><a href="${process.env.NEXTAUTH_URL}/satici">Satıcı Paneline Git</a></p>`,
        });
      } catch (emailErr) {
        console.error('Seller info request email error:', emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin info-request POST error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
