import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_KDV_RATE = 0.20;

export function formatPrice(price: number | null | undefined): string {
  return (price ?? 0).toLocaleString('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** kdvRatePercent: 1, 10, or 20 (default 20) */
export function getKdvDecimal(kdvRatePercent?: number | null): number {
  if (kdvRatePercent != null && kdvRatePercent > 0) return kdvRatePercent / 100;
  return DEFAULT_KDV_RATE;
}

export function calculateKDV(price: number, kdvRatePercent?: number | null): number {
  return Math.round(price * getKdvDecimal(kdvRatePercent));
}

export function priceWithKDV(price: number, kdvRatePercent?: number | null): number {
  return Math.round(price * (1 + getKdvDecimal(kdvRatePercent)));
}

export function formatPriceWithKDV(price: number | null | undefined, kdvRatePercent?: number | null): string {
  const p = price ?? 0;
  return formatPrice(priceWithKDV(p, kdvRatePercent));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Istanbul',
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Istanbul',
  });
}

export function getTimeRemaining(endDate: string | Date | null | undefined): string {
  if (!endDate) return '';
  const total = new Date(endDate).getTime() - Date.now();
  if (total <= 0) return 'Süre doldu';
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const seconds = Math.floor((total / 1000) % 60);
  if (days > 0) return `${days}g ${hours}s ${minutes}dk`;
  if (hours > 0) return `${hours}s ${minutes}dk ${seconds}sn`;
  return `${minutes}dk ${seconds}sn`;
}

export function getMinBidIncrement(currentPrice: number, customIncrement?: number | null): number {
  if (customIncrement && customIncrement > 0) return customIncrement;
  if (currentPrice < 500) return 50;
  if (currentPrice < 1000) return 100;
  if (currentPrice < 5000) return 250;
  if (currentPrice < 10000) return 500;
  if (currentPrice < 50000) return 1000;
  return 2500;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
