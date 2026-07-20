export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function toCsv(headers: string[], rows: any[][]): string {
  const bom = '\uFEFF'; // UTF-8 BOM for Turkish characters in Excel
  const headerLine = headers.map(escapeCsv).join(',');
  const dataLines = rows.map(row => row.map(escapeCsv).join(','));
  return bom + [headerLine, ...dataLines].join('\n');
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if ((session?.user as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // users, auctions, sales, lots, disputes

    let csv = '';
    let filename = 'export.csv';

    switch (type) {
      case 'users': {
        const users = await prisma.user.findMany({
          select: { fullName: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        });
        csv = toCsv(
          ['Ad Soyad', 'E-posta', 'Telefon', 'Rol', 'Aktif', 'Kayıt Tarihi'],
          users.map(u => [u.fullName, u.email, u.phone, u.role, u.isActive ? 'Evet' : 'Hayır', u.createdAt.toISOString().split('T')[0]])
        );
        filename = 'kullanicilar.csv';
        break;
      }
      case 'auctions': {
        const auctions = await prisma.auction.findMany({
          include: { seller: { include: { user: { select: { fullName: true, email: true } } } }, lots: true },
          orderBy: { createdAt: 'desc' },
        });
        csv = toCsv(
          ['Müzayede', 'Satıcı', 'Durum', 'Lot Sayısı', 'Başlangıç', 'Bitiş', 'Komisyon %', 'Oluşturma'],
          auctions.map(a => [
            a.title, a.seller?.user?.fullName ?? '', a.status, a.lots.length,
            a.startDate.toISOString().split('T')[0], a.endDate?.toISOString().split('T')[0] ?? '',
            a.commissionRate, a.createdAt.toISOString().split('T')[0],
          ])
        );
        filename = 'muzayedeler.csv';
        break;
      }
      case 'sales': {
        const payments = await prisma.payment.findMany({
          include: {
            user: { select: { fullName: true, email: true } },
            lot: { select: { title: true, lotNumber: true, auction: { select: { title: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        });
        csv = toCsv(
          ['Lot', 'Müzayede', 'Alıcı', 'Çekiç Fiyatı', 'Satıcı Komisyonu', 'Hizmet Bedeli', 'Hizmet Bedeli KDV', 'Toplam', 'Durum', 'Ödeme Yöntemi', 'Tarih'],
          payments.map(p => [
            p.lot?.title ?? '', p.lot?.auction?.title ?? '', p.user?.fullName ?? '',
            p.amount, p.commissionAmount, (p as any).buyerPremiumAmount ?? 0, (p as any).buyerPremiumKDV ?? 0, p.totalAmount, p.status, p.paymentMethod ?? '',
            p.createdAt.toISOString().split('T')[0],
          ])
        );
        filename = 'satislar.csv';
        break;
      }
      case 'lots': {
        const lots = await prisma.lot.findMany({
          include: {
            auction: { select: { title: true } },
            category: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        csv = toCsv(
          ['Lot No', 'Başlık', 'Müzayede', 'Kategori', 'Başlangıç Fiyat', 'Güncel Fiyat', 'Durum', 'Teklif', 'Görüntülenme'],
          lots.map(l => [
            l.lotNumber, l.title, l.auction?.title ?? '', l.category?.name ?? '',
            l.startingPrice, l.currentPrice, l.status, l.bidCount, l.viewCount,
          ])
        );
        filename = 'lotlar.csv';
        break;
      }
      case 'disputes': {
        const disputes = await prisma.dispute.findMany({
          include: {
            reporter: { select: { fullName: true, email: true } },
            against: { select: { fullName: true, email: true } },
            lot: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        csv = toCsv(
          ['Şikayçi', 'Şikayet Edilen', 'Lot', 'Neden', 'Durum', 'Tarih', 'Çözüm'],
          disputes.map(d => [
            d.reporter?.fullName ?? '', d.against?.fullName ?? '', d.lot?.title ?? '',
            d.reason, d.status, d.createdAt.toISOString().split('T')[0], d.resolution ?? '',
          ])
        );
        filename = 'anlasmmazliklar.csv';
        break;
      }
      case 'finance': {
        const fPayments = await prisma.payment.findMany({
          include: {
            user: { select: { fullName: true, email: true, phone: true } },
            lot: { include: { auction: { include: { seller: { include: { user: { select: { fullName: true } } } } } } } },
          },
          orderBy: { createdAt: 'desc' },
        });
        csv = toCsv(
          ['Lot', 'Müzayede', 'Satıcı', 'Alıcı', 'Alıcı Tel', 'Satış Fiyatı', 'Komisyon Oranı %', 'Komisyon Matrah', 'KDV', 'Brüt Komisyon', 'Satıcı Hak Edişi', 'Durum', 'Alıcı Ödedi', 'Satıcıya Ödendi', 'Ödeme Yöntemi', 'Tarih'],
          fPayments.map(p => {
            const lot = p.lot as any;
            const rate = lot?.auction?.commissionRate ?? 10;
            const salePrice = lot?.salePrice ?? p.amount;
            const matrah = Math.round(salePrice * rate) / 100;
            const lotKdvRate = (lot?.kdvRate ?? 20) / 100;
            const kdv = Math.round(matrah * lotKdvRate * 100) / 100;
            const gross = Math.round((matrah + kdv) * 100) / 100;
            const payout = Math.round((salePrice - gross) * 100) / 100;
            return [
              lot?.title ?? '', lot?.auction?.title ?? '',
              lot?.auction?.seller?.user?.fullName ?? '',
              p.user?.fullName ?? '', p.user?.phone ?? '',
              salePrice, rate, matrah, kdv, gross, payout,
              p.status, p.buyerPaymentReceived ? 'Evet' : 'Hayır',
              p.payoutCompleted ? 'Evet' : 'Hayır',
              p.paymentMethod ?? '', p.createdAt.toISOString().split('T')[0],
            ];
          })
        );
        filename = 'finans_detay.csv';
        break;
      }
      case 'audit': {
        const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 });
        csv = toCsv(
          ['Tarih', 'Kullanıcı', 'İşlem', 'Varlık', 'Varlık ID', 'Detay'],
          logs.map(l => [
            l.createdAt.toISOString().replace('T', ' ').slice(0, 19),
            l.userName ?? '', l.action, l.entity ?? '', l.entityId ?? '',
            typeof l.details === 'string' ? l.details : JSON.stringify(l.details ?? ''),
          ])
        );
        filename = 'denetim_kayitlari.csv';
        break;
      }
      default:
        return NextResponse.json({ error: 'Geçersiz export tipi' }, { status: 400 });
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Dışa aktarılamadı' }, { status: 500 });
  }
}
