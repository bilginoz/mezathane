export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const sellers = await prisma.sellerProfile.findMany({
      where: { status: 'APPROVED' },
      select: { id: true, companyName: true, logoUrl: true },
      orderBy: { companyName: 'asc' },
    });
    return NextResponse.json({ sellers });
  } catch (error: any) {
    console.error('Sellers fetch error:', error);
    return NextResponse.json({ sellers: [] });
  }
}
