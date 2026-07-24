export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/utils';
import { htmlToPdfBuffer } from '@/lib/pdf';

function generateProformaHTML(data: {
  seller: any;
  auction: any;
  lots: any[];
  invoiceNo: string;
  date: string;
}) {
  const { seller, auction, lots, invoiceNo, date } = data;
  const totalAmount = lots.reduce((s: number, l: any) => s + l.startingPrice, 0);

  const lotRows = lots.map((l: any, i: number) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${i + 1}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${l.title}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${l.category?.name ?? '-'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${Number(l.startingPrice).toLocaleString('tr-TR')} ₺</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${l.estimatedPrice ? Number(l.estimatedPrice).toLocaleString('tr-TR') + ' ₺' : '-'}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #d4af37; }
    .logo-section h1 { font-size: 24px; color: #d4af37; font-weight: 700; }
    .logo-section p { font-size: 12px; color: #666; margin-top: 4px; }
    .invoice-info { text-align: right; }
    .invoice-info h2 { font-size: 20px; color: #333; margin-bottom: 8px; }
    .invoice-info p { font-size: 12px; color: #666; }
    .parties { display: flex; gap: 40px; margin-bottom: 30px; }
    .party { flex: 1; padding: 16px; border-radius: 8px; background: #f8f8f8; }
    .party h3 { font-size: 13px; color: #d4af37; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px; }
    .party p { font-size: 12px; color: #444; line-height: 1.6; }
    .auction-info { background: #fffbeb; border: 1px solid #d4af37; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .auction-info h3 { font-size: 14px; color: #d4af37; margin-bottom: 6px; }
    .auction-info p { font-size: 12px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { background: #1a1a1a; color: #d4af37; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th:first-child { border-radius: 6px 0 0 0; }
    thead th:last-child { border-radius: 0 6px 0 0; }
    .total-row { background: #f5f5f5; }
    .total-row td { padding: 12px; font-weight: 700; font-size: 14px; }
    .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #ddd; }
    .footer p { font-size: 10px; color: #999; text-align: center; }
    .notes { background: #f9f9f9; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .notes h4 { font-size: 12px; color: #666; margin-bottom: 6px; }
    .notes p { font-size: 11px; color: #777; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      <h1>MEZATHANE.TR</h1>
      <p>Türkiye'nin Premium Müzayede Platformu</p>
    </div>
    <div class="invoice-info">
      <h2>PROFORMA FATURA</h2>
      <p>No: ${invoiceNo}</p>
      <p>Tarih: ${date}</p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Satıcı Bilgileri</h3>
      <p><strong>${seller.companyName ?? ''}</strong></p>
      ${seller.companyAddress ? `<p>${seller.companyAddress}</p>` : ''}
      ${seller.taxOffice ? `<p>Vergi Dairesi: ${seller.taxOffice}</p>` : ''}
      ${seller.taxNumber ? `<p>Vergi No: ${seller.taxNumber}</p>` : ''}
      ${seller.mersisNo ? `<p>Mersis No: ${seller.mersisNo}</p>` : ''}
    </div>
    <div class="party">
      <h3>Platform Bilgileri</h3>
      <p><strong>Mezathane.tr</strong></p>
      <p>bilgi@mezathane.tr</p>
      <p>Komisyon Oranı: %${seller.commissionRate ?? 0}</p>
    </div>
  </div>

  <div class="auction-info">
    <h3>${auction.title}</h3>
    <p>${auction.description ?? 'Müzayede açıklaması bulunmamaktadır.'}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align:center;width:40px">#</th>
        <th style="text-align:left;">Lot Adı</th>
        <th style="text-align:center;">Kategori</th>
        <th style="text-align:right;">Başlangıç Fiyatı</th>
        <th style="text-align:right;">Tahmini Fiyat</th>
      </tr>
    </thead>
    <tbody>
      ${lotRows}
      <tr class="total-row">
        <td colspan="3" style="text-align:right;padding:12px;">Toplam Lot: ${lots.length}</td>
        <td style="text-align:right;padding:12px;font-family:monospace;">${totalAmount.toLocaleString('tr-TR')} ₺</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="notes">
    <h4>Önemli Notlar</h4>
    <p>• Bu belge proforma niteliğindedir ve kesin fatura yerine geçmez.</p>
    <p>• Fiyatlar KDV dahildir.</p>
    <p>• Nihai satış fiyatı, müzayede sırasında verilen tekliflere göre belirlenecektir.</p>
    <p>• Ödeme süresi: Müzayede bitiminden itibaren ${auction.paymentDays ?? 5} iş günü.</p>
  </div>

  <div class="footer">
    <p>Bu belge Mezathane.tr platformu tarafından otomatik olarak oluşturulmuştur. — ${date}</p>
  </div>
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller || seller.status !== 'APPROVED') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

    const { auctionId } = await request.json();
    if (!auctionId) return NextResponse.json({ error: 'Müzayede ID gerekli' }, { status: 400 });

    const auction = await prisma.auction.findFirst({
      where: { id: auctionId, sellerId: seller.id },
      include: {
        lots: {
          include: { category: true },
          orderBy: { lotNumber: 'asc' },
        },
      },
    });
    if (!auction) return NextResponse.json({ error: 'Müzayede bulunamadı' }, { status: 404 });

    const now = new Date();
    const invoiceNo = `PF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const date = now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

    const html = generateProformaHTML({
      seller,
      auction,
      lots: auction.lots,
      invoiceNo,
      date,
    });

    const pdfBuffer = await htmlToPdfBuffer(html, { margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="proforma-${invoiceNo}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Proforma generation error:', error);
    return NextResponse.json({ error: 'Proforma oluşturulamadı' }, { status: 500 });
  }
}
