export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createInAppNotification, sendNotificationEmail } from '@/lib/notifications';

/*
  Kayıtlı arama alarmı: alertEnabled olan her kayıtlı arama için, o aramanın
  lastCheckedAt tarihinden SONRA eklenen ve kriterlere uyan yeni lotları bulur;
  varsa kullanıcıya uygulama içi + e-posta bildirimi gönderir ve lastCheckedAt'i
  günceller. cron-job.org'dan periyodik (ör. saatte bir) çağrılır.
  Yetki: Authorization: Bearer <CRON_SECRET>
*/
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searches = await prisma.savedSearch.findMany({
      where: { alertEnabled: true },
      include: { user: { select: { id: true, email: true, fullName: true } } },
      take: 500, // makul üst sınır
    });

    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://www.mezathane.tr';
    let notified = 0;

    for (const s of searches) {
      const where: any = {
        createdAt: { gt: s.lastCheckedAt },
        status: { in: ['PENDING', 'ACTIVE'] },
        auction: { status: { in: ['ACTIVE', 'LIVE', 'SCHEDULED'] }, seller: { status: 'APPROVED' } },
      };
      if (s.keyword) where.title = { contains: s.keyword, mode: 'insensitive' };
      if (s.categoryId) {
        where.OR = [
          { categoryId: s.categoryId },
          { secondaryCategoryId: s.categoryId },
          { lotCategories: { some: { categoryId: s.categoryId } } },
        ];
      }
      const priceFilter: any = {};
      if (s.minPrice != null) priceFilter.gte = s.minPrice;
      if (s.maxPrice != null) priceFilter.lte = s.maxPrice;
      if (Object.keys(priceFilter).length) where.currentPrice = priceFilter;

      const matches = await prisma.lot.findMany({
        where,
        select: { id: true, title: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      // Her zaman lastCheckedAt'i ilerlet (eşleşme olmasa da) — aynı lotlar tekrar sayılmasın
      await prisma.savedSearch.update({ where: { id: s.id }, data: { lastCheckedAt: new Date() } });

      if (matches.length === 0) continue;

      const kriter = [
        s.keyword ? `"${s.keyword}"` : null,
        s.minPrice != null || s.maxPrice != null
          ? `${s.minPrice != null ? s.minPrice.toLocaleString('tr-TR') + ' ₺' : ''}${s.minPrice != null && s.maxPrice != null ? ' - ' : ''}${s.maxPrice != null ? s.maxPrice.toLocaleString('tr-TR') + ' ₺' : ''}`
          : null,
      ].filter(Boolean).join(', ') || 'kayıtlı aramanız';

      const listeUrl = `${baseUrl}${s.keyword ? `/muzayedeler?q=${encodeURIComponent(s.keyword)}` : '/muzayedeler'}`;

      // Uygulama içi bildirim
      await createInAppNotification({
        userId: s.userId,
        title: 'Kayıtlı aramanıza uygun yeni lot(lar)!',
        message: `${kriter} için ${matches.length} yeni lot eklendi.`,
        type: 'SAVED_SEARCH',
        link: '/muzayedeler',
      });

      // E-posta
      if (s.user?.email) {
        const items = matches.map(m => `<li style="margin:4px 0;">${m.title}</li>`).join('');
        await sendNotificationEmail({
          recipientEmail: s.user.email,
          subject: 'Kayıtlı aramanıza uygun yeni lotlar var',
          body: `<div style="font-family:sans-serif;color:#333;max-width:600px;margin:0 auto;">
            <h2 style="color:#d4af37;">Yeni Lot Bildirimi</h2>
            <p>Sayın ${s.user.fullName ?? 'üyemiz'},</p>
            <p><strong>${kriter}</strong> kaydettiğiniz aramaya uygun <strong>${matches.length}</strong> yeni lot eklendi:</p>
            <ul style="padding-left:18px;">${items}</ul>
            <p><a href="${listeUrl}" style="color:#d4af37;">Lotları görüntüle →</a></p>
            <p style="color:#888;font-size:12px;">Bu bildirimi, kayıtlı aramalarınızdan alarmı kapatarak durdurabilirsiniz.</p>
          </div>`,
        }).catch(() => {});
      }
      notified++;
    }

    return NextResponse.json({ success: true, searchesChecked: searches.length, notified });
  } catch (error) {
    console.error('Saved-search alerts error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
