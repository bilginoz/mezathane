/**
 * Mesajlarda iletişim bilgisi paylaşımını tespit eden filtre.
 * Platform dışı satış girişimlerini engellemek için kullanılır.
 */

// Telefon numarası desenleri (Türk ve uluslararası)
const PHONE_PATTERNS = [
  /(?:\+?90|0)?\s*[\(\-]?\s*5\d{2}\s*[\)\-]?\s*\d{3}\s*[\-]?\s*\d{2}\s*[\-]?\s*\d{2}/g, // Türk cep: 05xx xxx xx xx
  /(?:\+?90|0)?\s*[\(\-]?\s*[234]\d{2}\s*[\)\-]?\s*\d{3}\s*[\-]?\s*\d{2}\s*[\-]?\s*\d{2}/g, // Türk sabit
  /\b\d{10,13}\b/g, // Genel uzun numara
];

// E-posta deseni
const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi;

// Sosyal medya ve mesajlaşma uygulamaları
const SOCIAL_KEYWORDS = [
  'whatsapp', 'wp', 'telegram', 'instagram', 'insta',
  'facebook', 'fb', 'twitter', 'tiktok', 'youtube',
  'snapchat', 'signal', 'viber', 'bip',
  'sahibinden', 'letgo', 'dolap', 'n11', 'trendyol',
  'hepsiburada', 'gittigidiyor',
];

// "Beni ara", "numaramı ver" gibi ifadeler
const CONTACT_PHRASES = [
  'beni ara', 'numaram', 'telefonum', 'mailem', 'mailim',
  'eposta', 'e-posta', 'iletişim', 'ulaş bana',
  'dışarıdan', 'dışardan', 'platform dışı', 'platformsuz',
  'komisyonsuz', 'komisyon vermeden', 'aradan çıkar',
  'direkt', 'doğrudan iletişim',
];

export interface FilterResult {
  blocked: boolean;
  reason?: string;
  detectedContent?: string;
}

export function checkMessageForContactInfo(message: string): FilterResult {
  if (!message) return { blocked: false };

  const normalizedMessage = message
    .toLowerCase()
    .replace(/[ıİ]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o');

  // 1. E-posta kontrolü
  const emailMatch = message.match(EMAIL_PATTERN);
  if (emailMatch) {
    return {
      blocked: true,
      reason: 'Mesajınızda e-posta adresi tespit edildi. Platform güvenliği için mesajlarda iletişim bilgisi paylaşılamaz.',
      detectedContent: emailMatch[0],
    };
  }

  // 2. Telefon numarası kontrolü
  for (const pattern of PHONE_PATTERNS) {
    const phoneMatch = message.match(pattern);
    if (phoneMatch) {
      // Lot numarası veya fiyat olabilecek kısa sayıları atla
      const cleaned = phoneMatch[0].replace(/\D/g, '');
      if (cleaned.length >= 10) {
        return {
          blocked: true,
          reason: 'Mesajınızda telefon numarası tespit edildi. Platform güvenliği için mesajlarda iletişim bilgisi paylaşılamaz.',
          detectedContent: phoneMatch[0],
        };
      }
    }
  }

  // 3. Sosyal medya uygulamaları
  for (const keyword of SOCIAL_KEYWORDS) {
    if (normalizedMessage.includes(keyword)) {
      return {
        blocked: true,
        reason: `Mesajınızda harici platform referansı ("${keyword}") tespit edildi. Tüm iletişim platform üzerinden yapılmalıdır.`,
        detectedContent: keyword,
      };
    }
  }

  // 4. Platform dışı iletişim teşviki
  for (const phrase of CONTACT_PHRASES) {
    if (normalizedMessage.includes(phrase)) {
      return {
        blocked: true,
        reason: 'Mesajınızda platform dışı iletişim girişimi tespit edildi. Güvenliğiniz için tüm iletişim platform üzerinden yapılmalıdır.',
        detectedContent: phrase,
      };
    }
  }

  return { blocked: false };
}
