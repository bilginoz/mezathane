'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Gavel } from 'lucide-react';

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
              <Link href="/satici-basvuru" className="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Satıcı Ol</Link>
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
            <Link href="/yasal/mesafeli-satis" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Mesafeli Satış Sözleşmesi</Link>
            <span className="text-xs text-gray-300 dark:text-gray-700">|</span>
            <Link href="/yasal/on-bilgilendirme" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">Ön Bilgilendirme Formu</Link>
            <span className="text-xs text-gray-300 dark:text-gray-700">|</span>
            <Link href="/yasal/iptal-iade" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">İptal ve İade</Link>
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