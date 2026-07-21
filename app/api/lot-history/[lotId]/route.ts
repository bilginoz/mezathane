export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ lotId: string }> }
) {
  try {
    const { lotId } = await params;
    const history = await prisma.lotHistory.findMany({
      where: { lotId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error('Lot history error:', error);
    return NextResponse.json({ history: [] });
  }
}
