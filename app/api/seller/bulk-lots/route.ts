export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { nextLotCode } from '@/lib/lot-code';
import ExcelJS from 'exceljs';
import { parseCSV } from '@/lib/parse-csv';

// Durum/kondisyon değerini tekil lot formundaki seçeneklere hizala.
const CONDITION_OPTIONS = ['Mükemmel', 'Çok İyi', 'İyi', 'Orta', 'Restore Edilmiş'];
function normalizeCondition(raw: string | undefined | null): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const match = CONDITION_OPTIONS.find(
    (o) => o.toLocaleLowerCase('tr') === value.toLocaleLowerCase('tr')
  );
  return match ?? value;
}

// KDV oranı tekil lot formundaki üç sabit seçenekle sınırlı; boşsa/tanımsızsa varsayılan %20.
const KDV_RATE_OPTIONS = [20, 10, 1];
function normalizeKdvRate(raw: string | number | undefined | null): number {
  if (typeof raw === 'number') return KDV_RATE_OPTIONS.includes(raw) ? raw : 20;
  const value = raw?.trim().replace('%', '').replace(',', '.');
  if (!value) return 20;
  const n = parseFloat(value);
  return KDV_RATE_OPTIONS.includes(n) ? n : 20;
}

// Kargo tipi: "Alıcı Öder" (varsayılan) / "Ücretsiz". Tekil lot formundaki iki seçenekle aynı.
function normalizeShippingType(raw: string | undefined | null): 'BUYER_PAYS' | 'FREE_SELLER' {
  const value = raw?.trim().toLocaleLowerCase('tr') ?? '';
  if (value.startsWith('ücretsiz') || value.startsWith('ucretsiz') || value === 'free_seller') return 'FREE_SELLER';
  return 'BUYER_PAYS';
}

function toNumberOrNull(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const n = parseFloat(String(raw).replace(/[^0-9.,]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

// GET: Örnek şablonu indir (.xlsx — Excel/Numbers/Google E-Tablolar'da doğrudan açılır)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Lotlar');
    // Not: yeni sütunlar hep EN SONA eklenir; eski, daha az sütunlu dosyalar bu yüzden
    // çalışmaya devam eder (eksik sütunlar boş/varsayılan kabul edilir).
    sheet.addRow([
      'Lot Adı', 'Açıklama', 'Notlar', 'Kategori', 'Başlangıç Fiyatı', 'Tahmini Fiyat',
      'Görsel URL (isteğe bağlı, "|" ile çoklu)', 'Durum', 'Menşe', 'Min. Artış Tutarı',
      'KDV Oranı', 'Kargo Tipi', 'Tahmini Kargo Ücreti', 'Restorasyon Beyanı',
      'Görsel Dosya Adları (virgülle ayırın, ör: vazo1, vazo2)',
    ]);
    sheet.addRow([
      'Antika Vazo', 'Osmanlı dönemi vazo', 'İyi durumda', 'Antika', 5000, 8000,
      '', 'Çok İyi', 'Aile koleksiyonundan, 1990 İstanbul', '', 20, 'Alıcı Öder', 200, '',
      'vazo1, vazo2',
    ]);
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((col) => { col.width = 22; });

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="lot-sablonu.xlsx"',
      },
    });
  } catch (e) {
    console.error('Template error:', e);
    return NextResponse.json({ error: 'Şablon oluşturulamadı' }, { status: 500 });
  }
}

type NormalizedLot = {
  title: string;
  description: string | null;
  notes: string | null;
  categoryName: string;
  startingPriceStr: string;
  estimatedPriceStr: string | null;
  imageUrls: string[];
  condition: string | null;
  provenance: string | null;
  customBidIncrementStr: string | null;
  kdvRateRaw: string | number | null;
  shippingTypeRaw: string | null;
  estimatedShippingStr: string | null;
  restorationNote: string | null;
};

// POST: Bulk import — YENİ akış: istemci şablonu (xlsx/csv) kendi ayrıştırır, fotoğrafları
// kendi yükler (presigned + R2), dosya adı eşleştirmesini kendi yapar ve HAZIR bir `lots` dizisi
// gönderir (images zaten çözülmüş URL listesi olarak gelir). ESKİ akış (`csvContent`, ham metin,
// tek "Görsel URL" sütunu) geriye dönük uyumluluk için hâlâ çalışır — hiçbir şey silinmedi.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller || seller.status !== 'APPROVED') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

    const body = await request.json();
    const { auctionId, csvContent, lots: incomingLots } = body;

    if (!auctionId || (!csvContent && !incomingLots)) {
      return NextResponse.json({ error: 'Müzayede ID ve lot verisi gerekli' }, { status: 400 });
    }

    const auction = await prisma.auction.findFirst({ where: { id: auctionId, sellerId: seller.id } });
    if (!auction) return NextResponse.json({ error: 'Müzayede bulunamadı' }, { status: 404 });
    if (auction.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Toplu lot yükleme sadece taslak durumundaki müzayedelerde yapılabilir.' }, { status: 400 });
    }

    const currentLotCount = await prisma.lot.count({ where: { auctionId } });

    // ====== Girdiyi tek bir ortak biçime (NormalizedLot[]) indirge ======
    let normalized: NormalizedLot[];
    if (Array.isArray(incomingLots)) {
      // YENİ akış: istemci zaten satırları ve görsel URL'lerini çözmüş.
      normalized = incomingLots.map((l: any): NormalizedLot => ({
        title: l.title || '',
        description: l.description || null,
        notes: l.notes || null,
        categoryName: l.categoryName || '',
        startingPriceStr: String(l.startingPrice ?? ''),
        estimatedPriceStr: l.estimatedPrice != null ? String(l.estimatedPrice) : null,
        imageUrls: Array.isArray(l.imageUrls) ? l.imageUrls.filter((u: any) => typeof u === 'string' && u.trim()).slice(0, 6) : [],
        condition: normalizeCondition(l.condition),
        provenance: l.provenance?.trim() ? l.provenance.trim() : null,
        customBidIncrementStr: l.customBidIncrement != null ? String(l.customBidIncrement) : null,
        kdvRateRaw: l.kdvRate ?? null,
        shippingTypeRaw: l.shippingType ?? null,
        estimatedShippingStr: l.estimatedShipping != null ? String(l.estimatedShipping) : null,
        restorationNote: l.restorationNote?.trim() ? l.restorationNote.trim() : null,
      }));
    } else {
      // ESKİ akış: ham CSV metni, tek "Görsel URL" sütunu ("|" ile çoklu).
      const rows = parseCSV(csvContent);
      if (rows.length < 2) {
        return NextResponse.json({ error: 'CSV dosyası en az bir veri satırı içermelidir' }, { status: 400 });
      }
      const dataRows = rows.slice(1);
      normalized = dataRows.map((row): NormalizedLot => ({
        title: row[0] || '',
        description: row[1] || null,
        notes: row[2] || null,
        categoryName: row[3] || '',
        startingPriceStr: row[4] || '',
        estimatedPriceStr: row[5] || null,
        imageUrls: (row[6] || '').split('|').map((s) => s.trim()).filter(Boolean).slice(0, 6),
        condition: normalizeCondition(row[7]),
        provenance: row[8]?.trim() ? row[8].trim() : null,
        customBidIncrementStr: row[9] || null,
        kdvRateRaw: row[10] || null,
        shippingTypeRaw: row[11] || null,
        estimatedShippingStr: row[12] || null,
        restorationNote: row[13]?.trim() ? row[13].trim() : null,
      }));
    }

    if (currentLotCount + normalized.length > 30) {
      return NextResponse.json({
        error: `Müzayedede toplam en fazla 30 lot olabilir. Mevcut: ${currentLotCount}, eklenmek istenen: ${normalized.length}`,
      }, { status: 400 });
    }

    const categories = await prisma.category.findMany({ where: { isActive: true } });
    const categoryMap = new Map<string, string>();
    categories.forEach((c) => {
      categoryMap.set(c.name.toLowerCase(), c.id);
      categoryMap.set(c.slug.toLowerCase(), c.id);
    });

    const lastLot = await prisma.lot.findFirst({ where: { auctionId }, orderBy: { lotNumber: 'desc' } });
    let nextLotNumber = (lastLot?.lotNumber ?? 0) + 1;
    let nextSortOrder = (lastLot?.sortOrder ?? 0) + 1;

    const results: { success: number; errors: { row: number; message: string }[] } = { success: 0, errors: [] };

    for (let i = 0; i < normalized.length; i++) {
      const l = normalized[i];
      const rowNum = i + 2; // 1-based + başlık satırı

      if (!l.title) {
        results.errors.push({ row: rowNum, message: 'Lot adı boş olamaz' });
        continue;
      }

      const startingPrice = toNumberOrNull(l.startingPriceStr);
      if (startingPrice === null || startingPrice <= 0) {
        results.errors.push({ row: rowNum, message: `Geçersiz başlangıç fiyatı: "${l.startingPriceStr}"` });
        continue;
      }

      const categoryId = categoryMap.get(l.categoryName.toLowerCase());
      if (!categoryId) {
        results.errors.push({ row: rowNum, message: `Kategori bulunamadı: "${l.categoryName}". Mevcut: ${categories.map((c) => c.name).join(', ')}` });
        continue;
      }

      const estimatedPrice = toNumberOrNull(l.estimatedPriceStr);
      const customBidIncrement = toNumberOrNull(l.customBidIncrementStr);
      const shippingType = normalizeShippingType(l.shippingTypeRaw);
      const estimatedShipping = shippingType === 'BUYER_PAYS' ? toNumberOrNull(l.estimatedShippingStr) : null;
      const kdvRate = normalizeKdvRate(l.kdvRateRaw);

      try {
        const bulkLotData: any = {
          lotNumber: nextLotNumber,
          title: l.title,
          description: l.description,
          notes: l.notes,
          condition: l.condition,
          provenance: l.provenance,
          auctionId,
          categoryId,
          startingPrice,
          estimatedPrice,
          currentPrice: startingPrice,
          status: 'PENDING',
          sortOrder: nextSortOrder,
          customBidIncrement,
          kdvRate,
          shippingType,
          estimatedShipping,
          restorationNote: l.restorationNote,
          images: l.imageUrls.length > 0 ? {
            create: l.imageUrls.map((imageUrl, idx) => ({ imageUrl, isPublic: true, sortOrder: idx })),
          } : undefined,
        };
        // Global tekil lot kodu (çakışmada @unique yakalar → yeniden dener)
        let createdLot: any;
        for (let attempt = 0; ; attempt++) {
          try {
            createdLot = await prisma.lot.create({ data: { ...bulkLotData, lotCode: await nextLotCode() } });
            break;
          } catch (e: any) {
            if (e?.code === 'P2002' && String(e?.meta?.target ?? '').includes('lotCode') && attempt < 5) continue;
            throw e;
          }
        }
        await prisma.lotCategory.create({ data: { lotId: createdLot.id, categoryId } });
        nextLotNumber++;
        nextSortOrder++;
        results.success++;
      } catch (err: any) {
        results.errors.push({ row: rowNum, message: 'Veritabanı hatası' });
      }
    }

    return NextResponse.json({
      success: true,
      imported: results.success,
      errors: results.errors,
      total: normalized.length,
    });
  } catch (error: any) {
    console.error('Bulk lot import error:', error);
    return NextResponse.json({ error: 'Toplu yükleme başarısız' }, { status: 500 });
  }
}
