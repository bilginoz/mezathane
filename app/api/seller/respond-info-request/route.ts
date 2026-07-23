export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { sendNotificationEmail } from '@/lib/notifications';

// Satıcı admin'in eksik bilgi notuna yanıt verir
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    const seller = await prisma.sellerProfile.findFirst({
      where: { userId: session.user.id },
      include: { user: { select: { fullName: true, email: true } } },
    });
    if (!seller) return NextResponse.json({ error: 'Satıcı profili bulunamadı' }, { status: 404 });
    if (seller.status !== 'INFO_REQUESTED') {
      return NextResponse.json({ error: 'Yanıt verilecek bir istek bulunamadı' }, { status: 400 });
    }

    const { response } = await req.json();

    // Yanıtı kaydet ve durumu PENDING'e çevir (admin tekrar inceleyecek)
    await prisma.sellerProfile.update({
      where: { id: seller.id },
      data: {
        sellerResponse: response?.trim() || 'Belgeler güncellendi.',
        sellerResponseDate: new Date(),
        status: 'PENDING',
      },
    });

    // Admin'e platform bildirimi
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'Satıcı Düzeltme Yanıtı',
          message: `${seller.companyName} (${seller.user.fullName}) düzeltme isteğinize yanıt verdi.`,
          type: 'SYSTEM',
          link: '/admin/saticilar',
        },
      });
    }

    // Admin'e e-posta
    for (const admin of admins) {
      try {
        await sendNotificationEmail({
          recipientEmail: admin.email,
          subject: `Satıcı Düzeltme Yanıtı: ${seller.companyName}`,
          body: `<p><strong>${seller.companyName}</strong> (${seller.user.fullName}) düzeltme isteğinize yanıt verdi.</p><p>Yanıt: ${response?.trim() || 'Belgeler güncellendi.'}</p><p><a href="${process.env.NEXTAUTH_URL}/admin/saticilar">Satıcıyı İncele</a></p>`,
        });
      } catch (emailErr) {
        console.error('Admin response email error:', emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Seller respond-info-request error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
