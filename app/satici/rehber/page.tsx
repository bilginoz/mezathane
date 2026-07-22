'use client';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, UserPlus, ClipboardCheck, Gavel, Layers, Image as ImageIcon,
  TrendingUp, Wallet, Package, Truck, FileText, Ban, AlertTriangle,
  Clock, CheckCircle2, Percent, MessageCircle, Upload, ChevronRight,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type Step = {
  icon: any;
  title: string;
  items: string[];
  screenshot?: string;
  screenshotAlt?: string;
  screenshotCaption?: string;
};

const STEPS: Step[] = [
  {
    icon: UserPlus,
    title: '1. Platforma Üye Olun',
    items: [
      'Mezathane.tr ana sayfasından "Kayıt Ol" butonuna tıklayın.',
      'Ad-soyad, e-posta, telefon ve TC Kimlik No bilgilerinizi girin.',
      'Adres bilgilerinizi doldurun ve KVKK onayını verin.',
      'E-posta adresinize gelen doğrulama kodunu girerek hesabınızı aktifleştirin.',
    ],
    screenshot: '/images/rehber/01-kayit.png',
    screenshotAlt: 'Mezathane.tr kayıt formu ekran görüntüsü',
    screenshotCaption: 'Kayıt formunda kişisel bilgilerinizi, kimlik/vergi bilgilerinizi ve adres bilgilerinizi girin.',
  },
  {
    icon: ClipboardCheck,
    title: '2. Satıcı Başvurusu Yapın',
    items: [
      'Giriş yaptıktan sonra "Satıcı Ol" sayfasına gidin.',
      'Firma bilgilerinizi girin: ticari unvan, vergi dairesi, vergi numarası, IBAN.',
      'Varsa Mersis numaranızı ekleyin.',
      'Vergi levhanızı yükleyin — başvurunuz tarafımızdan incelenir.',
      'Onaylandığınızda satıcı paneliniz aktif olur ve müzayede açabilirsiniz.',
    ],
    screenshot: '/images/rehber/02-satici-basvuru.png',
    screenshotAlt: 'Satıcı başvuru formu ekran görüntüsü',
    screenshotCaption: 'Firma bilgilerinizi ve vergi levhanızı yükleyerek başvurunuzu gönderin.',
  },
  {
    icon: Gavel,
    title: '3. Satıcı Panelinizi Tanıyın',
    items: [
      'Onay sonrası satıcı paneliniz aktif olur — tüm işlemlerinizi buradan yönetirsiniz.',
      'Panelde müzayede sayınız, toplam lot, teklif ve gelir istatistiklerinizi görebilirsiniz.',
      'Hızlı erişim kartlarıyla siparişler, cari hesap, analitik ve mesajlara ulaşın.',
      'Alt kısımda müzayedelerinizi listeleyebilir ve "Yönet" butonuyla detaya inebilirsiniz.',
    ],
    screenshot: '/images/rehber/03-satici-paneli.png',
    screenshotAlt: 'Satıcı paneli ana sayfa ekran görüntüsü',
    screenshotCaption: 'Satıcı paneliniz — istatistikler, hızlı erişim kartları ve müzayede listeniz burada.',
  },
  {
    icon: Layers,
    title: '4. Müzayede Oluşturun',
    items: [
      'Satıcı panelinde "+ Yeni Müzayede" butonuna tıklayın.',
      'Başlık, açıklama, başlangıç ve bitiş tarihlerini girin.',
      'Müzayede önce online olarak biter; canlı müzayede bitişten sonra otomatik başlar.',
      'Aynı anda en fazla 3 aktif müzayede açabilirsiniz.',
      'Sık kullandığınız ayarları "Müzayede Şablonları" ile kaydedip tekrar kullanabilirsiniz.',
    ],
  },
  {
    icon: ImageIcon,
    title: '5. Lot (Ürün) Ekleyin ve Fotoğraf Yükleyin',
    items: [
      'Müzayedeyi "Yönet" diyerek açın ve "Yeni Lot Ekle" ile ürünlerinizi girin.',
      'Her lot için başlık, açıklama, başlangıç fiyatı ve kategori belirleyin.',
      'Her lota net, aydınlık ve gerçek ürünü gösteren fotoğraflar ekleyin.',
      'Farklı açılardan çekim yapın; varsa kusur/hasarı da gösterin (güven artırır).',
      'Çok sayıda ürün için "Toplu Lot Yükleme" ile CSV üzerinden hızlıca lot ekleyebilirsiniz.',
      'Önemli: Müzayede başladıktan sonra yeni lot eklenemez, lotları önceden hazırlayın.',
    ],
    screenshot: '/images/rehber/04-muzayede-yonetimi.png',
    screenshotAlt: 'Müzayede yönetimi ve lot listesi ekran görüntüsü',
    screenshotCaption: 'Müzayede yönetim sayfasından lotlarınızı görebilir, düzenleyebilir ve yeni lot ekleyebilirsiniz.',
  },
  {
    icon: TrendingUp,
    title: '6. Teklif (Pey) Sistemi Nasıl İşler?',
    items: [
      'Alıcılar lotlara pey verir; en yüksek teklifi veren kazanır.',
      'Minimum artış, fiyat aralığına göre otomatik belirlenir (örn. 0-500₺ → 50₺, 500-1.000₺ → 100₺).',
      'Otomatik teklif (proxy): Alıcı bir üst limit belirler, sistem gerektiğinde otomatik artırır.',
      'Son dakika koruması: Bitişe son 60 saniyede gelen teklif süreyi 60 saniye uzatır.',
    ],
  },
  {
    icon: Percent,
    title: '7. Komisyon Sistemi',
    items: [
      'Platform, satış üzerinden hizmet komisyonu alır. Komisyon oranınız panelinizde yazar.',
      'Komisyon matrahı satış bedeli üzerinden hesaplanır, üzerine %20 KDV eklenir (aracılık hizmeti KDV oranı).',
      'Alıcıdan komisyon alınmaz — alıcı yalnızca kazanan teklif tutarını öder.',
      'Net ödemeniz = Satış bedeli − (Komisyon + KDV) şeklinde hesaplanır.',
      'Tüm tutarları "Cari Hesabım" ekranından şeffaf şekilde görebilirsiniz.',
    ],
    screenshot: '/images/rehber/06-cari-hesap.png',
    screenshotAlt: 'Cari hesap ekranı ekran görüntüsü',
    screenshotCaption: 'Cari Hesabım sayfasından komisyon kesintileri, alacaklarınız ve fatura bilgilerinizi izleyebilirsiniz.',
  },
  {
    icon: Package,
    title: '8. Sipariş ve Ödeme Takibi',
    items: [
      'Müzayede bitince kazanan alıcı bilgileri "Siparişlerim" ekranınıza düşer.',
      'Alıcı ödemeyi yapınca ve tarafımızca onaylanınca siparişin durumu güncellenir.',
      'Alıcı bilgileri, gizlilik gereği yalnızca ödeme onayından sonra teslimat için paylaşılır.',
      'Her sipariş kartında satış bedeli, komisyon kesintisi ve net ödeme tutarını görebilirsiniz.',
    ],
    screenshot: '/images/rehber/05-satici-siparisler.png',
    screenshotAlt: 'Satıcı siparişleri ekran görüntüsü',
    screenshotCaption: 'Siparişlerim sayfasından her satışın durumunu, alıcı bilgilerini ve kargo takibini yönetebilirsiniz.',
  },
  {
    icon: Truck,
    title: '9. Kargo ve Teslimat',
    items: [
      'Ödeme onaylandıktan sonra ürünü belirtilen süre içinde alıcıya gönderin.',
      'Şehir içi teslimlerde 7 gün, şehir dışı teslimlerde 14 gün içinde kargolayın.',
      'Kargo takip ve fatura bilgilerini "Siparişlerim" ekranından girebilirsiniz.',
      'Ürünü iyi paketleyin; kırılabilir eserlerde ekstra koruma kullanın.',
    ],
  },
  {
    icon: FileText,
    title: '10. Fatura ve Belgeler',
    items: [
      'Satışını yaptığınız ürün için faturayı alıcıya siz düzenlersiniz (kurumsal satıcı).',
      'Platform, size aracılık hizmeti için komisyon faturası düzenler.',
      'Faturalarınızı sipariş ekranından sisteme yükleyebilirsiniz.',
      'Fatura kesemiyorsanız bizimle iletişime geçin, uygun çözümü birlikte değerlendirelim.',
    ],
  },
];

export default function SellerGuidePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-10">
        <div className="mx-auto max-w-[900px] px-4">
          {/* Back */}
          <div className="mb-6">
            <button onClick={() => window.history.back()} className="rounded-lg border border-border p-2 hover:bg-muted transition-colors inline-flex items-center gap-2 text-sm">
              <ArrowLeft className="h-4 w-4" /> Geri
            </button>
          </div>

          {/* Hero */}
          <div className="rounded-2xl border border-[#d4af37]/30 bg-gradient-to-br from-[#d4af37]/10 to-transparent p-8 mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="rounded-full bg-[#d4af37]/15 p-3">
                <Gavel className="h-6 w-6 text-[#d4af37]" />
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">Satıcı Rehberi</h1>
            </div>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Mezathane.tr&apos;de satıcı olarak müzayede açmaktan teslimat ve faturalandırmaya kadar tüm adımları bu rehberde <strong>gerçek ekran görüntüleriyle</strong> adım adım bulabilirsiniz. Takıldığınız her konuda bize WhatsApp <span className="text-foreground font-medium">0 530 042 29 39</span> veya <span className="text-foreground font-medium">bilgi@mezathane.tr</span> üzerinden ulaşabilirsiniz.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-6">
            {STEPS.map((step, i) => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-[#d4af37]/10 flex items-center justify-center shrink-0">
                      <step.icon className="h-5 w-5 text-[#d4af37]" />
                    </div>
                    <h2 className="font-display text-lg font-semibold">{step.title}</h2>
                  </div>
                  <ul className="space-y-2.5">
                    {step.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                        <CheckCircle2 className="h-4 w-4 text-[#d4af37] mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Screenshot */}
                {step.screenshot && (
                  <div className="border-t border-border bg-muted/30 p-4">
                    <div className="rounded-lg border border-border overflow-hidden shadow-lg">
                      <div className="relative w-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={step.screenshot}
                          alt={step.screenshotAlt || ''}
                          className="w-full h-auto"
                          loading="lazy"
                        />
                      </div>
                    </div>
                    {step.screenshotCaption && (
                      <p className="text-xs text-muted-foreground mt-2 text-center italic">
                        {step.screenshotCaption}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Yasaklı Ürünler Uyarısı */}
          <div className="mt-8 rounded-xl border border-red-500/30 bg-red-500/5 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <Ban className="h-5 w-5 text-red-400" />
              </div>
              <h2 className="font-display text-lg font-semibold text-red-400">Yasaklı Ürünler</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Platformda yalnızca mevzuata uygun, satışı serbest ürünler listelenebilir. Aşağıdaki ürünlerin eklenmesi <span className="text-foreground font-medium">kesinlikle yasaktır</span>:
            </p>
            <ul className="grid sm:grid-cols-2 gap-2 mb-4">
              {[
                'İzne tabi gerçek tarihi/arkeolojik eserler ve sikkeler (2863 sayılı Kanun)',
                'Silah, mühimmat, patlayıcı ve tehlikeli maddeler',
                'Uyuşturucu, reçeteli ilaç ve denetlenemeyen sağlık ürünleri',
                'Sahte/taklit (replika) ve telif ihlali içeren ürünler',
                'Çalıntı, kaçak veya haczedilmiş mallar',
                'Koruma altındaki türler (fildişi vb.) ve canlı varlıklar',
                'Resmi belgeler, kimlik, kişisel veri içeren arşivler',
                'Müstehcen, nefret söylemi içeren ahlaka aykırı materyaller',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Tam liste ve detaylar için{' '}
              <Link href="/yasal/yasakli-urunler" className="text-[#d4af37] hover:underline font-medium">Yasaklı Ürünler sözleşmesini</Link>{' '}
              inceleyin. Kurallara aykırı lotlar kaldırılır, hesabınız askıya alınabilir.
            </p>
          </div>

          {/* Toplu Yükleme Ek Bilgi */}
          <div className="mt-6 rounded-xl border border-blue-500/30 bg-blue-500/5 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Upload className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="font-display text-lg font-semibold">Toplu Lot Yükleme</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Çok sayıda ürünü hızlıca eklemek için CSV dosyası ile toplu yükleme yapabilirsiniz. Örnek şablonu indirip, doldurarak sisteme yükleyin.
            </p>
            <div className="rounded-lg border border-border overflow-hidden shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/rehber/08-toplu-yukleme.png"
                alt="Toplu lot yükleme ekranı"
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center italic">
              Toplu Lot Yükleme sayfasından CSV şablonunu indirip, ürünlerinizi hızlıca ekleyebilirsiniz.
            </p>
          </div>

          {/* Mağaza Profili */}
          <div className="mt-6 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-[#d4af37]/10 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-[#d4af37]" />
              </div>
              <h2 className="font-display text-lg font-semibold">Mağaza Profiliniz</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              Mağaza profilinizden logo, açıklama ve firma bilgilerinizi düzenleyebilirsiniz. Güçlü bir profil, alıcı güvenini artırır.
            </p>
            <div className="rounded-lg border border-border overflow-hidden shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/rehber/07-satici-profil.png"
                alt="Satıcı mağaza profili ekranı"
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center italic">
              Mağaza Profilim sayfasından firmanızı en iyi şekilde tanıtın.
            </p>
          </div>

          {/* Hızlı Bağlantılar */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/satici/toplu-yukleme" className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 hover:bg-blue-500/10 transition-colors">
              <Upload className="h-5 w-5 text-blue-400 shrink-0" />
              <span className="text-sm font-medium">Toplu Lot Yükleme</span>
            </Link>
            <Link href="/satici/cari" className="flex items-center gap-3 rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-4 hover:bg-[#d4af37]/10 transition-colors">
              <Wallet className="h-5 w-5 text-[#d4af37] shrink-0" />
              <span className="text-sm font-medium">Cari Hesabım</span>
            </Link>
            <Link href="/satici/mesajlar" className="flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 hover:bg-orange-500/10 transition-colors">
              <MessageCircle className="h-5 w-5 text-orange-400 shrink-0" />
              <span className="text-sm font-medium">Mesajlarım</span>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
