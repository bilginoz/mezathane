'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Info, RotateCcw, Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// Bu belgeler platformun KENDİ eski /yasal/mesafeli-satis, /yasal/on-bilgilendirme,
// /yasal/iptal-iade metinlerinden türetildi (2026-08-08'de bu 3 sayfa platform↔satıcı
// içeriğine dönüştürülünce, orijinal alıcıya-yönelik metin buraya, satıcıya ÖRNEK olarak
// taşındı). Platformun kendi şirket bilgileri (unvan/adres/VKN/Mersis/e-posta) [KÖŞELİ PARANTEZ]
// ile değiştirildi — satıcı kendi bilgilerini yazmalı. Sabit oranlar (örn. %7 hizmet bedeli)
// kaldırıldı çünkü bu platform ayarına bağlı ve zamanla değişebilir; satıcı güncel oranı
// kendi profilinden görüp buraya kendi cümleleriyle yazmalı.
const REFERENCE_DOCS: Record<string, { title: string; icon: any; sections: { heading: string; text: string }[] }> = {
  'mesafeli-satis': {
    title: 'Mesafeli Satış Sözleşmesi — Örnek Metin',
    icon: FileText,
    sections: [
      { heading: '1. Sözleşmenin Konusu', text: 'İşbu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri uyarınca, Mezathane.tr platformu üzerinde düzenlenen müzayede yoluyla [SATICI TİCARİ UNVANI] ("SATICI") ile alıcı ("ALICI") arasında gerçekleştirilen satışlara ilişkin tarafların hak ve yükümlülüklerini düzenler.' },
      { heading: '2. Satıcı Bilgileri (Sözleşmenin Tarafı)', text: 'TİCARİ UNVAN: [SATICI TİCARİ UNVANI]\nADRES: [SATICI ADRESİ]\nVERGİ DAİRESİ: [SATICI VERGİ DAİRESİ]\nVERGİ NO: [SATICI VERGİ NO]\nİLETİŞİM: [SATICI TELEFON]\nE-POSTA: [SATICI E-POSTA]\n\nBu satış sözleşmesinin tarafı SATICI\'dır. Mezathane.tr platformu, taraflar arasında aracılık hizmeti sunan aracı hizmet sağlayıcı konumundadır ve sözleşmenin tarafı değildir.' },
      { heading: '3. Alıcı Bilgileri', text: 'Alıcının adı soyadı, adresi, telefonu, e-posta adresi ve teslim edilecek kişi bilgileri sipariş sürecinde kayıt altına alınmaktadır.' },
      { heading: '4. Ürün Bilgileri', text: '• Satışa sunulan ürünlerin temel nitelikleri (açıklama, fotoğraflar, tahmini değer, başlangıç fiyatı) müzayede ve lot detay sayfalarında belirtilmektedir.\n• Ürün görselleri temsilidir ve gerçek ürünle birebir örtüşmeyebilir.\n• SATICI, ürün bilgilerinin doğruluğundan sorumludur.' },
      { heading: '5. Fiyat ve Ödeme', text: 'Müzayedede verilen pey (teklif) tutarı, ürünün KDV dahil satış bedelidir. Müzayedeyi kazanan ALICI, satış bedeline ek olarak platform üzerinden uygulanan hizmet bedeli/komisyon ve varsa buna ait KDV\'yi öder. Ödenecek toplam tutar teklif verme ekranında açıkça gösterilir.\n\n• Ödeme, müzayede bitiminden itibaren belirtilen süre içinde tamamlanmalıdır.\n• ALICI, toplam tutarı [SATICININ BELİRLEDİĞİ ÖDEME YÖNTEMİ, örn. havale/EFT] yoluyla öder.' },
      { heading: '6. Teslimat', text: '• Sipariş, 6502 sayılı Kanun hükümlerine uygun olarak sipariş tarihinden itibaren en geç 30 (otuz) gün içinde ALICI adına kargo firmasına teslim edilir.\n• Hedeflenen kargo teslim süresi [SATICININ TAAHHÜT ETTİĞİ SÜRE, örn. 7 gün]\'dür.\n• Kargo ücreti ve koşulları SATICI tarafından belirlenir.' },
      { heading: '7. Cayma Hakkı', text: 'Müzayede yoluyla gerçekleştirilen satışlar, 6502 sayılı Kanun\'un 53/ç maddesi ve Mesafeli Sözleşmeler Yönetmeliği\'nin 15/ç maddesi gereğince cayma hakkı kapsamı dışındadır.\n\nAncak ürünün açıklamaya uygun olmaması veya ayıplı olması halinde tüketici hakları saklıdır.' },
      { heading: '8. Ödeme Güvenliği', text: 'Ödemeler banka havalesi/EFT ile SATICI\'nın bildirdiği hesaba yapılır. IBAN bilgisi sipariş onayı sonrası ALICI\'ya iletilir. SATICI, kredi kartı bilgisi talep etmez ve saklamaz.' },
      { heading: '9. Uyuşmazlık', text: 'İşbu sözleşmeden doğabilecek uyuşmazlıklarda Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir. Taraflar, işbu Sözleşme şartlarının yanı sıra Tüketicinin Korunması Hakkındaki Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümlerine uygun hareket edeceklerini kabul, beyan ve taahhüt ederler.' },
    ],
  },
  'on-bilgilendirme': {
    title: 'Ön Bilgilendirme Formu — Örnek Metin',
    icon: Info,
    sections: [
      { heading: 'Genel Bilgilendirme', text: 'İşbu Ön Bilgilendirme Formu, ALICI\'nın Mezathane.tr platformu üzerinden [SATICI TİCARİ UNVANI]\'ndan ("SATICI") satın aldığı, aşağıda nitelikleri ve satış fiyatı belirtilen ürün/ürünlerin satışı ve teslimi ile ilgili olarak 6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince ALICI\'yı bilgilendirmek içindir.' },
      { heading: '1. Satıcı Bilgileri', text: 'TİCARİ UNVAN: [SATICI TİCARİ UNVANI]\nADRES: [SATICI ADRESİ]\nVERGİ DAİRESİ: [SATICI VERGİ DAİRESİ]\nVERGİ NO: [SATICI VERGİ NO]\nİLETİŞİM: [SATICI TELEFON]\nE-POSTA: [SATICI E-POSTA]' },
      { heading: '2. Alıcı Bilgileri', text: 'Alıcının adı soyadı, adresi, telefonu, e-posta adresi ve teslim edilecek kişi bilgileri üyelik ve sipariş bilgilerinden temin edilmektedir.' },
      { heading: '3. Ürün Bilgileri', text: '• Ürünün temel nitelikleri, açıklamaları ve fotoğrafları lot detay sayfasında belirtilmektedir.\n• Satış fiyatı, müzayede sonucunda oluşan kazanan teklif tutarıdır.\n\nMüzayedede verilen pey (teklif) tutarı, ürünün KDV dahil satış bedelidir. ALICI, satış bedeline ek olarak platform üzerinden uygulanan hizmet bedeli/komisyon ve varsa buna ait KDV\'yi öder. Ödenecek toplam tutar teklif verme ekranında açıkça gösterilir.\n\n• Ödeme şekli: [SATICININ BELİRLEDİĞİ ÖDEME YÖNTEMİ, örn. Havale/EFT]' },
      { heading: '4. Teslimat Bilgileri', text: '• Hedeflenen kargo teslim süresi [SATICININ TAAHHÜT ETTİĞİ SÜRE, örn. 7 gün]\'dür. Sipariş, 6502 sayılı Kanun hükümlerine uygun olarak sipariş tarihinden itibaren en geç 30 (otuz) gün içinde ALICI adına kargo firmasına teslim edilir.\n• Mesafeli Sözleşmeler Yönetmeliği md. 16/4 uyarınca, sipariş konusu ürünün ediminin yerine getirilmesinin imkânsızlaştığı hallerde SATICI, bu durumu öğrendiği tarihten itibaren üç gün içinde ALICI\'ya bildirir ve tahsil edilen tutarları en geç on dört gün içinde iade eder.' },
      { heading: '5. Genel Hükümler', text: 'A) ALICI\'nın işbu Ön Bilgilendirme Formu\'nu elektronik ortamda teyit etmesi, mesafeli satış sözleşmesinin kurulmasından önce, ürüne ait temel özellikleri, vergiler dahil fiyatı, ödeme ve teslimat bilgilerini doğru ve eksiksiz olarak edindiği anlamına gelir.\n\nB) SATICI, sözleşme konusu ürünü eksiksiz, siparişte belirtilen niteliklere uygun teslim etmeyi taahhüt eder.\n\nC) ALICI, sözleşme konusu ürün bedelinin ödenmemesi ve/veya banka kayıtlarında iptal edilmesi halinde, SATICI\'nın ürünü teslim yükümlülüğünün sona ereceğini kabul eder.' },
    ],
  },
  'iptal-iade': {
    title: 'İptal ve İade Koşulları — Örnek Metin',
    icon: RotateCcw,
    sections: [
      { heading: 'Genel İlke', text: '[SATICI TİCARİ UNVANI], tüketici haklarını korumakta ve satış sonrası müşteri memnuniyetini ön planda tutmaktadır. Satın alınan ürünlerle ilgili yaşanabilecek her türlü sorun titizlikle değerlendirilir ve en kısa sürede çözüme kavuşturulur.' },
      { heading: '1. Müzayede Ürünleri Hakkında Önemli Not', text: '⚠️ Önemli Bilgilendirme: Müzayede yoluyla satışa sunulan ürünler, 6502 sayılı Kanun\'un 53/ç maddesi ve Mesafeli Sözleşmeler Yönetmeliği gereği "Cayma Hakkının İstisnaları" kapsamındadır.\n\nBu nedenle müzayedelerden satın alınan ürünlerde cayma hakkı kullanılamaz.\n\nAncak ürünün açıklamaya uygun olmaması veya ayıplı olması halinde tüketici hakları saklıdır.' },
      { heading: '2. Ayıplı / Açıklamaya Uygun Olmayan Ürün', text: '• Teslim edilen ürünün lot açıklamasıyla uyuşmadığını veya ayıplı olduğunu düşünen ALICI, teslim tarihinden itibaren 7 gün içinde [SATICI E-POSTA] adresine sipariş numarası ve durumu açıklayan fotoğraflarla birlikte başvurmalıdır.\n• Haklı bulunan iade taleplerinde ürün bedeli, iade onayının ardından 14 (ondört) gün içinde ALICI\'ya iade edilir.\n• İade edilecek ürünün orijinal ambalajında ve teslim alındığı durumda olması gerekmektedir.' },
      { heading: '3. Hasarlı Teslimat', text: 'Teslimat sırasında zarar görmüş paket varsa ALICI, kargo firması yetkilisi önünde bizzat açarak kontrol etmeli, hasarlı ürün için kargo firmasına tutanak tutturmalı ve derhal [SATICI E-POSTA] adresine bildirmelidir.' },
    ],
  },
};

const ORDER = ['mesafeli-satis', 'on-bilgilendirme', 'iptal-iade'];

export function SellerLegalReference({ slug }: { slug: string }) {
  const { status } = useSession() || {};
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/giris');
  }, [status, router]);

  const doc = REFERENCE_DOCS[slug];
  if (!doc) return null;

  const fullText = doc.sections.map((s) => `${s.heading}\n${s.text}`).join('\n\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success('Metin kopyalandı');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Kopyalanamadı, metni elle seçip kopyalayabilirsiniz');
    }
  };

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[900px] px-4">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/satici/profil" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors inline-flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> Profilime Dön
          </Link>
          <nav className="flex gap-2">
            {ORDER.map((s) => (
              <Link
                key={s}
                href={`/satici/yasal-referans/${s}`}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  s === slug ? 'bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {REFERENCE_DOCS[s].title.replace(' — Örnek Metin', '')}
              </Link>
            ))}
          </nav>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 md:p-12">
          <div className="flex items-start gap-2 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20 px-4 py-3 mb-8">
            <Info className="h-4 w-4 text-[#d4af37] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-foreground">
              Bu, kendi <strong>{doc.title.replace(' — Örnek Metin', '')}</strong>&apos;nizi hazırlarken başlangıç noktası
              olarak kullanabileceğiniz bir örnek metindir. Köşeli parantez <code className="text-[#d4af37]">[...]</code> içindeki
              alanları kendi bilgilerinizle doldurun, içeriği işletmenize uygun şekilde düzenleyin ve kendi profilinizdeki
              &quot;Satış Şartları&quot; bölümüne kendi adınıza yayınlayın. Bu metni kullanmak zorunda değilsiniz; kendi
              avukatınızla hazırladığınız bir metni de kullanabilirsiniz.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-[#d4af37]/10 p-3">
                <doc.icon className="h-6 w-6 text-[#d4af37]" />
              </div>
              <h1 className="font-display text-xl md:text-2xl font-bold">{doc.title}</h1>
            </div>
            <button
              onClick={handleCopy}
              className="rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted transition-colors inline-flex items-center gap-1.5 flex-shrink-0"
            >
              <Copy className="h-3.5 w-3.5" /> {copied ? 'Kopyalandı' : 'Metni Kopyala'}
            </button>
          </div>

          <div className="space-y-6">
            {doc.sections.map((s, i) => (
              <div key={i}>
                <h2 className="text-base font-semibold text-[#d4af37] mb-2">{s.heading}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-border flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Bu örnek metin genel bilgi amaçlıdır, hukuki tavsiye niteliğinde değildir ve Mezathane.tr tarafından hukuken
              onaylanmış sayılmaz. Kendi belgenizin mevzuata uygunluğundan siz sorumlusunuz.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
