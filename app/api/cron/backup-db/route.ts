export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';
import { createS3Client } from '@/lib/aws-config';

// Tüm tabloları içeren tam bir JSON yedeği alıp gizli (herkese açık olmayan)
// bir R2 bucket'ına yükler. Günlük olarak cron-job.org tarafından tetiklenir.
const MODELS = [
  'user', 'account', 'session', 'sellerProfile', 'sellerReview', 'category', 'lotCategory',
  'auction', 'lot', 'lotImage', 'bid', 'proxyBid', 'watchlist', 'notification', 'payment',
  'platformSettings', 'siteSettings', 'page', 'notificationPreference', 'dispute',
  'auctionTemplate', 'contactMessage', 'conversation', 'message', 'ledgerEntry',
  'installmentPlan', 'installment', 'auditLog', 'lotHistory', 'tag', 'lotTag',
  'emailTemplate', 'coupon', 'couponUsage', 'referral', 'blogPost', 'sellerDocument',
  'fieldChangeRequest',
] as const;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backup: Record<string, any> = { createdAt: new Date().toISOString() };
    for (const model of MODELS) {
      backup[model] = await (prisma as any)[model].findMany();
    }

    const json = JSON.stringify(backup);
    const dateStr = new Date().toISOString().slice(0, 10);
    const key = `mezathane-${dateStr}.json`;

    await createS3Client().send(new PutObjectCommand({
      Bucket: process.env.R2_BACKUP_BUCKET_NAME,
      Key: key,
      Body: json,
      ContentType: 'application/json',
    }));

    return NextResponse.json({ success: true, key, tableCount: MODELS.length, sizeBytes: json.length });
  } catch (error: any) {
    console.error('DB backup error:', error);
    return NextResponse.json({ error: 'Yedekleme başarısız' }, { status: 500 });
  }
}
