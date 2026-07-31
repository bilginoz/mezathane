export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { createInAppNotification, notifyAdmins } from '@/lib/notifications';

// Kullanıcı şikayetlerini listele + yeni şikayet oluştur
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;

    const disputes = await prisma.dispute.findMany({
      where: { reporterId: userId },
      include: {
        lot: { select: { id: true, title: true, lotNumber: true } },
        against: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(disputes);
  } catch (error) {
    console.error('Disputes GET error:', error);
    return NextResponse.json({ error: 'Yüklenemedi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;
    const body = await request.json();
    const { lotId, reason, description } = body;

    if (!lotId || !reason || !description) {
      return NextResponse.json({ error: 'Tüm alanlar zorunludur' }, { status: 400 });
    }

    // Lot'u ve satıcıyı bul
    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: { auction: { include: { seller: true } } },
    });
    if (!lot) return NextResponse.json({ error: 'Lot bulunamadı' }, { status: 404 });

    const dispute = await prisma.dispute.create({
      data: {
        lotId,
        reporterId: userId,
        againstId: lot.auction.seller.userId,
        reason,
        description,
      },
    });

    // Anlık bildirim: adminler (çözüm için) + hakkında şikayet açılan satıcı.
    try {
      await notifyAdmins({
        title: '⚠️ Yeni Anlaşmazlık',
        message: `"${lot.title}" lotu için bir anlaşmazlık açıldı. Sebep: ${reason}. İncelenmesi gerekiyor.`,
        link: '/admin/anlasmazliklar',
      });
      const sellerUserId = lot.auction.seller.userId;
      if (sellerUserId && sellerUserId !== userId) {
        await createInAppNotification({
          userId: sellerUserId,
          title: '⚠️ Hakkınızda anlaşmazlık açıldı',
          message: `"${lot.title}" lotu için bir alıcı anlaşmazlık açtı (${reason}). Platform süreci değerlendirecek.`,
          type: 'ORDER_STATUS',
          link: '/satici/siparisler',
          preferenceType: 'OrderStatus',
        });
      }
    } catch (e) {
      console.error('Dispute notify error:', e); // bildirim hatası şikayeti bozmasın
    }

    return NextResponse.json(dispute, { status: 201 });
  } catch (error) {
    console.error('Disputes POST error:', error);
    return NextResponse.json({ error: 'Oluşturulamadı' }, { status: 500 });
  }
}
