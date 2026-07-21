export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';

function generateInvoiceHtml(data: any) {
  const { lot, auction, winner, seller, winningBid, payment } = data;
  const amount = winningBid?.amount ?? lot.currentPrice ?? 0;
  const buyerPremiumRate = payment?.buyerPremiumRate ?? 10;
  const buyerPremiumAmount = payment?.buyerPremiumAmount ?? (amount * 0.10);
  const lotKdvRate = (lot.kdvRate ?? 20) / 100;
  const buyerPremiumKDV = payment?.buyerPremiumKDV ?? (buyerPremiumAmount * lotKdvRate);
  const total = payment?.totalAmount ?? (amount + buyerPremiumAmount + buyerPremiumKDV);
  const invoiceNo = `MZT-${new Date().getFullYear()}-${lot.lotNumber ?? '000'}`;
  const date = new Date().toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' });

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; color: #1a1a1a; padding: 40px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #d4af37; padding-bottom: 20px; }
    .logo { font-size: 28px; font-weight: bold; color: #000; }
    .logo span { color: #d4af37; }
    .invoice-info { text-align: right; }
    .invoice-info h2 { font-size: 24px; color: #d4af37; margin-bottom: 8px; }
    .invoice-info p { font-size: 13px; color: #666; }
    .parties { display: flex; gap: 40px; margin-bottom: 30px; }
    .party { flex: 1; }
    .party h3 { font-size: 12px; text-transform: uppercase; color: #d4af37; margin-bottom: 8px; letter-spacing: 1px; }
    .party p { font-size: 13px; line-height: 1.6; color: #333; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f5f0e0; color: #000; font-size: 12px; text-transform: uppercase; padding: 10px 14px; text-align: left; letter-spacing: 0.5px; }
    td { padding: 12px 14px; border-bottom: 1px solid #eee; font-size: 13px; }
    .total-row td { font-weight: bold; border-top: 2px solid #d4af37; background: #faf8f0; font-size: 15px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 11px; color: #999; }
    .amount { text-align: right; font-family: monospace; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Mezathane<span>.tr</span></div>
    <div class="invoice-info">
      <h2>FATURA</h2>
      <p>Fatura No: ${invoiceNo}</p>
      <p>Tarih: ${date}</p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Satıcı</h3>
      <p><strong>${seller?.companyName ?? '-'}</strong></p>
      <p>${seller?.companyAddress ?? ''}</p>
      <p>Vergi Dairesi: ${seller?.taxOffice ?? '-'}</p>
      <p>Vergi No: ${seller?.taxNumber ?? '-'}</p>
    </div>
    <div class="party">
      <h3>Alıcı</h3>
      <p><strong>${winner?.fullName ?? '-'}</strong></p>
      <p>${winner?.email ?? ''}</p>
      <p>${winner?.phone ?? ''}</p>
      <p>${winner?.address ?? ''}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Açıklama</th>
        <th>Müzayede</th>
        <th>Lot No</th>
        <th class="amount">Tutar</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${lot.title ?? '-'} (Çekiç Fiyatı)</td>
        <td>${auction.title ?? '-'}</td>
        <td>${lot.lotNumber ?? '-'}</td>
        <td class="amount">${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
      </tr>
      <tr>
        <td>Hizmet Bedeli (%${buyerPremiumRate})</td>
        <td></td>
        <td></td>
        <td class="amount">${buyerPremiumAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
      </tr>
      <tr>
        <td>KDV (%${lot.kdvRate ?? 20}, hizmet bedeli üzerinden)</td>
        <td></td>
        <td></td>
        <td class="amount">${buyerPremiumKDV.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
      </tr>
      <tr class="total-row">
        <td colspan="3" style="text-align: right;">TOPLAM</td>
        <td class="amount">${total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>Bu fatura Mezathane.tr müzayede platformu tarafından otomatik olarak oluşturulmuştur.</p>
    <p>mezathane.tr | info@mezathane.tr</p>
  </div>
</body>
</html>`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ lotId: string }> }
) {
  try {
    const { lotId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    const lot = await prisma.lot.findUnique({
      where: { id: lotId },
      include: {
        auction: {
          include: {
            seller: true,
          },
        },
        bids: {
          where: { isWinning: true },
          orderBy: { amount: 'desc' },
          take: 1,
          include: { user: { select: { id: true, fullName: true, email: true, phone: true, address: true, billingAddress: true, tcKimlikNo: true, isCompany: true, companyName: true, taxOffice: true, taxNumber: true, city: true, district: true, postalCode: true } } },
        },
      },
    });

    if (!lot) return NextResponse.json({ error: 'Lot bulunamadı' }, { status: 404 });

    const winningBid = lot.bids[0];
    if (!winningBid) return NextResponse.json({ error: 'Kazanan teklif bulunamadı' }, { status: 400 });

    // Payment verisini al (alıcı komisyonu bilgileri için)
    const payment = await prisma.payment.findFirst({
      where: { lotId },
      select: { buyerPremiumRate: true, buyerPremiumAmount: true, buyerPremiumKDV: true, totalAmount: true },
    });

    // Sadece kazanan, satıcı veya admin görebilir
    if (userRole !== 'ADMIN' && winningBid.userId !== userId && lot.auction.seller?.userId !== userId) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    // TC Kimlik No'yu decrypt et (fatura için gerekli)
    const winnerDecrypted = winningBid.user ? {
      ...winningBid.user,
      tcKimlikNo: winningBid.user.tcKimlikNo ? decrypt(winningBid.user.tcKimlikNo) : null,
    } : winningBid.user;

    const htmlContent = generateInvoiceHtml({
      lot,
      auction: lot.auction,
      winner: winnerDecrypted,
      seller: lot.auction.seller,
      winningBid,
      payment,
    });

    // PDF oluştur
    const createResponse = await fetch('https://apps.abacus.ai/api/createConvertHtmlToPdfRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployment_token: process.env.ABACUSAI_API_KEY,
        html_content: htmlContent,
        pdf_options: { format: 'A4', print_background: true },
      }),
    });

    if (!createResponse.ok) {
      return NextResponse.json({ error: 'PDF oluşturulamadı' }, { status: 500 });
    }

    const { request_id } = await createResponse.json();
    if (!request_id) {
      return NextResponse.json({ error: 'PDF istek ID alınamadı' }, { status: 500 });
    }

    // Poll for status
    let attempts = 0;
    while (attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const statusResponse = await fetch('https://apps.abacus.ai/api/getConvertHtmlToPdfStatus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id, deployment_token: process.env.ABACUSAI_API_KEY }),
      });
      const statusResult = await statusResponse.json();

      if (statusResult?.status === 'SUCCESS' && statusResult?.result?.result) {
        const pdfBuffer = Buffer.from(statusResult.result.result, 'base64');
        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="fatura-${lot.lotNumber ?? lot.id}.pdf"`,
          },
        });
      } else if (statusResult?.status === 'FAILED') {
        return NextResponse.json({ error: 'PDF oluşturma başarısız' }, { status: 500 });
      }
      attempts++;
    }

    return NextResponse.json({ error: 'PDF zaman aşımı' }, { status: 500 });
  } catch (error: any) {
    console.error('Invoice error:', error);
    return NextResponse.json({ error: 'Fatura oluşturulamadı' }, { status: 500 });
  }
}
