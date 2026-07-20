/**
 * IBAN doğrulama yardımcı fonksiyonları
 * - FORMAT kontrolü: TR + 24 rakam = toplam 26 karakter
 * - CHECKSUM kontrolü: ISO 7064 MOD-97 algoritması
 * Tamamen yerel hesaplama, harici API gerekmez.
 */

/** Boşlukları temizleyip büyük harfe çevirir */
export function normalizeIBAN(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

/**
 * TR IBAN format kontrolü
 * TR + 2 kontrol rakamı + 5 banka kodu + 1 anahtar + 16 hesap no = 26 karakter
 * Genel kural: "TR" ile başlayan, toplam 26 karakter, TR'den sonra hepsi rakam.
 */
export function isValidIBANFormat(iban: string): boolean {
  const normalized = normalizeIBAN(iban);
  // TR + 24 rakam
  return /^TR\d{24}$/.test(normalized);
}

/**
 * ISO 7064 MOD-97 checksum doğrulaması
 * Algoritma:
 *  1. İlk 4 karakteri (ülke kodu + kontrol rakamları) sona al
 *  2. Her harfi sayısal karşılığına çevir (A=10, B=11, ... Z=35)
 *  3. Elde edilen büyük sayının 97'ye bölümünden kalanın 1 olması gerekir
 */
export function isValidIBANChecksum(iban: string): boolean {
  const normalized = normalizeIBAN(iban);
  if (normalized.length < 5) return false;

  // İlk 4 karakteri sona taşı
  const rearranged = normalized.slice(4) + normalized.slice(0, 4);

  // Harfleri sayıya çevir (A=10 ... Z=35)
  let numericStr = '';
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    if (code >= 48 && code <= 57) {
      // Rakam
      numericStr += ch;
    } else if (code >= 65 && code <= 90) {
      // Harf → 10-35
      numericStr += (code - 55).toString();
    } else {
      return false; // Geçersiz karakter
    }
  }

  // Büyük sayıyı 97'ye böl (BigInt yerine parçalı mod hesabı — tarayıcı uyumluluğu için)
  let remainder = 0;
  for (const digit of numericStr) {
    remainder = (remainder * 10 + parseInt(digit, 10)) % 97;
  }

  return remainder === 1;
}

export type IBANValidationResult =
  | { valid: true; normalized: string }
  | { valid: false; error: string };

/**
 * Tam IBAN doğrulaması: format + checksum
 * Başarılıysa normalize edilmiş IBAN'ı döndürür.
 */
export function validateIBAN(raw: string): IBANValidationResult {
  if (!raw || !raw.trim()) {
    return { valid: false, error: 'IBAN boş olamaz' };
  }

  const normalized = normalizeIBAN(raw);

  if (!isValidIBANFormat(normalized)) {
    return {
      valid: false,
      error: 'Geçersiz IBAN formatı. TR ile başlayan 26 karakterlik (TR + 24 rakam) bir IBAN giriniz.',
    };
  }

  if (!isValidIBANChecksum(normalized)) {
    return {
      valid: false,
      error: 'Girilen IBAN numarası geçerli değil, lütfen kontrol edin.',
    };
  }

  return { valid: true, normalized };
}
