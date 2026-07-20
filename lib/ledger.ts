import { prisma } from '@/lib/prisma';

const DEFAULT_KDV_RATE = 0.20;
const round = (n: number) => Math.round(n * 100) / 100;

export type LedgerRow = {
  id: string;
  date: string; // ISO
  description: string;
  sub?: string | null;
  borc: number;
  alacak: number;
  balance: number; // yürüyen bakiye (borç - alacak kümülatif)
  category?: string | null;
  paymentMethod?: string | null;
  bankName?: string | null;
  lotId?: string | null;
  lotNumber?: number | null;
  auctionTitle?: string | null;
  isManual: boolean;
  manualId?: string | null; // silme/düzenleme için
  isOverdue?: boolean;
  dueDate?: string | null;
  // Kargo/ödeme durumu (satıcı cari için)
  shippingStatus?: string | null;
  payoutCompleted?: boolean;
  buyerPaymentReceived?: boolean;
};

export type LedgerSummary = {
  totalBorc: number;
  totalAlacak: number;
  netBalance: number; // borç - alacak
  netAbs: number;
  netKind: 'debt' | 'credit' | 'zero';
  netLabel: string;
  soldCount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  overdueCount: number;
};

export type LedgerResult = {
  accountType: 'BUYER' | 'SELLER' | 'PLATFORM';
  header: Record<string, any>;
  rows: LedgerRow[];
  summary: LedgerSummary;
};

function finalize(
  accountType: 'BUYER' | 'SELLER' | 'PLATFORM',
  header: Record<string, any>,
  rows: LedgerRow[],
  extra: { soldCount: number; paidAmount: number; pendingAmount: number; overdueAmount: number; overdueCount: number }
): LedgerResult {
  // tarihe göre sırala (eskiden yeniye), sonra yürüyen bakiye hesapla
  rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let running = 0;
  let totalBorc = 0;
  let totalAlacak = 0;
  for (const r of rows) {
    running = round(running + r.borc - r.alacak);
    r.balance = running;
    totalBorc = round(totalBorc + r.borc);
    totalAlacak = round(totalAlacak + r.alacak);
  }
  const netBalance = round(totalBorc - totalAlacak);
  const netAbs = Math.abs(netBalance);
  let netKind: 'debt' | 'credit' | 'zero' = 'zero';
  let netLabel = '';

  if (accountType === 'BUYER') {
    if (netBalance > 0.009) { netKind = 'debt'; netLabel = 'Bu alıcının borcu var'; }
    else if (netBalance < -0.009) { netKind = 'credit'; netLabel = 'Bu alıcıya iade/avans borcumuz var'; }
    else { netLabel = 'Hesap kapalı — borç yok'; }
  } else if (accountType === 'SELLER') {
    // seller: alacak (kazanç) > borç (ödeme) => ona borçluyuz => netBalance negatif
    if (netBalance < -0.009) { netKind = 'debt'; netLabel = 'Bu satıcıya ödenecek'; }
    else if (netBalance > 0.009) { netKind = 'credit'; netLabel = 'Bu satıcıdan alacaklıyız'; }
    else { netLabel = 'Hesap kapalı — bakiye yok'; }
  } else {
    netKind = netBalance !== 0 ? 'credit' : 'zero';
    netLabel = 'Toplam komisyon geliri';
  }

  return {
    accountType,
    header,
    rows,
    summary: {
      totalBorc,
      totalAlacak,
      netBalance,
      netAbs,
      netKind,
      netLabel,
      ...extra,
    },
  };
}

async function getManualEntries(accountType: 'BUYER' | 'SELLER' | 'PLATFORM', ownerId: string | null) {
  const where: any = { accountType };
  if (accountType === 'BUYER') where.userId = ownerId;
  else if (accountType === 'SELLER') where.sellerId = ownerId;
  return prisma.ledgerEntry.findMany({ where, orderBy: { entryDate: 'asc' } });
}

const manualToRow = (e: any): LedgerRow => ({
  id: 'm_' + e.id,
  manualId: e.id,
  date: (e.entryDate ?? e.createdAt).toISOString(),
  description: e.description,
  sub: e.category ? categoryLabel(e.category) : null,
  borc: e.entryType === 'DEBIT' ? round(e.amount) : 0,
  alacak: e.entryType === 'CREDIT' ? round(e.amount) : 0,
  balance: 0,
  category: e.category,
  paymentMethod: e.paymentMethod,
  bankName: e.bankName,
  lotId: e.relatedLotId,
  isManual: true,
});

export function categoryLabel(c?: string | null): string {
  switch (c) {
    case 'tahsilat': return 'Tahsilat';
    case 'odeme': return 'Ödeme';
    case 'iade': return 'İade';
    case 'kesinti': return 'Kesinti';
    case 'avans': return 'Avans';
    case 'duzeltme': return 'Düzeltme';
    case 'komisyon': return 'Komisyon';
    case 'kargo': return 'Kargo';
    default: return 'Diğer';
  }
}

// ---------------- BUYER ----------------
export async function buildBuyerLedger(userId: string): Promise<LedgerResult | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, email: true, phone: true, isActive: true, createdAt: true },
  });
  if (!user) return null;

  const payments = await prisma.payment.findMany({
    where: { userId },
    include: {
      lot: {
        select: {
          id: true, lotNumber: true, title: true, soldPrice: true, currentPrice: true,
          auction: { select: { title: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const manual = await getManualEntries('BUYER', userId);
  const rows: LedgerRow[] = [];
  const now = Date.now();
  let soldCount = 0, paidAmount = 0, pendingAmount = 0, overdueAmount = 0, overdueCount = 0;

  for (const p of payments) {
    const saleAmount = round(p.amount || p.lot?.soldPrice || p.lot?.currentPrice || 0);
    if (saleAmount <= 0) continue;
    soldCount++;
    const desc = `${p.lot?.title ?? 'Ürün'} — ${p.lot?.auction?.title ?? 'Müzayede'}`;
    // BORÇ: kazanılan ürün
    const isPaid = p.buyerPaymentReceived || p.status === 'PAID';
    const overdue = !isPaid && !!p.dueDate && new Date(p.dueDate).getTime() < now;
    rows.push({
      id: 'sale_' + p.id,
      date: p.createdAt.toISOString(),
      description: desc,
      sub: 'Kazanılan ürün',
      borc: saleAmount,
      alacak: 0,
      balance: 0,
      category: 'satis',
      lotId: p.lot?.id,
      lotNumber: p.lot?.lotNumber,
      auctionTitle: p.lot?.auction?.title,
      isManual: false,
      isOverdue: overdue,
      dueDate: p.dueDate ? p.dueDate.toISOString() : null,
    });
    // kısmi tahsilatlar (manuel, relatedPaymentId eşleşen CREDIT)
    const partials = manual.filter((m: any) => m.relatedPaymentId === p.id && m.entryType === 'CREDIT');
    const paidViaManual = partials.reduce((s: number, m: any) => s + m.amount, 0);
    if (isPaid) {
      const remainder = round(saleAmount - paidViaManual);
      if (remainder > 0.01) {
        rows.push({
          id: 'paid_' + p.id,
          date: (p.paidAt ?? p.updatedAt).toISOString(),
          description: 'Ödeme alındı — ' + desc,
          sub: p.paymentMethod ? p.paymentMethod : 'Tahsilat',
          borc: 0,
          alacak: remainder,
          balance: 0,
          category: 'tahsilat',
          paymentMethod: p.paymentMethod,
          lotId: p.lot?.id,
          isManual: false,
        });
      }
      paidAmount = round(paidAmount + saleAmount);
    } else {
      pendingAmount = round(pendingAmount + saleAmount - paidViaManual);
      paidAmount = round(paidAmount + paidViaManual);
      if (overdue) { overdueAmount = round(overdueAmount + saleAmount - paidViaManual); overdueCount++; }
    }
  }

  // tüm manuel kayıtları ekle (kısmi tahsilat dahil, tek sefer)
  for (const m of manual) rows.push(manualToRow(m));

  return finalize('BUYER', {
    id: user.id, name: user.fullName, email: user.email, phone: user.phone,
    isActive: user.isActive, memberSince: user.createdAt.toISOString(),
  }, rows, { soldCount, paidAmount, pendingAmount, overdueAmount, overdueCount });
}

// ---------------- SELLER ----------------
export async function buildSellerLedger(sellerId: string): Promise<LedgerResult | null> {
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: sellerId },
    select: {
      id: true, companyName: true, taxOffice: true, taxNumber: true, iban: true,
      companyAddress: true, status: true,
      user: { select: { fullName: true, email: true, phone: true } },
    },
  });
  if (!seller) return null;

  const lots = await prisma.lot.findMany({
    where: { status: 'SOLD', auction: { sellerId } },
    select: {
      id: true, lotNumber: true, title: true, soldPrice: true, updatedAt: true, kdvRate: true,
      auction: { select: { title: true, commissionRate: true } },
      payments: { select: { id: true, payoutCompleted: true, buyerPaymentReceived: true, status: true, updatedAt: true, paymentMethod: true, shippingStatus: true, trackingNumber: true, trackingCompany: true, shippedAt: true, deliveredAt: true } },
    },
    orderBy: { updatedAt: 'asc' },
  });

  const manual = await getManualEntries('SELLER', sellerId);
  const rows: LedgerRow[] = [];
  let soldCount = 0, paidAmount = 0, pendingAmount = 0;

  for (const lot of lots) {
    if (!lot.soldPrice) continue;
    soldCount++;
    const rate = (lot.auction?.commissionRate ?? 15) / 100;
    const matrah = lot.soldPrice * rate;
    const lotKdvRate = (lot.kdvRate ?? 20) / 100;
    const kdv = matrah * lotKdvRate;
    const grossCommission = round(matrah + kdv);
    const netPayout = round(lot.soldPrice - grossCommission);
    const desc = `${lot.title} — ${lot.auction?.title ?? 'Müzayede'}`;
    const payment = lot.payments?.[0];
    // ALACAK: satıcının hakedişi
    const shippingLabel = payment?.shippingStatus === 'DELIVERED' ? 'Teslim edildi'
      : payment?.shippingStatus === 'SHIPPED' ? `Kargoda${payment?.trackingNumber ? ` (${payment.trackingCompany || ''} ${payment.trackingNumber})` : ''}`
      : 'Gönderim bekliyor';
    const paidLabel = payment?.buyerPaymentReceived ? 'Ödeme alındı' : 'Ödeme bekleniyor';
    rows.push({
      id: 'earn_' + lot.id,
      date: lot.updatedAt.toISOString(),
      description: desc,
      sub: `Satış ${fmt(lot.soldPrice)} · Komisyon ${fmt(grossCommission)} (KDV dahil) · ${paidLabel} · ${shippingLabel}`,
      borc: 0,
      alacak: netPayout,
      balance: 0,
      category: 'hakedis',
      lotId: lot.id,
      lotNumber: lot.lotNumber,
      auctionTitle: lot.auction?.title,
      isManual: false,
      shippingStatus: payment?.shippingStatus || 'PREPARING',
      payoutCompleted: payment?.payoutCompleted || false,
      buyerPaymentReceived: payment?.buyerPaymentReceived || false,
    });
    // satıcıya yapılan ödemeler (manuel odeme category ile eşleşen DEBIT)
    const payouts = manual.filter((m: any) => m.relatedPaymentId === payment?.id && m.entryType === 'DEBIT');
    const paidViaManual = payouts.reduce((s: number, m: any) => s + m.amount, 0);
    if (payment?.payoutCompleted) {
      const remainder = round(netPayout - paidViaManual);
      if (remainder > 0.01) {
        rows.push({
          id: 'payout_' + lot.id,
          date: (payment.updatedAt ?? lot.updatedAt).toISOString(),
          description: 'Satıcıya ödendi — ' + desc,
          sub: payment.paymentMethod ? payment.paymentMethod : 'Ödeme',
          borc: remainder,
          alacak: 0,
          balance: 0,
          category: 'odeme',
          paymentMethod: payment.paymentMethod,
          lotId: lot.id,
          isManual: false,
        });
      }
      paidAmount = round(paidAmount + netPayout);
    } else {
      pendingAmount = round(pendingAmount + netPayout - paidViaManual);
      paidAmount = round(paidAmount + paidViaManual);
    }
  }

  for (const m of manual) rows.push(manualToRow(m));

  return finalize('SELLER', {
    id: seller.id, name: seller.companyName, companyName: seller.companyName,
    email: seller.user?.email, phone: seller.user?.phone, contactName: seller.user?.fullName,
    taxOffice: seller.taxOffice, taxNumber: seller.taxNumber, iban: seller.iban,
    companyAddress: seller.companyAddress, status: seller.status,
  }, rows, { soldCount, paidAmount, pendingAmount, overdueAmount: 0, overdueCount: 0 });
}

// ---------------- PLATFORM ----------------
export async function buildPlatformLedger(): Promise<LedgerResult> {
  const lots = await prisma.lot.findMany({
    where: { status: 'SOLD' },
    select: {
      id: true, lotNumber: true, title: true, soldPrice: true, updatedAt: true, kdvRate: true,
      auction: { select: { title: true, commissionRate: true, seller: { select: { companyName: true } } } },
      payments: { select: { buyerPaymentReceived: true, status: true } },
    },
    orderBy: { updatedAt: 'asc' },
  });

  const rows: LedgerRow[] = [];
  let soldCount = 0, paidAmount = 0, pendingAmount = 0;

  for (const lot of lots) {
    if (!lot.soldPrice) continue;
    soldCount++;
    const rate = (lot.auction?.commissionRate ?? 15) / 100;
    const matrah = lot.soldPrice * rate;
    const lotKdvRate = (lot.kdvRate ?? 20) / 100;
    const kdv = matrah * lotKdvRate;
    const grossCommission = round(matrah + kdv);
    const payment = lot.payments?.[0];
    const collected = payment?.buyerPaymentReceived || payment?.status === 'PAID';
    if (collected) paidAmount = round(paidAmount + grossCommission);
    else pendingAmount = round(pendingAmount + grossCommission);
    rows.push({
      id: 'com_' + lot.id,
      date: lot.updatedAt.toISOString(),
      description: `${lot.title} — ${lot.auction?.title ?? 'Müzayede'}`,
      sub: `${lot.auction?.seller?.companyName ?? ''} · Komisyon (KDV dahil) ${collected ? '· Tahsil edildi' : '· Bekliyor'}`,
      borc: 0,
      alacak: grossCommission,
      balance: 0,
      category: 'komisyon',
      lotId: lot.id,
      lotNumber: lot.lotNumber,
      auctionTitle: lot.auction?.title,
      isManual: false,
    });
  }

  const manual = await getManualEntries('PLATFORM', null);
  for (const m of manual) rows.push(manualToRow(m));

  return finalize('PLATFORM', { id: 'platform', name: 'Mezathane (Platform)' }, rows,
    { soldCount, paidAmount, pendingAmount, overdueAmount: 0, overdueCount: 0 });
}

function fmt(n: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n) + '\u20ba';
}
