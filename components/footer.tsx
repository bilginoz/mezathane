'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Gavel, Instagram, Facebook, Youtube, Twitter } from 'lucide-react';

// lucide-react'te TikTok ikonu yok — marka logosu için küçük inline SVG.
function TikTokIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

export function Footer() {
  const [settings, setSettings] = useState<any>(null);
  const [dynamicPages, setDynamicPages] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/site-settings').then(r => r.json()).then(d => setSettings(d?.settings)).catch(() => {});
    fetch('/api/pages').then(r => r.json()).then(d => setDynamicPages(d?.pages || [])).catch(() => {});
  }, []);

  return (
    <footer className="border-t border-border bg-gray-100 dark:bg-[#111]">
      <div className="mx-auto max-w-[1200px] px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative h-9 w-12">
                <Image src={settings?.logoUrl || '/images/logo.png'} alt="Mezathane Logo" fill className="object-contain" />
              </div>
              <span className="font-display text-lg font-bold">
                <span className="gold-text">Mezathane</span>
                <span className="text-gray-600 dark:text-gray-500 text-xs">.tr</span>
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {settings?.footerDescription || "Türkiye'nin premium açık artırma platformu. Antika, tesbih ve koleksiyon ürünlerinin güvenli ve şeffaf müzayede deneyimi."}
            </p>
            {(settings?.instagramUrl || settings?.facebookUrl || settings?.tiktokUrl || settings?.youtubeUrl || settings?.twitterUrl) && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wider text-[#d4af37] font-semibold mb-2">Bizi Takip Edin</p>
                <div className="flex items-center gap-3">
                  {settings?.instagramUrl && (
                    <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-gray-500 dark:text-gray-400 hover:text-[#d4af37] dark:hover:text-[#d4af37] transition-colors">
                      <Instagram className="h-5 w-5" />
                    </a>
                  )}
                  {settings?.facebookUrl && (
                    <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-gray-500 dark:text-gray-400 hover:text-[#d4af37] dark:hover:text-[#d4af37] transition-colors">
                      <Facebook className="h-5 w-5" />
                    </a>
                  )}
                  {settings?.tiktokUrl && (
                    <a href={settings.tiktokUrl} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="text-gray-500 dark:text-gray-400 hover:text-[#d4af37] dark:hover:text-[#d4af37] transition-colors">
                      <TikTokIcon className="h-5 w-5" />
                    </a>
                  )}
                  {settings?.youtubeUrl && (
                    <a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="text-gray-500 dark:text-gray-400 hover:text-[#d4af37] dark:hover:text-[#d4af37] transition-colors">
                      <Youtube className="h-5 w-5" />
                    </a>
                  )}
                  {settings?.twitterUrl && (
                    <a href={settings.twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="X" className="text-gray-500 dark:text-gray-400 hover:text-[#d4af37] dark:hover:text-[#d4af37] transition-colors">
                      <Twitter className="h-5 w-5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
          <div>
            <h3 className="font-display font-semibold mb-4 text-sm uppercase tracking-wider text-[#d4af37]">Hızlı Erişim</h3>
            <div className="space-y-2">
              <Link href="/muzayedeler" className="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Müzayedeler</Link>
              <Link href="/hakkimizda" className="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Hakkımızda</Link>
              <Link href="/iletisim" className="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">İletişim</Link>
              <Link href="/yardim" className="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Yardım / SSS</Link>
              <Link href="/blog" className="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Blog</Link>
            </div>
          </div>
          <div>
            <h3 className="font-display font-semibold mb-4 text-sm uppercase tracking-wider text-[#d4af37]">Satıcılar İçin</h3>
            <div className="space-y-2">
              <Link href="/satici-ol" className="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Satıcı Ol</Link>
              <Link href="/satici-ol#fiyatlandirma" className="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Fiyatlandırma</Link>
              <Link href="/giris" className="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Giriş Yap</Link>
            </div>
          </div>
        </div>
        <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-300 dark:border-white/10">
          <div className="flex flex-wrap justify-center gap-4 mb-4">
            <Link href="/yasal/kvkk" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">KVKK</Link>
            <span className="text-xs text-gray-300 dark:text-gray-700">|</span>
            <Link href="/yasal/uyelik-sozlesmesi" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Üyelik Sözleşmesi</Link>
            <span className="text-xs text-gray-300 dark:text-gray-700">|</span>
            <Link href="/yasal/muzayede-sartnamesi" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Müzayede Şartnamesi</Link>
            <span className="text-xs text-gray-300 dark:text-gray-700">|</span>
            <Link href="/yasal/yasakli-urunler" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Yasaklı Ürünler</Link>
            <span className="text-xs text-gray-300 dark:text-gray-700">|</span>
            <Link href="/yasal/satici-sozlesmesi" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Satıcı Sözleşmesi</Link>
            <span className="text-xs text-gray-300 dark:text-gray-700">|</span>
            <Link href="/yasal/gizlilik" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Gizlilik Politikası</Link>
            <span className="text-xs text-gray-300 dark:text-gray-700">|</span>
            <Link href="/yasal/cerez" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Çerez Politikası</Link>
            <span className="text-xs text-gray-300 dark:text-gray-700">|</span>
            <Link href="/yasal/banka-hesap" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Banka Hesap Bilgileri</Link>
            <span className="text-xs text-gray-300 dark:text-gray-700">|</span>
            <Link href="/yasal/kullanim-kosullari" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Kullanım Koşulları</Link>
            {dynamicPages.map(p => (
              <span key={p.id} className="contents">
                <span className="text-xs text-gray-300 dark:text-gray-700">|</span>
                <Link href={`/sayfa/${p.slug}`} className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">{p.title}</Link>
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
            © 2026 Mezathane.tr - Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    </footer>
  );
}