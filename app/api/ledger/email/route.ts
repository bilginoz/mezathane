export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { resolveLedger } from '@/lib/ledger-resolve';
import { buildLedgerHtml } from '@/lib/ledger-html';
import { sendEmail } from '@/lib/mailer';

// Ekstreyi e-posta ile gönder (HTML gövde). Alıcı/satıcı kendi adresine veya admin belirtilen adrese.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { scope, type, id, recipientEmail } = body;

    const res = await resolveLedger(scope, type, id);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });

    const to = recipientEmail || res.data.header.email;
    if (!to) return NextResponse.json({ error: 'Alıcı e-posta adresi bulunamadı' }, { status: 400 });

    const html = buildLedgerHtml(res.data);
    const typeLabel = res.data.accountType === 'BUYER' ? 'Alıcı Cari Ekstresi' : res.data.accountType === 'SELLER' ? 'Satıcı Cari Ekstresi' : 'Platform Komisyon Ekstresi';

    const result = await sendEmail({
      to,
      subject: `Mezathane — ${typeLabel}`,
      html,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'E-posta gönderilemedi' }, { status: 500 });
    }
    return NextResponse.json({ success: true, sentTo: to });
  } catch (error: any) {
    console.error('Ledger email error:', error);
    return NextResponse.json({ error: 'E-posta gönderilemedi' }, { status: 500 });
  }
}
