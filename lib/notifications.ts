import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/mailer';

// Kullanıcının bildirim tercihini kontrol et
export async function checkNotificationPreference(
  userId: string,
  channel: 'email' | 'inApp',
  type: 'Outbid' | 'AuctionWon' | 'PaymentReminder' | 'WatchlistBid' | 'AuctionStart' | 'OrderStatus' | 'LiveAuction'
): Promise<boolean> {
  try {
    const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
    if (!prefs) return true; // Varsayılan: açık
    const key = `${channel}${type}` as keyof typeof prefs;
    const value = prefs[key];
    return typeof value === 'boolean' ? value : true;
  } catch {
    return true; // Hata durumunda varsayılan: açık
  }
}

// Uygulama içi bildirim oluştur (tercih kontrollü)
export async function createInAppNotification(options: {
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  preferenceType?: 'Outbid' | 'AuctionWon' | 'WatchlistBid' | 'AuctionStart' | 'OrderStatus' | 'LiveAuction';
}) {
  try {
    // Tercih kontrolü
    if (options.preferenceType) {
      const allowed = await checkNotificationPreference(options.userId, 'inApp', options.preferenceType);
      if (!allowed) return null;
    }
    return await prisma.notification.create({
      data: {
        userId: options.userId,
        title: options.title,
        message: options.message,
        type: options.type,
        link: options.link,
      },
    });
  } catch (error) {
    console.error('In-app notification error:', error);
    return null;
  }
}

// E-posta bildirimi gönder (tercih kontrollü)
export async function sendCheckedNotificationEmail(options: {
  userId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  preferenceType: 'Outbid' | 'AuctionWon' | 'PaymentReminder' | 'WatchlistBid' | 'AuctionStart' | 'OrderStatus' | 'LiveAuction';
}) {
  try {
    const allowed = await checkNotificationPreference(options.userId, 'email', options.preferenceType);
    if (!allowed) return { success: true, skipped: true };
    return await sendNotificationEmail({
      recipientEmail: options.recipientEmail,
      subject: options.subject,
      body: options.body,
    });
  } catch (error) {
    console.error('Checked email notification error:', error);
    return { success: false };
  }
}

export async function sendNotificationEmail(options: {
  recipientEmail: string;
  subject: string;
  body: string;
  replyTo?: string;
}) {
  return sendEmail({
    to: options.recipientEmail,
    subject: options.subject,
    html: options.body,
    replyTo: options.replyTo,
  });
}
