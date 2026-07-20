'use client';

import Image from 'next/image';
import { Store } from 'lucide-react';

interface AuctionBannerProps {
  /** Satıcı logosu URL */
  logoUrl?: string | null;
  /** Satıcı/Müzayede evi adı */
  companyName?: string;
  /** Müzayededeki ilk lotların görselleri */
  lotImages?: string[];
  /** Müzayede başlığı (opsiyonel, gösterilmez ama alt text için) */
  title?: string;
  /** CSS class */
  className?: string;
}

/**
 * Otomatik müzayede kapak fotoğrafı bileşeni.
 * Lot görsellerini grid halinde gösterir, üzerine siyah/altın gradient
 * ve satıcı logosunu ekler. Tüm müzayedeler aynı standart tasarıma sahip olur.
 */
export function AuctionBanner({ logoUrl, companyName, lotImages = [], title, className }: AuctionBannerProps) {
  const images = lotImages.filter(Boolean).slice(0, 4);
  const hasImages = images.length > 0;

  return (
    <div className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-zinc-900 via-black to-zinc-800 ${className ?? ''}`}>
      {/* Lot Görselleri Grid */}
      {hasImages ? (
        <div className="absolute inset-0 grid gap-[1px]" style={{
          gridTemplateColumns: images.length >= 3 ? '1fr 1fr' : images.length === 2 ? '1fr 1fr' : '1fr',
          gridTemplateRows: images.length >= 3 ? '1fr 1fr' : '1fr',
        }}>
          {images.map((img, i) => (
            <div key={i} className="relative overflow-hidden">
              <Image
                src={img}
                alt={`${title ?? 'Müzayede'} - Lot ${i + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            </div>
          ))}
        </div>
      ) : (
        /* Görsel yoksa dekoratif pattern */
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #d4af37 0, #d4af37 1px, transparent 0, transparent 50%)',
            backgroundSize: '20px 20px',
          }} />
        </div>
      )}

      {/* Siyah/Altın Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
      <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-[#d4af37] via-[#f5e6a3] to-[#d4af37]" />

      {/* Satıcı Logosu */}
      <div className="absolute top-2 right-2 z-10">
        <div className="relative h-8 w-8 sm:h-10 sm:w-10 rounded-lg border border-[#d4af37]/50 bg-black/70 backdrop-blur-sm overflow-hidden flex items-center justify-center shadow-lg">
          {logoUrl ? (
            <Image src={logoUrl} alt={companyName ?? 'Satıcı'} fill className="object-cover" sizes="40px" />
          ) : (
            <Store className="h-4 w-4 sm:h-5 sm:w-5 text-[#d4af37]/70" />
          )}
        </div>
      </div>
    </div>
  );
}
