/**
 * TC Kimlik No doğrulama algoritması
 * 11 haneli, ilk hane 0 olamaz
 * 10. hane = ((1,3,5,7,9. haneler toplamı * 7) - (2,4,6,8. haneler toplamı)) % 10
 * 11. hane = (ilk 10 hanenin toplamı) % 10
 */
export function validateTCKimlikNo(tc: string): boolean {
  if (!tc || tc.length !== 11) return false;
  if (!/^\d{11}$/.test(tc)) return false;
  if (tc[0] === '0') return false;

  const digits = tc.split('').map(Number);

  // 10. hane kontrolü
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const digit10 = ((oddSum * 7) - evenSum) % 10;
  if (digit10 < 0 ? digit10 + 10 : digit10 !== digits[9]) return false;

  // 11. hane kontrolü
  const first10Sum = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  if (first10Sum % 10 !== digits[10]) return false;

  return true;
}
