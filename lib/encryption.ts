import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY eksik veya geçersiz (64 hex karakter olmalı)');
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Hassas veriyi AES-256-GCM ile şifreler.
 * Dönen format: iv(hex):tag(hex):ciphertext(hex)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * AES-256-GCM ile şifrelenmiş veriyi çözer.
 * Giriş formatı: iv(hex):tag(hex):ciphertext(hex)
 * Eğer veri şifreli değilse (eski düzensiz veri) olduğu gibi döner (geriye uyumluluk).
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return '';
  // Eski şifresiz veriyi kontrol et (sadece rakam, 11 haneli TC Kimlik No gibi)
  if (/^\d{1,20}$/.test(ciphertext)) return ciphertext;
  const parts = ciphertext.split(':');
  if (parts.length !== 3) return ciphertext; // Şifrelenmemiş veri
  try {
    const key = getKey();
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return ciphertext; // Çözülemezse olduğu gibi dön (eski veri)
  }
}

/**
 * TC Kimlik No'yu maskeleyerek gösterir.
 * Örnek: "12345678901" -> "123****8901"
 */
export function maskTcKimlik(tc: string): string {
  if (!tc || tc.length < 11) return tc || '';
  const plain = decrypt(tc);
  if (plain.length < 11) return plain;
  return plain.substring(0, 3) + '****' + plain.substring(7);
}
