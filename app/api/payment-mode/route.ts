export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getPaymentMode } from '@/lib/payment-mode';

// Aktif ödeme modunu (ESCROW | DIRECT) herkese açık döner.
// Teklif-öncesi ekranların (bid-panel, lot-card vb.) etiket/oranı doğru göstermesi için.
export async function GET() {
  try {
    const paymentMode = await getPaymentMode();
    return NextResponse.json({ paymentMode });
  } catch {
    return NextResponse.json({ paymentMode: 'ESCROW' });
  }
}
