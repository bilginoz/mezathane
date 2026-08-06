export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { htmlToPdfBuffer } from '@/lib/pdf';

// AŞAMA 3e (2026-08-06) — satıcının, henüz ödemediği hizmet bedeli kalemlerinin PDF özetini
// isteğe bağlı indirebilmesi (muhasebeye ibraz için). Müzayede Hakkı makbuzuyla aynı altyapı
// (auction-rights/receipt) — bu da resmi vergi faturası DEĞİL, ödeme özeti/makbuzudur.

function generateServiceFeeHTML(d: { seller: any; lines: any[]; total: number; receiptNo: string; date: string }) {
  const rows = d.lines.map((l) => `
    <tr>
      <td>#${l.lotNumber ?? '-'} ${l.lotTitle}</td>
      <td style="text-align:right;font-family:monospace;">${Number(l.hammer).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
      <td style="text-align:right;font-family:monospace;">${Number(l.serviceFeeAmount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
      <td style="text-align:right;font-family:monospace;">${Number(l.serviceFeeKDV).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
      <td>${l.status}</td>
    </tr>`).join('');

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
    td { padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 11px; }
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
      <h2>HİZMET BEDELİ ÖDEME ÖZETİ</h2>
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
      <tr><th>Lot</th><th style="text-align:right;">Çekiç Fiyatı</th><th style="text-align:right;">Hizmet Bedeli</th><th style="text-align:right;">KDV (%20)</th><th>Durum</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="summary">
    <table>
      <tr><td>Toplam Borç</td><td style="text-align:right;font-family:monospace;">${d.total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td></tr>
    </table>
  </div>

  <div class="notes">
    <h4>Önemli Not</h4>
    <p>Bu belge bir vergi faturası değildir; hizmet bedeli borcunuzun ÖZETİ/MAKBUZUDUR, kayıt ve
    muhasebe amaçlı ibraz için düzenlenmiştir. Ödemenizi yaptıktan sonra Cari sayfanızdan
    "Ödedim" bildiriminde bulunmanız, admin onayıyla borcun kapanması için gereklidir.</p>
  </div>

  <div class="footer">
    <p>Bu belge Mezathane.tr platformu tarafından otomatik olarak oluşturulmuştur. — ${d.date}</p>
  </div>
</body>
</html>`;
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;

    const seller = await prisma.sellerProfile.findFirst({ where: { userId } });
    if (!seller) return NextResponse.json({ error: 'Satıcı profili yok' }, { status: 404 });

    const payments = await prisma.payment.findMany({
      where: {
        lot: { auction: { sellerId: seller.id } },
        serviceFeeAmount: { not: null },
        serviceFeePaidAt: null,
      },
      include: { lot: { select: { lotNumber: true, title: true } } },
      orderBy: { createdAt: 'asc' },
    });
    if (payments.length === 0) {
      return NextResponse.json({ error: 'Bekleyen hizmet bedeli kaydı yok' }, { status: 400 });
    }

    const lines = payments.map((p) => ({
      lotNumber: p.lot?.lotNumber ?? null,
      lotTitle: p.lot?.title ?? '-',
      hammer: p.amount,
      serviceFeeAmount: p.serviceFeeAmount,
      serviceFeeKDV: p.serviceFeeKDV,
      status: p.serviceFeeSellerReportedAt ? 'Onay bekliyor' : 'Ödenmedi',
    }));
    const total = lines.reduce((s, l) => s + (l.serviceFeeAmount ?? 0) + (l.serviceFeeKDV ?? 0), 0);

    const now = new Date();
    const receiptNo = `HZB-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${seller.id.slice(-6).toUpperCase()}`;
    const date = now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });

    const html = generateServiceFeeHTML({ seller, lines, total, receiptNo, date });
    const pdfBuffer = await htmlToPdfBuffer(html, { margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="hizmet-bedeli-ozeti-${receiptNo}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Service fee receipt error:', error);
    return NextResponse.json({ error: 'Özet oluşturulamadı' }, { status: 500 });
  }
}
