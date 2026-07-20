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

// GET: Download sample CSV template
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
    
    const bom = '\uFEFF';
    const header = 'Lot Adı;Açıklama;Notlar;Kategori;Başlangıç Fiyatı;Tahmini Fiyat;Görsel URL';
    const example = 'Antika Vazo;Osmanlı dönemi vazo;İyi durumda;Antika;5000;8000;';
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
      
      // Expected: Lot Adı, Açıklama, Notlar, Kategori, Başlangıç Fiyatı, Tahmini Fiyat, Görsel URL
      const title = row[0] || '';
      const description = row[1] || null;
      const notes = row[2] || null;
      const categoryName = row[3] || '';
      const startingPriceStr = row[4] || '';
      const estimatedPriceStr = row[5] || '';
      const imageUrl = row[6] || '';

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

      try {
        const createdLot = await prisma.lot.create({
          data: {
            lotNumber: nextLotNumber,
            title,
            description,
            notes,
            auctionId,
            categoryId,
            startingPrice,
            estimatedPrice: estimatedPrice && !isNaN(estimatedPrice) ? estimatedPrice : null,
            currentPrice: startingPrice,
            status: 'PENDING',
            sortOrder: nextSortOrder,
            images: imageUrl ? {
              create: [{ imageUrl, isPublic: true, sortOrder: 0 }],
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