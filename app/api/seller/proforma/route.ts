export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { htmlToPdfBuffer } from '@/lib/pdf';

// MÜZAYEDE LOT LİSTESİ / KATALOG FÖYÜ (eski "proforma fatura" değil).
// Müzayede daha kurulurken satış yoktur; bu belge bir FATURA değil, satıcının kendi kaydı için
// basıp paylaşabileceği bir LOT MANİFESTOSU'dur. "Fatura/toplam bedel" ibaresi yoktur; başlangıç
// değerleri toplamı yalnızca bilgi amaçlı gösterilir.
function generateCatalogHTML(data: { seller: any; auction: any; lots: any[]; date: string }) {
  const { seller, auction, lots, date } = data;
  const totalStart = lots.reduce((s: number, l: any) => s + Number(l.startingPrice || 0), 0);

  const lotRows = lots.map((l: any) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${l.lotNumber}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-family:monospace;color:#8a6d00;">${l.lotCode ?? '-'}</td>
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
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 3px solid #d4af37; }
    .logo-section h1 { font-size: 24px; color: #d4af37; font-weight: 700; }
    .logo-section p { font-size: 12px; color: #666; margin-top: 4px; }
    .doc-info { text-align: right; }
    .doc-info h2 { font-size: 18px; color: #333; margin-bottom: 8px; }
    .doc-info p { font-size: 12px; color: #666; }
    .party { padding: 16px; border-radius: 8px; background: #f8f8f8; margin-bottom: 20px; }
    .party h3 { font-size: 13px; color: #d4af37; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px; }
    .party p { font-size: 12px; color: #444; line-height: 1.6; }
    .auction-info { background: #fffbeb; border: 1px solid #d4af37; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .auction-info h3 { font-size: 15px; color: #b8860b; margin-bottom: 6px; }
    .auction-info p { font-size: 12px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    thead th { background: #1a1a1a; color: #d4af37; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .summary-row td { padding: 12px; font-weight: 700; font-size: 13px; background: #f5f5f5; }
    .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; }
    .footer p { font-size: 10px; color: #999; text-align: center; }
    .notes { background: #f9f9f9; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .notes h4 { font-size: 12px; color: #666; margin-bottom: 6px; }
    .notes p { font-size: 11px; color: #777; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      <h1>MEZATHANE.TR</h1>
      <p>Müzayede Lot Listesi (Katalog Föyü)</p>
    </div>
    <div class="doc-info">
      <h2>LOT LİSTESİ</h2>
      <p>Tarih: ${date}</p>
      <p>Toplam Lot: ${lots.length}</p>
    </div>
  </div>

  <div class="party">
    <h3>Müzayede Evi / Satıcı</h3>
    <p><strong>${seller.companyName ?? ''}</strong></p>
    ${seller.companyAddress ? `<p>${seller.companyAddress}</p>` : ''}
    ${seller.taxOffice ? `<p>Vergi Dairesi: ${seller.taxOffice}</p>` : ''}
    ${seller.taxNumber ? `<p>Vergi No: ${seller.taxNumber}</p>` : ''}
    ${seller.mersisNo ? `<p>Mersis No: ${seller.mersisNo}</p>` : ''}
  </div>

  <div class="auction-info">
    <h3>${auction.title}</h3>
    <p>${auction.description ?? ''}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align:center;width:40px">Lot</th>
        <th style="text-align:center;">Lot Kodu</th>
        <th style="text-align:left;">Lot Adı</th>
        <th style="text-align:center;">Kategori</th>
        <th style="text-align:right;">Başlangıç Fiyatı</th>
        <th style="text-align:right;">Tahmini Değer</th>
      </tr>
    </thead>
    <tbody>
      ${lotRows}
      <tr class="summary-row">
        <td colspan="4" style="text-align:right;">Toplam başlangıç değeri (bilgi amaçlı)</td>
        <td style="text-align:right;font-family:monospace;">${totalStart.toLocaleString('tr-TR')} ₺</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="notes">
    <h4>Bilgi</h4>
    <p>• Bu belge bir <strong>lot listesi/katalog föyüdür</strong>, fatura değildir.</p>
    <p>• Başlangıç fiyatları müzayede açılış fiyatıdır; nihai satış fiyatı verilen tekliflere göre oluşur.</p>
    <p>• Lot kodu (MZT…) her lotun tekil kimliğidir; ödeme/havale eşleştirmesinde de kullanılır.</p>
  </div>

  <div class="footer">
    <p>Mezathane.tr tarafından otomatik oluşturuldu. — ${date}</p>
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
    const date = now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
    const html = generateCatalogHTML({ seller, auction, lots: auction.lots, date });

    const pdfBuffer = await htmlToPdfBuffer(html, { margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });
    const safeTitle = (auction.title || 'muzayede').replace(/[^\w]/g, '_').slice(0, 30);
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="lot-listesi-${safeTitle}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Lot listesi (katalog) generation error:', error);
    return NextResponse.json({ error: 'Lot listesi oluşturulamadı' }, { status: 500 });
  }
}
