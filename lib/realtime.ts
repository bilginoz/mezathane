import Ably from 'ably';

let ablyClient: Ably.Rest | null = null;

function getAblyClient() {
  if (!ablyClient) {
    ablyClient = new Ably.Rest({ key: process.env.ABLY_API_KEY! });
  }
  return ablyClient;
}

// Canlı müzayede ekranlarına "bir şey değişti, tekrar veri çek" sinyali gönderir.
// Asıl veri Ably üzerinden taşınmaz — istemci bu sinyali alınca /api/live/[id]'den
// güncel veriyi normal yoldan çeker. Bu sayede tek doğru veri kaynağı korunur.
export async function triggerLiveUpdate(auctionId: string) {
  try {
    if (!process.env.ABLY_API_KEY) return; // Ably ayarlı değilse sessizce atla
    const channel = getAblyClient().channels.get(`auction-${auctionId}`);
    await channel.publish('update', {});
  } catch (error) {
    console.error('Ably publish error:', error);
  }
}
