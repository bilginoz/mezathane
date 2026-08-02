export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// CSV parse helper - handles quoted fields, Turkish chars
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];
  
  // Remove BOM
  const clean = text.replace(/^\uFEFF/, '');
  
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '"') {
      if (inQuotes && clean[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === ',' || ch === ';') && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(current.trim());
      if (row.some(c => c !== '')) rows.push(row);
      row = [];
      current = '';
    } else {
      current += ch;
    }
  }
  row.push(current.trim());
  if (row.some(c => c !== '')) rows.push(row);
  return rows;
}

// Durum/kondisyon değerini tekil lot formundaki seçeneklere hizala.
// Satıcı "çok iyi" / "ÇOK İYİ" yazsa da "Çok İyi" olarak kaydedilir; listede
// olmayan bir şey yazarsa (ör. "az kullanılmış") olduğu gibi korunur.
const CONDITION_OPTIONS = ['Mükemmel', 'Çok İyi', 'İyi', 'Orta', 'Restore Edilmiş'];
function normalizeCondition(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  const match = CONDITION_OPTIONS.find(
    (o) => o.toLocaleLowerCase('tr') === value.toLocaleLowerCase('tr')
  );
  return match ?? value;
}

// KDV oranı tekil lot formundaki üç sabit seçenekle sınırlı; boşsa/tanımsızsa varsayılan %20.
const KDV_RATE_OPTIONS = [20, 10, 1];
function normalizeKdvRate(raw: string | undefined): number {
  const value = raw?.trim().replace('%', '').replace(',', '.');
  if (!value) return 20;
  const n = parseFloat(value);
  return KDV_RATE_OPTIONS.includes(n) ? n : 20;
}

// Kargo tipi: "Alıcı Öder" (varsayılan) / "Ücretsiz". Tekil lot formundaki iki seçenekle aynı.
function normalizeShippingType(raw: string | undefined): 'BUYER_PAYS' | 'FREE_SELLER' {
  const value = raw?.trim().toLocaleLowerCase('tr') ?? '';
  if (value.startsWith('ücretsiz') || value.startsWith('ucretsiz') || value === 'free_seller') return 'FREE_SELLER';
  return 'BUYER_PAYS';
}

// GET: Download sample CSV template
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    
    const bom = '\uFEFF';
    // Not: yeni sütunlar hep EN SONA eklenir; eski, daha az sütunlu dosyalar bu yüzden
    // çalışmaya devam eder (eksik sütunlar boş/varsayılan kabul edilir).
    // Görsel URL: birden fazla resim için "|" ile ayırın (ör. url1.jpg|url2.jpg).
    const header = 'Lot Adı;Açıklama;Notlar;Kategori;Başlangıç Fiyatı;Tahmini Fiyat;Görsel URL;Durum;Menşe;Min. Artış Tutarı;KDV Oranı;Kargo Tipi;Tahmini Kargo Ücreti;Restorasyon Beyanı';
    const example = 'Antika Vazo;Osmanlı dönemi vazo;İyi durumda;Antika;5000;8000;https://.../vazo1.jpg|https://.../vazo2.jpg;Çok İyi;Aile koleksiyonundan, 1990 İstanbul;;20;Alıcı Öder;200;';
    const csv = bom + header + '\n' + example;
    
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="lot-sablonu.csv"',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Şablon oluşturulamadı' }, { status: 500 });
  }
}

// POST: Bulk import lots from CSV
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    const userId = (session.user as any).id;
    const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
    if (!seller || seller.status !== 'APPROVED') return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });

    const body = await request.json();
    const { auctionId, csvContent } = body;
    
    if (!auctionId || !csvContent) {
      return NextResponse.json({ error: 'Müzayede ID ve CSV içeriği gerekli' }, { status: 400 });
    }

    // Verify auction belongs to seller
    const auction = await prisma.auction.findFirst({
      where: { id: auctionId, sellerId: seller.id },
    });
    if (!auction) return NextResponse.json({ error: 'Müzayede bulunamadı' }, { status: 404 });
    if (auction.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Toplu lot yükleme sadece taslak durumundaki müzayedelerde yapılabilir.' }, { status: 400 });
    }
    
    // Check current lot count
    const currentLotCount = await prisma.lot.count({ where: { auctionId } });
    
    // Parse CSV
    const rows = parseCSV(csvContent);
    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV dosyası en az bir veri satırı içermelidir' }, { status: 400 });
    }
    
    // Skip header row
    const dataRows = rows.slice(1);
    
    if (currentLotCount + dataRows.length > 30) {
      return NextResponse.json({ 
        error: `Müzayedede toplam en fazla 30 lot olabilir. Mevcut: ${currentLotCount}, eklenmek istenen: ${dataRows.length}` 
      }, { status: 400 });
    }

    // Get categories for matching
    const categories = await prisma.category.findMany({ where: { isActive: true } });
    const categoryMap = new Map<string, string>();
    categories.forEach(c => {
      categoryMap.set(c.name.toLowerCase(), c.id);
      categoryMap.set(c.slug.toLowerCase(), c.id);
    });

    // Get last lot number
    const lastLot = await prisma.lot.findFirst({
      where: { auctionId },
      orderBy: { lotNumber: 'desc' },
    });
    let nextLotNumber = (lastLot?.lotNumber ?? 0) + 1;
    let nextSortOrder = (lastLot?.sortOrder ?? 0) + 1;

    const results: { success: number; errors: { row: number; message: string }[] } = { success: 0, errors: [] };

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2; // 1-based + header
      
      // Beklenen: Lot Adı, Açıklama, Notlar, Kategori, Başlangıç Fiyatı, Tahmini Fiyat,
      // Görsel URL, Durum, Menşe, Min. Artış Tutarı, KDV Oranı, Kargo Tipi,
      // Tahmini Kargo Ücreti, Restorasyon Beyanı. Son sütunlar isteğe bağlıdır — eski,
      // daha az sütunlu dosyalarda bulunmaz ve boş/varsayılan kabul edilir.
      const title = row[0] || '';
      const description = row[1] || null;
      const notes = row[2] || null;
      const categoryName = row[3] || '';
      const startingPriceStr = row[4] || '';
      const estimatedPriceStr = row[5] || '';
      // Görsel URL: "|" ile ayrılmış birden fazla URL desteklenir (çoklu resim).
      const imageUrls = (row[6] || '').split('|').map(s => s.trim()).filter(Boolean);
      const condition = normalizeCondition(row[7]);
      const provenance = row[8]?.trim() ? row[8].trim() : null;
      const customBidIncrementStr = row[9] || '';
      const kdvRate = normalizeKdvRate(row[10]);
      const shippingType = normalizeShippingType(row[11]);
      const estimatedShippingStr = row[12] || '';
      const restorationNote = row[13]?.trim() ? row[13].trim() : null;

      // Validate
      if (!title) {
        results.errors.push({ row: rowNum, message: 'Lot adı boş olamaz' });
        continue;
      }
      
      const startingPrice = parseFloat(startingPriceStr.replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (isNaN(startingPrice) || startingPrice <= 0) {
        results.errors.push({ row: rowNum, message: `Geçersiz başlangıç fiyatı: "${startingPriceStr}"` });
        continue;
      }

      const categoryId = categoryMap.get(categoryName.toLowerCase());
      if (!categoryId) {
        results.errors.push({ row: rowNum, message: `Kategori bulunamadı: "${categoryName}". Mevcut: ${categories.map(c => c.name).join(', ')}` });
        continue;
      }

      const estimatedPrice = estimatedPriceStr ? parseFloat(estimatedPriceStr.replace(/[^0-9.,]/g, '').replace(',', '.')) : null;
      const customBidIncrement = customBidIncrementStr ? parseFloat(customBidIncrementStr.replace(/[^0-9.,]/g, '').replace(',', '.')) : null;
      const estimatedShipping = shippingType === 'BUYER_PAYS' && estimatedShippingStr
        ? parseFloat(estimatedShippingStr.replace(/[^0-9.,]/g, '').replace(',', '.'))
        : null;

      try {
        const createdLot = await prisma.lot.create({
          data: {
            lotNumber: nextLotNumber,
            title,
            description,
            notes,
            condition,
            provenance,
            auctionId,
            categoryId,
            startingPrice,
            estimatedPrice: estimatedPrice && !isNaN(estimatedPrice) ? estimatedPrice : null,
            currentPrice: startingPrice,
            status: 'PENDING',
            sortOrder: nextSortOrder,
            customBidIncrement: customBidIncrement && !isNaN(customBidIncrement) ? customBidIncrement : null,
            kdvRate,
            shippingType,
            estimatedShipping: estimatedShipping && !isNaN(estimatedShipping) ? estimatedShipping : null,
            restorationNote,
            images: imageUrls.length > 0 ? {
              create: imageUrls.map((imageUrl, idx) => ({ imageUrl, isPublic: true, sortOrder: idx })),
            } : undefined,
          },
        });
        // LotCategory join table'a da ekle
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
      total: dataRows.length,
    });
  } catch (error: any) {
    console.error('Bulk lot import error:', error);
    return NextResponse.json({ error: 'Toplu yükleme başarısız' }, { status: 500 });
  }
}