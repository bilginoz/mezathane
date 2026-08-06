// Satış ödeme matematiği — TEK KAYNAK. check-live bu fonksiyonu kullanır; böylece ESCROW/DIRECT
// hesabı saf ve test edilebilir olur (bkz. lib/sale-math.test.ts).
//
// ESCROW (V1): platform satıcıdan komisyon alır; alıcı hizmet bedeli sabit %7 (platform geliri).
// DIRECT (V2): platform üründen komisyon almaz (0); alıcı komisyonu = SATICININ belirlediği oran,
//              tamamı doğrudan satıcıya. Her iki modelde de hizmet bedeli/komisyon KDV'si sabit %20.

export type SaleMode = 'ESCROW' | 'DIRECT';

const KDV_RATE = 0.20; // hizmet/komisyon KDV'si her zaman %20 (ürünün kendi KDV'sinden bağımsız)
const DEFAULT_PREMIUM_RATE = 7.0;

// Para değerlerini kuruşa (2 hane) yuvarla — kayan nokta gürültüsünü temizler (ör. 1400.0000000000002 → 1400).
const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface SalePaymentInput {
  mode: SaleMode;
  hammer: number;               // kazanan teklif (çekiç fiyatı, KDV dahil satış bedeli)
  sellerCommissionRate: number; // satıcının platform komisyon oranı (%) — ESCROW'da kullanılır
  sellerPremiumRate: number | null | undefined; // satıcının alıcı komisyon oranı (%) — DIRECT'te kullanılır
}

export interface SalePaymentResult {
  commissionAmount: number;    // platform-satıcı komisyonu (DIRECT'te 0)
  buyerPremiumRate: number;    // uygulanan alıcı komisyon/hizmet bedeli oranı (%)
  buyerPremiumAmount: number;  // alıcı komisyon tutarı
  buyerPremiumKDV: number;     // komisyon üzerinden %20 KDV
  totalAmount: number;         // alıcının ödeyeceği toplam
}

export interface ServiceFeeResult {
  serviceFeeAmount: number; // platforma borçlanılan hizmet bedeli (KDV hariç)
  serviceFeeKDV: number;    // hizmet bedelinin KDV'si (sabit %20)
}

// AŞAMA 3 (HİZMET_BEDELİ modeli, 2026-08-06): DIRECT'te para satıcıya gider, platform üründen
// pay almaz (commissionAmount=0). Bu modelde platform payını SONRADAN satıcıdan tahsil eder;
// bu fonksiyon o borcu hammer fiyatı üzerinden hesaplar (ESCROW'daki komisyon mantığının aynısı,
// sadece kesme değil borçlandırma).
export function computeServiceFee(hammer: number, serviceFeeRate: number): ServiceFeeResult {
  const serviceFeeAmount = round2(hammer * (serviceFeeRate / 100));
  const serviceFeeKDV = round2(serviceFeeAmount * KDV_RATE);
  return { serviceFeeAmount, serviceFeeKDV };
}

export function computeSalePayment(input: SalePaymentInput): SalePaymentResult {
  const isDirect = input.mode === 'DIRECT';

  // Platform (satıcı) komisyonu: DIRECT'te platform üründen pay almaz → 0.
  const commRate = isDirect ? 0 : (input.sellerCommissionRate ?? 0) / 100;
  const commissionAmount = round2(input.hammer * commRate);

  // Alıcı hizmet bedeli/komisyonu: ESCROW'da sabit %7; DIRECT'te satıcının kendi oranı.
  const buyerPremiumRate = isDirect ? (input.sellerPremiumRate ?? DEFAULT_PREMIUM_RATE) : DEFAULT_PREMIUM_RATE;
  const buyerPremiumAmount = round2(input.hammer * (buyerPremiumRate / 100));
  const buyerPremiumKDV = round2(buyerPremiumAmount * KDV_RATE);
  const totalAmount = round2(input.hammer + buyerPremiumAmount + buyerPremiumKDV);

  return { commissionAmount, buyerPremiumRate, buyerPremiumAmount, buyerPremiumKDV, totalAmount };
}
