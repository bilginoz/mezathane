export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    const where: any = {};
    if (role) where.role = role;
    if (status === 'active') where.isActive = true;
    if (status === 'banned') where.isActive = false;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, fullName: true, phone: true, role: true,
          isActive: true, createdAt: true, memberNumber: true, twoFactorEnabled: true,
          sellerProfile: { select: { companyName: true, status: true } },
          _count: { select: { bids: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ users, total, totalPages: Math.ceil(total / limit) });
  } catch (error: any) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Kullanıcılar yüklenemedi' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, action, data } = body ?? {};

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId ve action zorunlu' }, { status: 400 });
    }

    // Prevent self-modification
    if (userId === (session.user as any).id) {
      return NextResponse.json({ error: 'Kendi hesabınızı değiştiremezsiniz' }, { status: 400 });
    }

    let updatedUser;

    switch (action) {
      case 'ban':
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { isActive: false },
          select: { id: true, fullName: true, isActive: true },
        });
        break;

      case 'unban':
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { isActive: true },
          select: { id: true, fullName: true, isActive: true },
        });
        break;

      case 'updateRole':
        if (!data?.role || !['BUYER', 'SELLER', 'ADMIN'].includes(data.role)) {
          return NextResponse.json({ error: 'Geçersiz rol' }, { status: 400 });
        }
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { role: data.role },
          select: { id: true, fullName: true, role: true },
        });
        break;

      case 'update':
        const updateData: any = {};
        if (data?.fullName) updateData.fullName = data.fullName;
        if (data?.phone !== undefined) updateData.phone = data.phone;
        if (data?.email) updateData.email = data.email;
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: updateData,
          select: { id: true, fullName: true, email: true, phone: true },
        });
        break;

      // Kurtarma: kullanıcı hem telefonunu hem yedek kodlarını kaybettiyse
      // iki adımlı doğrulamayı sıfırla. Hassas işlem — denetim günlüğüne yazılır.
      case 'reset2fa': {
        const target = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, fullName: true, email: true, twoFactorEnabled: true },
        });
        if (!target) {
          return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
        }
        if (!target.twoFactorEnabled) {
          return NextResponse.json({ error: 'Bu kullanıcıda iki adımlı doğrulama zaten kapalı.' }, { status: 400 });
        }
        updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: null },
          select: { id: true, fullName: true, twoFactorEnabled: true },
        });
        await logAudit({
          userId: (session.user as any).id,
          userName: (session.user as any).name ?? undefined,
          action: 'RESET_2FA',
          entity: 'User',
          entityId: userId,
          details: { targetEmail: target.email, targetName: target.fullName },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? undefined,
        });
        break;
      }

      default:
        return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 });
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error('Admin users PATCH error:', error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
