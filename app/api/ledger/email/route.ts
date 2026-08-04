export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { resolveLedger } from '@/lib/ledger-resolve';
import { buildLedgerHtml } from '@/lib/ledger-html';
import { sendEmail } from '@/lib/mailer';

// Ekstreyi e-posta ile gönder (HTML gövde). resolveLedger yetkiyi zaten uyguluyor (giriş + sahiplik).
// Güvenlik: yalnızca ADMIN serbest bir adrese gönderebilir; normal kullanıcı SADECE kendi
// ekstresini kendi adresine yollayabilir (rastgele adrese gönderim = spam vektörü, kapatıldı).
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    // periodFrom/periodTo: isteğe bağlı dönem ekstresi (verilmezse tüm zamanlar)
    const { scope, type, id, recipientEmail, periodFrom, periodTo } = body;

    const res = await resolveLedger(scope, type, id, { from: periodFrom, to: periodTo });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });

    const session = await getServerSession(authOptions);
    const isAdmin = (session?.user as any)?.role === 'ADMIN';
    // Admin dışı: recipientEmail yok sayılır, her zaman ekstre sahibinin kayıtlı adresine gider.
    const to = isAdmin ? (recipientEmail || res.data.header.email) : res.data.header.email;
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
