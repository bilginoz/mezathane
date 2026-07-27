// Tarayıcıda çalışır (canvas). Görseli maxWidth'e küçültür ve WebP'e (olmazsa JPEG)
// çevirir. Canvas'tan geçtiği için iPhone HEIC fotoğrafları da (Safari decode edebildiği
// için) JPEG/WebP'e dönüşür. Görsel decode edilemezse (ör. masaüstünde HEIC) orijinal
// dosya döner — bu durumda yükleme uç noktası desteklenmeyen türü reddeder ve net mesaj verir.
export function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.85
): Promise<{ blob: Blob; type: string }> {
  return new Promise((resolve) => {
    const img = document.createElement('img');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve({ blob: file, type: file.type }); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve({ blob, type: 'image/webp' });
          else canvas.toBlob(
            (jpegBlob) => resolve({ blob: jpegBlob || file, type: 'image/jpeg' }),
            'image/jpeg', quality
          );
        },
        'image/webp', quality
      );
    };
    img.onerror = () => resolve({ blob: file, type: file.type });
    img.src = URL.createObjectURL(file);
  });
}
