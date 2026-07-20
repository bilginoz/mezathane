import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// GET - Kullanıcının referans bilgilerini getir
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 });
    }
    const userId = (session.user as any)?.id;

    // Kullanıcının referans kodunu bul veya oluştur
    let referral = await prisma.referral.findFirst({
      where: { referrerUserId: userId, referredUserId: null, status: 'PENDING' },
    });

    if (!referral) {
      // Benzersiz kod oluştur
      const code = 'MZT-' + crypto.randomBytes(4).toString('hex').toUpperCase();
      referral = await prisma.referral.create({
        data: {
          referrerUserId: userId,
          referralCode: code,
          status: 'PENDING',
        },
      });
    }

    // Tüm davetleri getir
    const allReferrals = await prisma.referral.findMany({
      where: { referrerUserId: userId },
      orderBy: { createdAt: 'desc' },
    });

    // Davet edilen kullanıcı bilgilerini getir
    const referredUserIds: string[] = allReferrals
      .filter((r: any) => r.referredUserId)
      .map((r: any) => r.referredUserId as string);
    const referredUsers = referredUserIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: referredUserIds } },
      select: { id: true, fullName: true, email: true, createdAt: true },
    }) : [];

    const referralsWithUser = allReferrals.map((r: any) => ({
      ...r,
      referredUser: referredUsers.find((u: any) => u.id === r.referredUserId) || null,
    }));

    return NextResponse.json({
      referralCode: referral.referralCode,
      referrals: referralsWithUser,
      stats: {
        total: allReferrals.length,
        registered: allReferrals.filter((r: any) => r.status === 'REGISTERED' || r.status === 'REWARDED').length,
        rewarded: allReferrals.filter((r: any) => r.status === 'REWARDED').length,
      },
    });
  } catch (e) {
    console.error('Referral GET error:', e);
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}
