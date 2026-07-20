export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { resolveLedger } from '@/lib/ledger-resolve';
import { buildLedgerHtml } from '@/lib/ledger-html';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    const res = await resolveLedger(scope, type, id);
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });

    const html = buildLedgerHtml(res.data);

    const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        html_content: html,
        pdf_options: { format: 'A4', print_background: true, margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } },
      }),
    });
    if (!createResponse.ok) {
      return NextResponse.json({ error: 'PDF oluşturulamadı' }, { status: 500 });
    }
    const { request_id } = await createResponse.json();
    if (!request_id) return NextResponse.json({ error: 'PDF isteği başlatılamadı' }, { status: 500 });

    const maxAttempts = 120;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const statusResponse = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id, deployment_token: process.env.ABACUSAI_API_KEY }),
      });
      const statusResult = await statusResponse.json();
      const status = statusResult?.status || 'FAILED';
      if (status === 'SUCCESS') {
        const result = statusResult?.result;
        if (result?.result) {
          const pdfBuffer = Buffer.from(result.result, 'base64');
          const fname = `ekstre_${(res.data.header.name || 'hesap').toString().replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
          return new NextResponse(pdfBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="${fname}"`,
            },
          });
        }
        return NextResponse.json({ error: 'PDF sonucu boş' }, { status: 500 });
      } else if (status === 'FAILED') {
        return NextResponse.json({ error: 'PDF oluşturma başarısız' }, { status: 500 });
      }
    }
    return NextResponse.json({ error: 'PDF zaman aşımı' }, { status: 500 });
  } catch (error: any) {
    console.error('Ledger PDF error:', error);
    return NextResponse.json({ error: 'PDF oluşturulamadı' }, { status: 500 });
  }
}
