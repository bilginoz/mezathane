export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { sendNotificationEmail, createInAppNotification } from '@/lib/notifications';
import { validateIBAN } from '@/lib/iban';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;

    const existing = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (existing) return NextResponse.json({ error: 'Zaten satıcı başvurunuz var' }, { status: 400 });

    const body = await request.json();

    // Validate required fields
    if (!body.companyName?.trim()) return NextResponse.json({ error: 'Firma Unvanı zorunludur' }, { status: 400 });
    if (!body.taxOffice?.trim()) return NextResponse.json({ error: 'Vergi Dairesi zorunludur' }, { status: 400 });
    if (!body.taxNumber?.trim()) return NextResponse.json({ error: 'Vergi Numarası zorunludur' }, { status: 400 });
    if (!body.iban?.trim()) return NextResponse.json({ error: 'Banka IBAN zorunludur' }, { status: 400 });
    const ibanResult = validateIBAN(body.iban);
    if (!ibanResult.valid) return NextResponse.json({ error: ibanResult.error }, { status: 400 });
    if (!body.contactEmail?.trim()) return NextResponse.json({ error: 'Firma E-posta zorunludur' }, { status: 400 });

    const seller = await prisma.sellerProfile.create({
      data: {
        userId,
        companyName: body.companyName,
        companyAddress: body.companyAddress ?? null,
        taxOffice: body.taxOffice,
        taxNumber: body.taxNumber,
        iban: ibanResult.valid ? ibanResult.normalized : (body.iban ?? null),
        taxDocumentUrl: body.taxDocumentUrl ?? null,
        taxDocumentPath: body.taxDocumentPath ?? null,
        mersisNo: body.mersisNo ?? null,
        contactEmail: body.contactEmail ?? null,
        description: body.description ?? null,
        status: 'PENDING',
      },
    });

    // Satıcı hesabı PENDING olarak oluşturuluyor, admin onayı gerekli
    // Role SELLER yapılıyor ama seller status PENDING olduğu sürece işlem yapamaz
    await prisma.user.update({ where: { id: userId }, data: { role: 'SELLER' } });

    // Notify admin — hem e-posta hem uygulama içi bildirim
    const adminUserId = 'cmqqfig5p0000ry08n4onlth4';
    try {
      console.log('[Seller Apply] Sending notification for:', body.companyName);
      const notifId = process.env.NOTIF_ID_YENI_SATC_BAVURUSU;
      if (!notifId) {
        console.error('[Seller Apply] NOTIF_ID_YENI_SATC_BAVURUSU env var is not set!');
      } else {
        const emailResult = await sendNotificationEmail({
          notificationId: notifId,
          recipientEmail: 'bilginoz@icloud.com',
          subject: `Yeni Satıcı Başvurusu - ${body.companyName}`,
          body: `<div style="font-family:Arial;max-width:600px;margin:0 auto;"><h2 style="color:#d4af37;">Yeni Satıcı Başvurusu</h2><p><strong>${body.companyName}</strong> satıcı olarak başvurdu.</p><p><strong>Başvuran:</strong> ${session.user?.email ?? 'Bilinmiyor'}</p>${body.contactEmail ? `<p><strong>Firma E-posta:</strong> ${body.contactEmail}</p>` : ''}<p>Admin panelinden (<a href="${process.env.NEXTAUTH_URL}/admin/saticilar">Satıcı Yönetimi</a>) onaylayabilirsiniz.</p></div>`,
        });
        console.log('[Seller Apply] Email result:', JSON.stringify(emailResult));
      }
    } catch (notifError: any) {
      console.error('[Seller Apply] Notification email failed:', notifError?.message ?? notifError);
    }

    // Uygulama içi bildirim — admin panelindeki zil ikonu
    try {
      await createInAppNotification({
        userId: adminUserId,
        title: 'Yeni Satıcı Başvurusu',
        message: `${body.companyName} satıcı olarak başvurdu. Başvuran: ${session.user?.email ?? 'Bilinmiyor'}`,
        type: 'SELLER_APPLICATION',
        link: '/admin/saticilar',
      });
      console.log('[Seller Apply] In-app notification created for admin');
    } catch (inAppError: any) {
      console.error('[Seller Apply] In-app notification failed:', inAppError?.message ?? inAppError);
    }

    return NextResponse.json({ success: true, seller });
  } catch (error: any) {
    console.error('Seller apply error:', error);
    return NextResponse.json({ error: 'Başvuru sırasında hata oluştu' }, { status: 500 });
  }
}
