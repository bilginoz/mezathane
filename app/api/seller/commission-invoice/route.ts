export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { htmlToPdfBuffer } from '@/lib/pdf';

function generateCommissionInvoiceHTML(data: {
  seller: any;
  payment: any;
  lot: any;
  auction: any;
  buyer: any;
  invoiceNo: string;
  date: string;
  commissionRate: number;
  salePrice: number;
  commissionMatrah: number;
  commissionKDV: number;
  grossCommission: number;
  sellerNet: number;
  paymentRef: string;
}) {
  const d = data;

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
    .inv-info h2 { font-size: 18px; color: #333; margin-bottom: 8px; }
    .inv-info p { font-size: 11px; color: #666; line-height: 1.6; }
    .parties { display: flex; gap: 30px; margin-bottom: 24px; }
    .party { flex: 1; padding: 16px; border-radius: 8px; background: #f8f8f8; }
    .party h3 { font-size: 11px; color: #d4af37; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px; font-weight: 700; }
    .party p { font-size: 11px; color: #444; line-height: 1.7; }
    .detail-box { background: #fffbeb; border: 1px solid #d4af37; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .detail-box h3 { font-size: 13px; color: #d4af37; margin-bottom: 6px; }
    .detail-box p { font-size: 11px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead th { background: #1a1a1a; color: #d4af37; padding: 10px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    thead th:first-child { border-radius: 6px 0 0 0; }
    thead th:last-child { border-radius: 0 6px 0 0; }
    td { padding: 10px 12px; border-bottom: 1px solid #eee; }
    .summary { margin-top: 0; }
    .summary table { width: 50%; margin-left: auto; }
    .summary td { padding: 8px 12px; font-size: 12px; }
    .summary tr:last-child td { border-top: 2px solid #d4af37; font-weight: 700; font-size: 14px; }
    .notes { background: #f9f9f9; border-radius: 8px; padding: 14px; margin-top: 20px; }
    .notes h4 { font-size: 11px; color: #666; margin-bottom: 6px; }
    .notes p { font-size: 10px; color: #777; line-height: 1.5; }
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
      <h2>HİZMET FATURASI</h2>
      <p>Fatura No: ${d.invoiceNo}</p>
      <p>Tarih: ${d.date}</p>
      <p>Referans: ${d.paymentRef}</p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Hizmeti Veren (Platform)</h3>
      <p><strong>Mezathane Bilişim Teknolojileri A.Ş.</strong></p>
      <p>İstanbul, Türkiye</p>
      <p>info@mezathane.tr</p>
    </div>
    <div class="party">
      <h3>Hizmeti Alan (Satıcı)</h3>
      <p><strong>${d.seller.companyName ?? d.seller.user?.fullName ?? ''}</strong></p>
      ${d.seller.companyAddress ? `<p>${d.seller.companyAddress}</p>` : ''}
      ${d.seller.taxOffice ? `<p>Vergi Dairesi: ${d.seller.taxOffice}</p>` : ''}
      ${d.seller.taxNumber ? `<p>Vergi No: ${d.seller.taxNumber}</p>` : ''}
      ${d.seller.mersisNo ? `<p>Mersis No: ${d.seller.mersisNo}</p>` : ''}
    </div>
  </div>

  <div class="detail-box">
    <h3>${d.auction.title}</h3>
    <p>Lot #${d.lot.lotNumber} — ${d.lot.title}</p>
    <p style="margin-top:4px;">Alıcı: ${d.buyer?.fullName ?? 'Belirtilmemiş'}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th style="text-align:left;">Açıklama</th>
        <th style="text-align:right;">Tutar</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Satış Fiyatı</td>
        <td style="text-align:right;font-family:monospace;">${Number(d.salePrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
      </tr>
      <tr>
        <td>Platform Komisyonu (%${d.commissionRate})</td>
        <td style="text-align:right;font-family:monospace;">${Number(d.commissionMatrah).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
      </tr>
      <tr>
        <td>KDV (%20)</td>
        <td style="text-align:right;font-family:monospace;">${Number(d.commissionKDV).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
      </tr>
    </tbody>
  </table>

  <div class="summary">
    <table>
      <tr>
        <td>Komisyon Matrahı</td>
        <td style="text-align:right;font-family:monospace;">${Number(d.commissionMatrah).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
      </tr>
      <tr>
        <td>KDV (%20)</td>
        <td style="text-align:right;font-family:monospace;">${Number(d.commissionKDV).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
      </tr>
      <tr>
        <td>Toplam Kesinti</td>
        <td style="text-align:right;font-family:monospace;">${Number(d.grossCommission).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
      </tr>
      <tr>
        <td style="color:#16a34a;">Satıcıya Ödenecek Net Tutar</td>
        <td style="text-align:right;font-family:monospace;color:#16a34a;">${Number(d.sellerNet).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
      </tr>
    </table>
  </div>

  <div class="notes">
    <h4>Notlar</h4>
    <p>• Bu fatura, Mezathane.tr platformu tarafından verilen aracılık hizmeti karşılığında düzenlenmiştir.</p>
    <p>• Fatura tutarı, satış fiyatı üzerinden %${d.commissionRate} komisyon oranı ile hesaplanmıştır.</p>
    <p>• KDV dahil toplam komisyon tutarı satıcıya ödenecek tutardan mahsup edilmiştir.</p>
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

    const { paymentId } = await request.json();
    if (!paymentId) return NextResponse.json({ error: 'Ödeme ID gerekli' }, { status: 400 });

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        lot: {
          include: {
            auction: {
              include: {
                seller: {
                  include: { user: { select: { fullName: true } } },
                },
              },
            },
          },
        },
        user: { select: { fullName: true, email: true } },
      },
    });

    if (!payment) return NextResponse.json({ error: 'Ödeme bulunamadı' }, { status: 404 });

    // Check authorization: seller or admin
    const seller = payment.lot.auction.seller;
    if (userRole !== 'ADMIN' && seller.userId !== userId) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const salePrice = payment.amount;
    const commissionRate = payment.lot.auction.commissionRate;
    const lotKdvRate = 0.20; // Aracılık komisyonu bir hizmettir; KDV'si ürün oranından bağımsız, sabit %20
    const commissionMatrah = salePrice * (commissionRate / 100);
    const commissionKDV = commissionMatrah * lotKdvRate;
    const grossCommission = commissionMatrah + commissionKDV;
    const sellerNet = salePrice - grossCommission;

    const now = new Date();
    const invoiceNo = `HF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${paymentId.slice(-6).toUpperCase()}`;
    const date = now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });
    const paymentRef = `MZT-${paymentId.slice(-8).toUpperCase()}`;

    const html = generateCommissionInvoiceHTML({
      seller,
      payment,
      lot: payment.lot,
      auction: payment.lot.auction,
      buyer: payment.user,
      invoiceNo,
      date,
      commissionRate,
      salePrice,
      commissionMatrah: Math.round(commissionMatrah * 100) / 100,
      commissionKDV: Math.round(commissionKDV * 100) / 100,
      grossCommission: Math.round(grossCommission * 100) / 100,
      sellerNet: Math.round(sellerNet * 100) / 100,
      paymentRef,
    });

    const pdfBuffer = await htmlToPdfBuffer(html, { margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="hizmet-faturasi-${invoiceNo}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Commission invoice error:', error);
    return NextResponse.json({ error: 'Fatura oluşturulamadı' }, { status: 500 });
  }
}
