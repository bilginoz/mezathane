import crypto from 'crypto';

/*
  RFC 6238 TOTP (Time-based One-Time Password) — bağımlılıksız, Node crypto ile.
  Authenticator uygulamalarıyla (Google Authenticator, Authy, 1Password vb.) uyumlu:
  SHA-1, 30 saniye adım, 6 hane.
*/

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// Rastgele base32 secret üret (varsayılan 20 bayt = 160 bit)
export function generateSecret(bytes = 20): string {
  const buf = crypto.randomBytes(bytes);
  return base32Encode(buf);
}

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// Belirli bir sayaç için HOTP değeri
function hotp(secret: Buffer, counter: number, digits = 6): string {
  const buf = Buffer.alloc(8);
  // 64-bit big-endian counter
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 10 ** digits).toString().padStart(digits, '0');
}

// Şimdiki zaman için TOTP üret
export function generateTOTP(base32Secret: string, step = 30, digits = 6, forTime = Date.now()): string {
  const counter = Math.floor(forTime / 1000 / step);
  return hotp(base32Decode(base32Secret), counter, digits);
}

// Kullanıcının girdiği kodu doğrula (±window adım toleransı — saat kayması için)
export function verifyTOTP(token: string, base32Secret: string, window = 1, step = 30, digits = 6): boolean {
  if (!token || !/^\d{6}$/.test(token.trim())) return false;
  const clean = token.trim();
  const secret = base32Decode(base32Secret);
  const counter = Math.floor(Date.now() / 1000 / step);
  for (let w = -window; w <= window; w++) {
    const candidate = hotp(secret, counter + w, digits);
    // Sabit zamanlı karşılaştırma
    if (candidate.length === clean.length &&
        crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(clean))) {
      return true;
    }
  }
  return false;
}

// Authenticator uygulamasına eklemek için otpauth:// URI'si
export function otpauthURL(base32Secret: string, accountLabel: string, issuer = 'Mezathane.tr'): string {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  const params = new URLSearchParams({
    secret: base32Secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
