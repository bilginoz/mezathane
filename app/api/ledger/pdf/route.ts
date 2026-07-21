export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { resolveLedger } from '@/lib/ledger-resolve';
import { buildLedgerHtml } from '@/lib/ledger-html';
import { htmlToPdfBuffer } from '@/lib/pdf';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    const res = await resolveLedger(scope, type, id);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });

    const html = buildLedgerHtml(res.data);
    const pdfBuffer = await htmlToPdfBuffer(html);
    const fname = `ekstre_${(res.data.header.name || 'hesap').toString().replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fname}"`,
      },
    });
  } catch (error: any) {
    console.error('Ledger PDF error:', error);
    return NextResponse.json({ error: 'PDF oluşturulamadı' }, { status: 500 });
  }
}
