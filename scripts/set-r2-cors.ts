/**
 * set-r2-cors.ts — R2 (ana/public) kovasına tarayıcıdan yükleme için CORS ayarı yazar.
 *
 * SORUN: R2 kovasında CORS tanımlı olmadığından tarayıcı, imzalı URL'e PUT ederken
 * engelleniyordu ("Görsel yüklenemedi"). Bu betik GET/PUT için site kaynağına izin verir.
 * Bir kez çalıştırılması yeterli; tüm yüklemeleri (kategori, site logosu, satıcı belgeleri) düzeltir.
 *
 * Çalıştırma (R2 kimlik bilgileri gerekir):
 *   .env.local içine R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, AWS_BUCKET_NAME koy,
 *   sonra: DOTENV_CONFIG_PATH=.env.local npx tsx --require dotenv/config scripts/set-r2-cors.ts
 */
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';

const bucket = process.env.AWS_BUCKET_NAME ?? '';
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

async function main() {
  if (!bucket || !process.env.R2_ENDPOINT) {
    console.error('Eksik env: AWS_BUCKET_NAME / R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY');
    process.exit(1);
  }
  await s3.send(new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ['https://www.mezathane.tr', 'https://mezathane.tr'],
          AllowedMethods: ['GET', 'PUT'],
          AllowedHeaders: ['*'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }));
  console.log(`✓ CORS ayarı yazıldı: ${bucket}`);
  const cur = await s3.send(new GetBucketCorsCommand({ Bucket: bucket }));
  console.log('Mevcut CORS:', JSON.stringify(cur.CORSRules, null, 2));
}

main().catch((e) => { console.error('HATA:', e); process.exit(1); });
