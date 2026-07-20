import { prisma } from '@/lib/prisma';

interface HistoryParams {
  lotId: string;
  event: string;
  description?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export async function logLotEvent(params: HistoryParams) {
  try {
    await prisma.lotHistory.create({
      data: {
        lotId: params.lotId,
        event: params.event,
        description: params.description ?? null,
        userId: params.userId ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    console.error('Lot history log error:', error);
  }
}
