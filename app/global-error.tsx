'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/*
  Sayfa çizimi sırasında yakalanmayan bir hata olursa React tüm ekranı boşaltır.
  Bu dosya olmadan o hatalar Sentry'ye HİÇ ulaşmıyordu — yani kullanıcı beyaz
  ekran görüyor, bizim haberimiz olmuyordu. Artık hata Sentry'ye gönderiliyor ve
  kullanıcıya anlaşılır bir sayfa gösteriliyor.

  Not: global-error yalnızca üretimde ve kök layout dahil her şeyi sardığı için
  kendi <html>/<body> etiketlerini içermek zorunda.
*/
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="tr">
      <body style={{ margin: 0, background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
            <h1 style={{ fontSize: '22px', margin: '0 0 10px', color: '#d4af37' }}>
              Bir şeyler ters gitti
            </h1>
            <p style={{ fontSize: '15px', lineHeight: 1.6, color: '#a3a3a3', margin: '0 0 22px' }}>
              Beklenmeyen bir hata oluştu ve ekip bilgilendirildi. Sayfayı yenilemeyi
              deneyebilir veya ana sayfaya dönebilirsiniz.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => reset()}
                style={{
                  background: '#d4af37', color: '#000', border: 'none', borderRadius: '8px',
                  padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Tekrar dene
              </button>
              <a
                href="/"
                style={{
                  background: 'transparent', color: '#e5e5e5', border: '1px solid #333',
                  borderRadius: '8px', padding: '10px 20px', fontSize: '14px',
                  textDecoration: 'none', display: 'inline-block',
                }}
              >
                Ana sayfa
              </a>
            </div>
            {error?.digest && (
              <p style={{ marginTop: '20px', fontSize: '11px', color: '#525252', fontFamily: 'monospace' }}>
                Hata kodu: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
