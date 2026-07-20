import { prisma } from '@/lib/prisma';

// Varsayılan şablonlar — veritabanında yoksa bunlar kullanılır
const DEFAULT_TEMPLATES: Record<string, { name: string; subject: string; bodyHtml: string }> = {
  outbid: {
    name: 'Teklif Geçildi',
    subject: 'Teklifiniz Geçildi - {{lotTitle}}',
    bodyHtml: `<div style="font-family:Arial;max-width:600px;margin:0 auto;background:#1a1a1a;color:#fff;padding:30px;border-radius:10px;">
  <h2 style="color:#d4af37;">Teklifiniz Geçildi!</h2>
  <p>"{{lotTitle}}" için verdiğiniz teklif geçildi.</p>
  <p>Yeni en yüksek teklif: <strong style="color:#d4af37;">{{amount}}</strong></p>
  <a href="{{lotUrl}}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:15px;font-weight:bold;">Yeniden Teklif Ver</a>
</div>`,
  },
  auction_won: {
    name: 'Müzayede Kazanıldı',
    subject: 'Tebrikler! Müzayedeyi Kazandınız - {{lotTitle}}',
    bodyHtml: `<div style="font-family:Arial;max-width:600px;margin:0 auto;background:#1a1a1a;color:#fff;padding:30px;border-radius:10px;">
  <h2 style="color:#d4af37;">🎉 Tebrikler!</h2>
  <p>"{{lotTitle}}" müzayedesini kazandınız.</p>
  <p>Kazanan teklif: <strong style="color:#d4af37;">{{amount}}</strong></p>
  <p>Ödeme süreniz: <strong>{{paymentDays}} gün</strong></p>
  <a href="{{orderUrl}}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:15px;font-weight:bold;">Siparişlerime Git</a>
</div>`,
  },
  payment_reminder: {
    name: 'Ödeme Hatırlatması',
    subject: 'Ödeme Hatırlatması - {{lotTitle}}',
    bodyHtml: `<div style="font-family:Arial;max-width:600px;margin:0 auto;background:#1a1a1a;color:#fff;padding:30px;border-radius:10px;">
  <h2 style="color:#d4af37;">Ödeme Hatırlatması</h2>
  <p>"{{lotTitle}}" için ödemeniz beklenmektedir.</p>
  <p>Tutar: <strong style="color:#d4af37;">{{amount}}</strong></p>
  <p>Son ödeme tarihi: <strong>{{dueDate}}</strong></p>
  <a href="{{orderUrl}}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:15px;font-weight:bold;">Ödeme Yap</a>
</div>`,
  },
  watchlist_bid: {
    name: 'Favori Lot Teklif Bildirimi',
    subject: 'İzlediğiniz Lota Teklif - {{lotTitle}}',
    bodyHtml: `<div style="font-family:Arial;max-width:600px;margin:0 auto;background:#1a1a1a;color:#fff;padding:30px;border-radius:10px;">
  <h2 style="color:#d4af37;">İzlediğiniz Lota Teklif Geldi!</h2>
  <p>Merhaba {{userName}},</p>
  <p>"{{lotTitle}}" için yeni bir teklif verildi.</p>
  <p>Güncel fiyat: <strong style="color:#d4af37;">{{amount}}</strong></p>
  <a href="{{lotUrl}}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:15px;font-weight:bold;">Lotu İncele</a>
</div>`,
  },
  auction_start: {
    name: 'Müzayede Başladı',
    subject: 'Müzayede Başladı - {{auctionTitle}}',
    bodyHtml: `<div style="font-family:Arial;max-width:600px;margin:0 auto;background:#1a1a1a;color:#fff;padding:30px;border-radius:10px;">
  <h2 style="color:#d4af37;">Müzayede Başladı!</h2>
  <p>Merhaba {{userName}},</p>
  <p>"{{auctionTitle}}" müzayedesi başladı.</p>
  <a href="{{auctionUrl}}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:15px;font-weight:bold;">Müzayedeye Git</a>
</div>`,
  },
  order_status: {
    name: 'Sipariş Durumu',
    subject: 'Sipariş Durumu Güncellendi - {{lotTitle}}',
    bodyHtml: `<div style="font-family:Arial;max-width:600px;margin:0 auto;background:#1a1a1a;color:#fff;padding:30px;border-radius:10px;">
  <h2 style="color:#d4af37;">Sipariş Durumu Güncellendi</h2>
  <p>"{{lotTitle}}" siparişinizin durumu güncellendi.</p>
  <p>Yeni durum: <strong style="color:#d4af37;">{{status}}</strong></p>
  <a href="{{orderUrl}}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:15px;font-weight:bold;">Siparişi Görüntüle</a>
</div>`,
  },
  seller_application: {
    name: 'Yeni Satıcı Başvurusu',
    subject: 'Yeni Satıcı Başvurusu - {{companyName}}',
    bodyHtml: `<div style="font-family:Arial;max-width:600px;margin:0 auto;background:#1a1a1a;color:#fff;padding:30px;border-radius:10px;">
  <h2 style="color:#d4af37;">Yeni Satıcı Başvurusu</h2>
  <p><strong>{{companyName}}</strong> adlı müzayede evi başvuru yaptı.</p>
  <p>Başvuran: {{userName}} ({{userEmail}})</p>
  <a href="{{adminUrl}}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:15px;font-weight:bold;">Başvuruyu İncele</a>
</div>`,
  },
  password_reset: {
    name: 'Şifre Sıfırlama',
    subject: 'Şifre Sıfırlama - Mezathane',
    bodyHtml: `<div style="font-family:Arial;max-width:600px;margin:0 auto;background:#1a1a1a;color:#fff;padding:30px;border-radius:10px;">
  <h2 style="color:#d4af37;">Şifre Sıfırlama</h2>
  <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın.</p>
  <a href="{{resetUrl}}" style="display:inline-block;background:#d4af37;color:#000;padding:12px 24px;text-decoration:none;border-radius:6px;margin-top:15px;font-weight:bold;">Şifremi Sıfırla</a>
  <p style="margin-top:15px;font-size:12px;color:#888;">Bu bağlantı 1 saat geçerlidir.</p>
</div>`,
  },
};

/**
 * Veritabanından şablonu çeker, yoksa varsayılanı döndürür.
 * Değişkenleri ({{key}}) verilen values ile değiştirir.
 */
export async function getEmailTemplate(
  key: string,
  values: Record<string, string> = {}
): Promise<{ subject: string; body: string } | null> {
  try {
    // Önce veritabanından dene
    const dbTemplate = await prisma.emailTemplate.findUnique({ where: { key } });
    
    let subject: string;
    let bodyHtml: string;
    
    if (dbTemplate && dbTemplate.isActive) {
      subject = dbTemplate.subject;
      bodyHtml = dbTemplate.bodyHtml;
    } else if (DEFAULT_TEMPLATES[key]) {
      subject = DEFAULT_TEMPLATES[key].subject;
      bodyHtml = DEFAULT_TEMPLATES[key].bodyHtml;
    } else {
      return null;
    }
    
    // Değişkenleri değiştir
    for (const [k, v] of Object.entries(values)) {
      const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
      subject = subject.replace(regex, v);
      bodyHtml = bodyHtml.replace(regex, v);
    }
    
    return { subject, body: bodyHtml };
  } catch (error) {
    console.error('Email template error:', error);
    // Fallback to defaults
    const def = DEFAULT_TEMPLATES[key];
    if (!def) return null;
    let subject = def.subject;
    let bodyHtml = def.bodyHtml;
    for (const [k, v] of Object.entries(values)) {
      const regex = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
      subject = subject.replace(regex, v);
      bodyHtml = bodyHtml.replace(regex, v);
    }
    return { subject, body: bodyHtml };
  }
}

/**
 * Tüm varsayılan şablonları veritabanına yazar (yoksa)
 */
export async function seedDefaultTemplates() {
  for (const [key, tmpl] of Object.entries(DEFAULT_TEMPLATES)) {
    await prisma.emailTemplate.upsert({
      where: { key },
      update: {},
      create: {
        key,
        name: tmpl.name,
        subject: tmpl.subject,
        bodyHtml: tmpl.bodyHtml,
      },
    });
  }
}

export { DEFAULT_TEMPLATES };
