export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    // Yoksa varsayılan tercihlerle oluştur
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    return NextResponse.json(prefs);
  } catch (error: any) {
    console.error('Notification preferences GET error:', error);
    return NextResponse.json({ error: 'Tercihler yüklenemedi' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const body = await request.json();

    // İzin verilen alanlar
    const allowedFields = [
      'emailOutbid', 'emailAuctionWon', 'emailPaymentReminder',
      'emailWatchlistBid', 'emailAuctionStart', 'emailOrderStatus',
      'inAppOutbid', 'inAppAuctionWon', 'inAppWatchlistBid',
      'inAppAuctionStart', 'inAppOrderStatus',
    ];

    const updateData: Record<string, boolean> = {};
    for (const key of allowedFields) {
      if (typeof body[key] === 'boolean') {
        updateData[key] = body[key];
      }
    }

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...updateData },
      update: updateData,
    });

    return NextResponse.json(prefs);
  } catch (error: any) {
    console.error('Notification preferences PATCH error:', error);
    return NextResponse.json({ error: 'Tercihler güncellenemedi' }, { status: 500 });
  }
}
