export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { resolveLedger } from '@/lib/ledger-resolve';
import { buildLedgerHtml } from '@/lib/ledger-html';

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
    const appUrl = process.env.NEXTAUTH_URL || '';
    const hostname = appUrl ? new URL(appUrl).hostname : 'mezathane.tr';
    const typeLabel = res.data.accountType === 'BUYER' ? 'Alıcı Cari Ekstresi' : res.data.accountType === 'SELLER' ? 'Satıcı Cari Ekstresi' : 'Platform Komisyon Ekstresi';

    const resp = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        app_id: process.env.WEB_APP_ID,
        notification_id: process.env.NOTIF_ID_CARI_EKSTRE_GNDERIMI,
        subject: `Mezathane — ${typeLabel}`,
        body: html,
        is_html: true,
        recipient_email: to,
        sender_email: `noreply@${hostname}`,
        sender_alias: 'Mezathane',
      }),
    });
    const result = await resp.json().catch(() => ({ success: false }));
    if (!result.success) {
      if (result.notification_disabled) {
        return NextResponse.json({ success: false, error: 'Bu alıcı bildirimleri kapatmış' }, { status: 400 });
      }
      return NextResponse.json({ error: result.message || 'E-posta gönderilemedi' }, { status: 500 });
    }
    return NextResponse.json({ success: true, sentTo: to });
  } catch (error: any) {
    console.error('Ledger email error:', error);
    return NextResponse.json({ error: 'E-posta gönderilemedi' }, { status: 500 });
  }
}
