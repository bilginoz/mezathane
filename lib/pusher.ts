import Pusher from 'pusher';

let pusherServer: Pusher | null = null;

function getPusherServer() {
  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return pusherServer;
}

// Canlı müzayede ekranlarına "bir şey değişti, tekrar veri çek" sinyali gönderir.
// Asıl veri Pusher üzerinden taşınmaz — istemci bu sinyali alınca /api/live/[id]'den
// güncel veriyi normal yoldan çeker. Bu sayede tek doğru veri kaynağı korunur.
export async function triggerLiveUpdate(auctionId: string) {
  try {
    if (!process.env.PUSHER_APP_ID) return; // Pusher ayarlı değilse sessizce atla
    await getPusherServer().trigger(`auction-${auctionId}`, 'update', {});
  } catch (error) {
    console.error('Pusher trigger error:', error);
  }
}
