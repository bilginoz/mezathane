import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { sendNotificationEmail } from '@/lib/notifications';
import { validateIBAN } from '@/lib/iban';

export const dynamic = 'force-dynamic';

// Kullanıcı kendi taleplerini görür
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    const requests = await prisma.fieldChangeRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('FieldChangeRequest GET error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// Kullanıcı yeni talep oluşturur
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    const body = await req.json();
    const { fieldName, modelName, currentValue, requestedValue, reason } = body;

    if (!fieldName || !modelName || !requestedValue) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 });
    }

    // IBAN alanı için format + checksum doğrulaması
    if (fieldName === 'iban') {
      const ibanResult = validateIBAN(requestedValue);
      if (!ibanResult.valid) {
        return NextResponse.json({ error: ibanResult.error }, { status: 400 });
      }
    }

    // Aynı alan için bekleyen talep var mı kontrol et
    const existingPending = await prisma.fieldChangeRequest.findFirst({
      where: { userId: session.user.id, fieldName, status: 'PENDING' },
    });

    if (existingPending) {
      return NextResponse.json({ error: 'Bu alan için zaten bekleyen bir talebiniz var' }, { status: 409 });
    }

    const request = await prisma.fieldChangeRequest.create({
      data: {
        userId: session.user.id,
        fieldName,
        modelName,
        currentValue: currentValue || null,
        requestedValue,
        reason: reason || null,
      },
    });

    // Admin'e bildirim gönder
    try {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
      const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { fullName: true, email: true } });
      const fieldLabels: Record<string, string> = {
        companyName: 'Firma Unvanı',
        taxOffice: 'Vergi Dairesi',
        taxNumber: 'Vergi No',
        mersisNo: 'Mersis No',
        iban: 'IBAN',
        taxDocumentUrl: 'Vergi Levhası',
        tcKimlikNo: 'TC Kimlik No',
        fullName: 'Ad Soyad',
        phone: 'Telefon',
        address: 'Adres',
        shippingAddress: 'Gönderim Adresi',
        billingAddress: 'Fatura Adresi',
        city: 'İl',
        district: 'İlçe',
        postalCode: 'Posta Kodu',
        companyAddress: 'Firma Adresi',
      };
      const label = fieldLabels[fieldName] || fieldName;

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'Bilgi Değişiklik Talebi',
            message: `${user?.fullName || user?.email} kullanıcısı "${label}" alanı için değişiklik talep etti.`,
            type: 'SYSTEM',
            link: '/admin/degisiklik-talepleri',
          },
        });
      }

      // Admin'e e-posta bildirimi gönder
      if (process.env.NOTIF_ID_BILGI_DEIIKLIK_TALEBI) {
        for (const admin of admins) {
          try {
            await sendNotificationEmail({
              notificationId: process.env.NOTIF_ID_BILGI_DEIIKLIK_TALEBI,
              recipientEmail: admin.email,
              subject: `Bilgi Değişiklik Talebi: ${label}`,
              body: `<p><strong>${user?.fullName || user?.email}</strong> kullanıcısı <strong>"${label}"</strong> alanı için değişiklik talep etti.</p><p>Yeni değer: <strong>${requestedValue}</strong></p><p><a href="${process.env.NEXTAUTH_URL}/admin/degisiklik-talepleri">Talebi İncele</a></p>`,
            });
          } catch (emailErr) {
            console.error('Admin email notification error:', emailErr);
          }
        }
      }
    } catch (e) {
      console.error('Admin notification error:', e);
    }

    return NextResponse.json({ request });
  } catch (error) {
    console.error('FieldChangeRequest POST error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
