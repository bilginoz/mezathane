'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Search, ChevronDown, HelpCircle, ArrowLeft, Gavel, CreditCard, ShieldCheck, Truck, UserPlus, Clock, AlertTriangle, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type FAQCategory = {
  id: string;
  title: string;
  icon: any;
  questions: { q: string; a: string }[];
};

const FAQ_DATA: FAQCategory[] = [
  {
    id: 'genel',
    title: 'Genel Bilgiler',
    icon: HelpCircle,
    questions: [
      {
        q: 'Mezathane.tr nedir?',
        a: 'Mezathane.tr, Türkiye\'nin premium online müzayede platformudur. Antika, tesbih, mücevher, nümismatik, resim ve koleksiyon ürünlerinin güvenli ve şeffaf bir şekilde alıcılarla buluşturulmasını sağlıyoruz. Platformumuzda onaylı satıcılar tarafından düzenlenen müzayedelere katılabilir, teklif verebilir ve benzersiz eserlere sahip olabilirsiniz.',
      },
      {
        q: 'Müzayede nedir?',
        a: 'Müzayede (açık artırma), bir ürünün en yüksek teklifi veren kişiye satıldığı bir satış yöntemidir. Belirli bir başlangıç fiyatından başlayarak, katılımcılar birbirlerinin üzerine teklif verir. Müzayede süresi dolduğunda en yüksek teklifi veren kişi ürünü kazanır.',
      },
      {
        q: 'Lot nedir?',
        a: 'Lot, bir müzayedede satışa sunulan her bir eser veya üründür. Bir müzayede birden fazla lot içerebilir. Her lotun kendi başlangıç fiyatı, açıklaması, fotoğrafları ve teklif süreci vardır.',
      },
      {
        q: 'Pey (teklif) nedir?',
        a: 'Pey, bir lot için verilen fiyat teklifidir. Müzayedeye katılan kullanıcılar, ilgilendikleri lot için pey (teklif) vererek fiyatı artırırlar. Her teklif bağlayıcıdır ve geri alınamaz.',
      },
      {
        q: 'Mezathane.tr\'yi kullanmak ücretsiz mi?',
        a: 'Platforma üye olmak, müzayedeleri incelemek ve takip etmek tamamen ücretsizdir. Müzayede kazandığınızda satış bedeline ek olarak %10 hizmet bedeli ve bu bedelin KDV\'si eklenir. Toplam tutar teklif verme ekranında açıkça gösterilir.',
      },
    ],
  },
  {
    id: 'uyelik',
    title: 'Üyelik ve Hesap',
    icon: UserPlus,
    questions: [
      {
        q: 'Nasıl üye olabilirim?',
        a: 'Anasayfadaki "Kayıt Ol" butonuna tıklayarak üyelik formunu doldurabilirsiniz. Kayıt için ad-soyad, e-posta, telefon, T.C. kimlik numarası ve şifre bilgileriniz gerekmektedir. Kurumsal hesap açmak isteyenler "Şirket Hesabı" seçeneğini işaretleyerek vergi dairesi ve vergi numarası bilgilerini de girebilir.',
      },
      {
        q: 'E-posta doğrulama zorunlu mu?',
        a: 'Evet. Kayıt işleminizin ardından e-posta adresinize bir doğrulama kodu gönderilir. Bu kodu girerek hesabınızı aktif hale getirmeniz gerekmektedir. E-posta doğrulaması yapılmadan teklif veremezsiniz.',
      },
      {
        q: 'Şifremi unuttum, ne yapmalıyım?',
        a: 'Giriş sayfasındaki "Şifremi Unuttum" bağlantısına tıklayarak e-posta adresinizi giriniz. Size şifre sıfırlama bağlantısı gönderilecektir. Bu bağlantı ile yeni şifrenizi oluşturabilirsiniz.',
      },
      {
        q: 'Hesap bilgilerimi nasıl güncelleyebilirim?',
        a: 'Giriş yaptıktan sonra "Panelim > Ayarlar" bölümünden ad-soyad, telefon, adres ve şifre bilgilerinizi güncelleyebilirsiniz.',
      },
    ],
  },
  {
    id: 'teklif',
    title: 'Teklif Verme',
    icon: Gavel,
    questions: [
      {
        q: 'Nasıl teklif verebilirim?',
        a: 'Teklif vermek için öncelikle üye olmanız ve e-posta doğrulamanızı tamamlamanız gerekir. Ardından ilgilendiğiniz lotun detay sayfasına giderek "Teklif Ver" butonuna tıklayabilir veya lot kartı üzerindeki hızlı teklif özelliğini kullanabilirsiniz.',
      },
      {
        q: 'Minimum teklif artışı (asgari pey) nedir?',
        a: 'Minimum teklif artışı, mevcut fiyata göre otomatik olarak belirlenir:\n\n• 0 - 500₺ arası: 50₺\n• 500 - 1.000₺ arası: 100₺\n• 1.000 - 2.000₺ arası: 200₺\n• 2.000 - 5.000₺ arası: 250₺\n• 5.000 - 10.000₺ arası: 500₺\n• 10.000 - 20.000₺ arası: 1.000₺\n• 20.000 - 50.000₺ arası: 2.000₺\n• 50.000₺ ve üzeri: 2.500₺\n\nSatıcılar bazı lotlar için özel artış tutarı da belirleyebilir.',
      },
      {
        q: 'Otomatik teklif (Proxy Bidding) nedir?',
        a: 'Otomatik teklif sistemi sayesinde maksimum bütçenizi belirlersiniz ve sistem sizin adınıza minimum gerekli tutarda otomatik olarak teklif verir. Başka biri sizin teklifinizin üzerine çıktığında, sistem belirlediğiniz maksimum tutara kadar otomatik olarak teklifinizi artırır. Bu sayede müzayedeyi sürekli takip etmenize gerek kalmaz.',
      },
      {
        q: 'Verdiğim teklifi geri alabilir miyim?',
        a: 'Hayır. Verilen her teklif bağlayıcıdır ve geri alınamaz. Bu nedenle teklif vermeden önce tutarı dikkatli bir şekilde kontrol etmenizi öneririz.',
      },
      {
        q: 'Teklifim geçildiğinde haberim olur mu?',
        a: 'Evet. Teklifiniz geçildiğinde e-posta ile bilgilendirilirsiniz. Ayrıca platformda "Panelim > Tekliflerim" bölümünden aktif tekliflerinizin durumunu takip edebilirsiniz.',
      },
    ],
  },
  {
    id: 'muzayede',
    title: 'Müzayede Süreci',
    icon: Clock,
    questions: [
      {
        q: 'Son dakika koruması (Anti-Sniping) nedir?',
        a: 'Adil bir müzayede ortamı sağlamak için son dakika koruması (anti-sniping) sistemi uygulanmaktadır. Müzayede bitimine son 60 saniye kala herhangi bir teklif verilmesi halinde, süre otomatik olarak 60 saniye daha uzatılır. Bu sayede tüm katılımcılara eşit fırsat tanınır ve son saniye tekliflerinin (sniping) önüne geçilir.',
      },
      {
        q: 'Müzayedeyi nasıl kazanırım?',
        a: 'Müzayede süresi dolduğunda (tüm uzatmalar dahil) en yüksek teklifi veren kullanıcı müzayedeyi kazanır. Kazandığınızda e-posta ile bilgilendirilirsiniz ve ödeme süreciniz başlar.',
      },
      {
        q: 'Müzayede takvimini nereden görebilirim?',
        a: 'Anasayfadaki menüden "Takvim" bağlantısına tıklayarak yaklaşan tüm müzayedeleri takvim formatında görüntüleyebilirsiniz. Ayrıca müzayede başlamadan önce e-posta hatırlatması almak için ilgili müzayedeyi takip edebilirsiniz.',
      },
      {
        q: 'Bir lotu favorilerime nasıl eklerim?',
        a: 'Lot kartı veya lot detay sayfasındaki kalp (♥) ikonuna tıklayarak lotu favorilerinize ekleyebilirsiniz. Favori lotlarınızı "Panelim > Favorilerim" bölümünden takip edebilirsiniz.',
      },
    ],
  },
  {
    id: 'odeme',
    title: 'Ödeme Bilgileri',
    icon: CreditCard,
    questions: [
      {
        q: 'Hizmet bedeli nedir?',
        a: 'Müzayedede verilen pey (teklif) tutarı, eserin KDV dahil satış bedelidir. Kazanan alıcı, satış bedeline ek olarak %10 hizmet bedeli ve bu bedelin KDV\'sini (ürüne göre %1, %10 veya %20) öder. Örnek (%20 KDV): 20.000 TL kazanan teklif için toplam ödeme 22.400 TL\'dir (20.000 + 2.000 hizmet bedeli + 400 KDV). Toplam tutar teklif verme ekranında her zaman açıkça gösterilir.',
      },
      {
        q: 'Ödemeyi nasıl yaparım?',
        a: 'Müzayedeyi kazandıktan sonra ödemenizi havale/EFT yoluyla gerçekleştirebilirsiniz. Banka hesap bilgileri sipariş onayı ile birlikte tarafınıza iletilecektir. Ödeme yaparken açıklama kısmına üye numaranızı ve sipariş numaranızı yazmayı unutmayınız.',
      },
      {
        q: 'Ödeme süresi ne kadar?',
        a: 'Müzayedeyi kazandıktan sonra ödemenizi müzayede detayında belirtilen süre içinde (genellikle 5 iş günü) tamamlamanız gerekmektedir. Süresinde yapılmayan ödemeler için sipariş iptal edilebilir ve hesabınız kısıtlanabilir.',
      },
      {
        q: 'Fatura alabilir miyim?',
        a: 'Evet. Satın aldığınız eserler için fatura, üye kaydınızdaki ad, soyad ve adres bilgilerine göre satıcı tarafından düzenlenmektedir.',
      },
    ],
  },
  {
    id: 'kargo',
    title: 'Teslimat ve Kargo',
    icon: Truck,
    questions: [
      {
        q: 'Ürün nasıl teslim edilir?',
        a: 'Ödemenizin onaylanmasının ardından satıcı, ürünü kargo ile gönderir. Şehir içi teslimlerde 7 gün, şehir dışı teslimlerde 14 gün içinde kargoya verilir. Kargo takip numarası tarafınıza iletilecektir.',
      },
      {
        q: 'Kargo ücreti kime aittir?',
        a: 'Kargo ücreti ve koşulları satıcı tarafından belirlenir. Detaylar müzayede açıklamasında veya sipariş onayında belirtilmektedir.',
      },
      {
        q: 'Ürün hasarlı gelirse ne yapmalıyım?',
        a: 'Ürünü teslim alırken kargo firması yetkilisi önünde kontrol ediniz. Hasarlı ürün için kargo firmasına tutanak tutturunuz ve derhal bilgi@mezathane.tr adresine bildiriniz. Teslim tarihinden itibaren 3 gün içinde itiraz edebilirsiniz.',
      },
      {
        q: 'İade yapabilir miyim?',
        a: 'Müzayede yoluyla satışa sunulan eserler, 6502 sayılı Kanun\'un 53/ç maddesi gereği cayma hakkı kapsamı dışındadır. Ancak ürünün açıklamaya uygun olmaması veya ayıplı olması halinde tüketici hakları saklıdır. Detaylı bilgi için "İptal ve İade Koşulları" sayfamızı inceleyiniz.',
      },
    ],
  },
  {
    id: 'guvenlik',
    title: 'Güvenlik',
    icon: ShieldCheck,
    questions: [
      {
        q: 'Müzayedeler güvenli mi?',
        a: 'Evet. Mezathane.tr platformunda tüm satıcılar önceden onaylanmaktadır. TC Kimlik doğrulama sistemi sayesinde sahte hesaplar engellenmektedir. Ayrıca anti-sniping sistemi, şeffaf teklif geçmişi ve anlaşmazlık yönetim sistemi ile adil ve güvenli bir müzayede ortamı sağlanmaktadır.',
      },
      {
        q: 'Kişisel bilgilerim güvende mi?',
        a: 'Kişisel verileriniz 6698 sayılı KVKK kapsamında korunmaktadır. SSL şifreleme, güvenlik duvarı ve erişim kontrolü ile verileriniz güvence altındadır. Ödeme onaylanana kadar alıcı bilgileri satıcıdan gizli tutulmaktadır. Detaylı bilgi için KVKK Aydınlatma Metni sayfamızı inceleyiniz.',
      },
      {
        q: 'Sahte teklif (shill bidding) nasıl engelleniyor?',
        a: 'Platformumuzda satıcıların kendi lotlarına teklif vermesi ve birden fazla hesap kullanarak teklif verilmesi kesinlikle yasaktır. Bu tür manipülatif davranışlar tespit edildiğinde ilgili hesaplar derhal kapatılır ve hukuki işlem başlatılır.',
      },
    ],
  },
  {
    id: 'satici',
    title: 'Satıcı Olmak',
    icon: MessageCircle,
    questions: [
      {
        q: 'Nasıl satıcı olabilirim?',
        a: 'Satıcı olmak için önce platforma üye olmanız, ardından "Satıcı Ol" sayfasından başvuru yapmanız gerekmektedir. Başvuru formunda şirket bilgileri, vergi dairesi, vergi numarası, IBAN ve varsa Mersis numaranızı doldurmanız gerekir. Vergi levhanızı yüklemeniz de zorunludur. Başvurunuz admin tarafından değerlendirilecektir.',
      },
      {
        q: 'Satıcı komisyon oranı nedir?',
        a: 'Platform, satıcılardan hizmet komisyonu almaktadır. Komisyon oranı satıcı onayı sırasında platform ile satıcı arasında belirlenir ve satıcı panelinde görüntülenebilir. Alıcılardan ayrıca %10 hizmet bedeli + KDV alınır.',
      },
      {
        q: 'Satıcıya nasıl soru sorabilirim?',
        a: 'Lot detay sayfasında "Satıcıya Soru Sor" butonunu kullanarak satıcıya doğrudan mesaj gönderebilirsiniz. Mesajlarınızı "Panelim > Mesajlarım" bölümünden takip edebilirsiniz.',
      },
      {
        q: 'Satıcı olarak nasıl başlarım, bir rehber var mı?',
        a: 'Evet! Satıcı Rehberimiz herkese açıktır — satıcı olmadan da inceleyebilirsiniz. Rehbere mezathane.tr/satici/rehber adresinden veya aşağıdaki linkten ulaşabilirsiniz. Rehberde müzayede oluşturma, lot ekleme, fotoğraf yükleme, teklif sistemi, komisyon-KDV hesabı, sipariş/ödeme takibi ve kargo adımları ekran görüntüleriyle adım adım anlatılmaktadır.',
      },
      {
        q: 'Hangi ürünleri satamam (yasaklı ürünler)?',
        a: 'Platformda yalnızca mevzuata uygun, satışı serbest ürünler listelenebilir. İzne tabi gerçek tarihi/arkeolojik eserler, silah ve mühimmat, uyuşturucu ve reçeteli ilaçlar, sahte/taklit ürünler, çalıntı mallar, koruma altındaki türlerden ürünler (fildişi vb.), resmi belgeler ve ahlaka aykırı materyaller kesinlikle yasaktır. Tam liste için "Yasaklı Ürünler" sözleşmesini inceleyebilirsiniz. Kurallara aykırı lotlar kaldırılır ve hesabınız askıya alınabilir.',
      },
    ],
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim() && !activeCategory) return FAQ_DATA;

    const query = searchQuery.toLowerCase().trim();

    return FAQ_DATA
      .filter(cat => !activeCategory || cat.id === activeCategory)
      .map(cat => ({
        ...cat,
        questions: cat.questions.filter(
          item =>
            !query ||
            item.q.toLowerCase().includes(query) ||
            item.a.toLowerCase().includes(query)
        ),
      }))
      .filter(cat => cat.questions.length > 0);
  }, [searchQuery, activeCategory]);

  const totalResults = filteredData.reduce((sum, cat) => sum + cat.questions.length, 0);

  const toggleItem = (key: string) => {
    setOpenItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-[900px] px-4">
          <div className="mb-4">
            <Link href="/" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors inline-flex items-center gap-2 text-sm">
              <ArrowLeft className="h-4 w-4" /> Ana Sayfa
            </Link>
          </div>

          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center rounded-full bg-[#d4af37]/10 p-4 mb-4">
              <HelpCircle className="h-10 w-10 text-[#d4af37]" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Yardım Merkezi</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Sıkça sorulan sorular ve platformumuz hakkında bilmeniz gereken her şey
            </p>
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Soru veya konu arayın..."
              className="w-full rounded-xl border border-border bg-card pl-12 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                Temizle
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !activeCategory
                  ? 'bg-[#d4af37] text-black'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Tümü
            </button>
            {FAQ_DATA.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-[#d4af37] text-black'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {cat.title}
              </button>
            ))}
          </div>

          {/* Search result count */}
          {searchQuery && (
            <p className="text-sm text-muted-foreground mb-4">
              {totalResults > 0
                ? `"${searchQuery}" için ${totalResults} sonuç bulundu`
                : `"${searchQuery}" için sonuç bulunamadı`}
            </p>
          )}

          {/* FAQ Categories & Accordion */}
          {filteredData.length === 0 ? (
            <div className="text-center py-16">
              <HelpCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Aramanızla eşleşen sonuç bulunamadı.</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory(null); }}
                className="mt-3 text-sm text-[#d4af37] hover:underline"
              >
                Tüm soruları göster
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredData.map(category => {
                const CatIcon = category.icon;
                return (
                  <div key={category.id}>
                    <div className="flex items-center gap-2 mb-4">
                      <CatIcon className="h-5 w-5 text-[#d4af37]" />
                      <h2 className="font-display text-lg font-semibold">{category.title}</h2>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {category.questions.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {category.questions.map((item, idx) => {
                        const key = `${category.id}-${idx}`;
                        const isOpen = openItems.has(key);
                        return (
                          <div
                            key={key}
                            className="rounded-xl border border-border bg-card overflow-hidden"
                          >
                            <button
                              onClick={() => toggleItem(key)}
                              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/50 transition-colors"
                            >
                              <span className="text-sm font-medium pr-4">{item.q}</span>
                              <ChevronDown
                                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                                  isOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <div className="px-5 pb-4 border-t border-border/50">
                                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line pt-3">
                                      {item.a}
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom CTA */}
          <div className="mt-12 rounded-xl border border-border bg-card p-8 text-center">
            <h3 className="font-display text-lg font-semibold mb-2">Sorunuz mu var?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Aradığınız cevabı bulamadıysanız bizimle iletişime geçin.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/iletisim"
                className="rounded-lg bg-[#d4af37] px-6 py-2.5 text-sm font-medium text-black hover:bg-[#c9a430] transition-colors"
              >
                İletişim Formu
              </Link>
              <a
                href="https://wa.me/905300422939"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-[#25D366] text-[#25D366] px-6 py-2.5 text-sm font-medium hover:bg-[#25D366]/10 transition-colors inline-flex items-center gap-2"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
