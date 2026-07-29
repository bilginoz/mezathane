import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

// Web push göndericisi. VAPID anahtarları env'de yoksa (ör. yerel/derleme) sessizce devre dışı —
// hiçbir çağrı hata fırlatmaz, bildirim akışı bundan etkilenmez.
let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:bilgi@mezathane.tr', pub, priv);
    configured = true;
    return true;
  } catch {
    return false;
  }
}

// Bir kullanıcının TÜM kayıtlı cihazlarına push gönderir (site kapalı olsa bile).
// Best-effort: hata fırlatmaz; geçersiz (silinmiş/expired) abonelikleri temizler.
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!ensureConfigured()) return;
  let subs: { endpoint: string; p256dh: string; auth: string }[] = [];
  try {
    subs = await prisma.pushSubscription.findMany({
      where: { userId },
      select: { endpoint: true, p256dh: true, auth: true },
    });
  } catch {
    return;
  }
  if (subs.length === 0) return;

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
  });

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data
        );
      } catch (err: any) {
        // 404/410 → abonelik artık geçersiz, veritabanından temizle
        const code = err?.statusCode;
        if (code === 404 || code === 410) {
          try {
            await prisma.pushSubscription.delete({ where: { endpoint: s.endpoint } });
          } catch {
            /* yok sayılır */
          }
        }
      }
    })
  );
}
