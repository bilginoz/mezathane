export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServiceFeeSettings } from '@/lib/revenue-model';

// DIRECT (V2) içindeki gelir modelini (KONTOR | HİZMET_BEDELİ) + oranı herkese açık döner.
// Yardım/SSS ve satıcı sayfalarının doğru metni gösterebilmesi için (usePaymentMode ile aynı desen).
export async function GET() {
  try {
    const { model, rate } = await getServiceFeeSettings();
    return NextResponse.json({ model, rate });
  } catch {
    return NextResponse.json({ model: 'KONTOR', rate: 7.0 });
  }
}
