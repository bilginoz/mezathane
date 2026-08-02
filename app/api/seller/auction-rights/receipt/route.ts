export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { htmlToPdfBuffer } from '@/lib/pdf';

/*
  DIRECT (V2) modunda platformun tek geliri Müzayede Hakkı satışıdır (ürün satışından komisyon
  alınmaz, dolayısıyla "hizmet faturası" kavramı DIRECT'te anlamsızdır). Bunun yerine satıcıya,
  ödediği Müzayede Hakkı bedeli için resmi bir vergi faturası DEĞİL, sade bir ÖDEME ÖZETİ/MAKBUZ
  verilir — kayıt tutmak ve gerektiğinde muhasebeciye ibraz etmek için.
*/

function generateReceiptHTML(d: {
  seller: any;
  purchase: any;
  receiptNo: string;
  date: string;
}) {
  const p = d.purchase;
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 40px; font-size: 12px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #d4af37; }
    .logo h1 { font-size: 24px; color: #d4af37; font-weight: 700; }
    .logo p { font-size: 11px; color: #666; margin-top: 4px; }
    .inv-info { text-align: right; }
    .inv-info h2 { font-size: 16px; color: #333; margin-bottom: 8px; letter-spacing: 0.5px; }
    .inv-info p { font-size: 11px; color: #666; line-height: 1.6; }
    .party { padding: 16px; border-radius: 8px; background: #f8f8f8; margin-bottom: 20px; }
    .party h3 { font-size: 11px; color: #d4af37; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px; font-weight: 700; }
    .party p { font-size: 11px; color: #444; line-height: 1.7; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead th { background: #1a1a1a; color: #d4af37; padding: 10px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; }
    .summary table { width: 60%; margin-left: auto; }
    .summary td { padding: 8px 12px; font-size: 12px; }
    .summary tr:last-child td { border-top: 2px solid #d4af37; font-weight: 700; font-size: 14px; }
    .notes { background: #fffbeb; border: 1px solid #d4af37; border-radius: 8px; padding: 14px; margin-top: 20px; }
    .notes h4 { font-size: 11px; color: #92700f; margin-bottom: 6px; }
    .notes p { font-size: 10px; color: #6b5610; line-height: 1.6; }
    .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #ddd; }
    .footer p { font-size: 9px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <h1>MEZATHANE.TR</h1>
      <p>Türkiye'nin Premium Müzayede Platformu</p>
    </div>
    <div class="inv-info">
      <h2>MÜZAYEDE HAKKI ÖDEME ÖZETİ</h2>
      <p>Belge No: ${d.receiptNo}</p>
      <p>Tarih: ${d.date}</p>
    </div>
  </div>

  <div class="party">
    <h3>Satıcı</h3>
    <p><strong>${d.seller.companyName ?? ''}</strong></p>
    ${d.seller.companyAddress ? `<p>${d.seller.companyAddress}</p>` : ''}
    ${d.seller.taxOffice ? `<p>Vergi Dairesi: ${d.seller.taxOffice}</p>` : ''}
    ${d.seller.taxNumber ? `<p>Vergi No: ${d.seller.taxNumber}</p>` : ''}
  </div>

  <table>
    <thead>
      <tr><th>Açıklama</th><th style="text-align:right;">Tutar</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>${p.planType === 'UNLIMITED_MONTHLY' ? 'Aylık Sınırsız Paket (KDV hariç)' : `Müzayede Hakkı (${p.quantity} adet × ${Number(p.unitPrice).toLocaleString('tr-TR')} ₺)`}</td>
        <td style="text-align:right;font-family:monospace;">${Number(p.unitPrice * (p.planType === 'UNLIMITED_MONTHLY' ? 1 : p.quantity)).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
      </tr>
      ${(p.kdvAmount ?? 0) > 0 ? `<tr>
        <td>KDV (%20)</td>
        <td style="text-align:right;font-family:monospace;">${Number(p.kdvAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
      </tr>` : ''}
      <tr>
        <td>Onay Tarihi</td>
        <td style="text-align:right;">${p.approvedAt ? new Date(p.approvedAt).toLocaleDateString('tr-TR') : '—'}</td>
      </tr>
      <tr>
        <td>Geçerlilik</td>
        <td style="text-align:right;">${p.expiresAt ? new Date(p.expiresAt).toLocaleDateString('tr-TR') + ' tarihine kadar' : '—'}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary">
    <table>
      <tr><td>Ödenen Toplam Tutar</td><td style="text-align:right;font-family:monospace;">${Number(p.totalAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td></tr>
    </table>
  </div>

  <div class="notes">
    <h4>Önemli Not</h4>
    <p>Bu belge bir vergi faturası değildir; Müzayede Hakkı ödemenizin ÖZETİ/MAKBUZUDUR, kayıt ve
    muhasebe amaçlı ibraz için düzenlenmiştir. Mezathane.tr, doğrudan ödeme modelinde satılan
    ürünlerin bedelini tahsil etmez ve bu satışlar için fatura düzenlemez; ürün satışlarının
    faturası satıcı tarafından alıcıya kesilir.</p>
  </div>

  <div class="footer">
    <p>Bu belge Mezathane.tr platformu tarafından otomatik olarak oluşturulmuştur. — ${d.date}</p>
  </div>
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const { purchaseId } = await request.json();
    if (!purchaseId) return NextResponse.json({ error: 'purchaseId gerekli' }, { status: 400 });

    const purchase = await prisma.auctionRightPurchase.findUnique({
      where: { id: purchaseId },
      include: { seller: true },
    });
    if (!purchase) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    if (userRole !== 'ADMIN' && purchase.seller.userId !== userId) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }
    if (purchase.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Yalnızca onaylanmış satın almalar için özet oluşturulabilir' }, { status: 400 });
    }

    const now = new Date();
    const receiptNo = `MZH-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${purchaseId.slice(-6).toUpperCase()}`;
    const date = now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });

    const html = generateReceiptHTML({ seller: purchase.seller, purchase, receiptNo, date });
    const pdfBuffer = await htmlToPdfBuffer(html, { margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="muzayede-hakki-ozeti-${receiptNo}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Auction right receipt error:', error);
    return NextResponse.json({ error: 'Özet oluşturulamadı' }, { status: 500 });
  }
}
