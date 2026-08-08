import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Scale, Shield, FileText, Cookie, Lock, Gavel, BookOpen, CreditCard, RotateCcw, Info, Banknote, Ban, ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getPaymentMode } from '@/lib/payment-mode';
import { getServiceFeeSettings } from '@/lib/revenue-model';

// Banka bilgileri Site Ayarları'ndan CANLI okunur; sabit metin değil.
export const dynamic = 'force-dynamic';

const LEGAL_PAGES: Record<string, { title: string; icon: string; sections: { heading: string; text: string }[] }> = {
  'kvkk': {
    title: 'Kişisel Verilerin Korunması (KVKK)',
    icon: 'Shield',
    sections: [
      { heading: '1. Veri Sorumlusu', text: 'MANES YAPI İNŞAAT SANAYİ TİCARET LİMİTED ŞİRKETİ, Kemeraltı Mah. 155 Sk. Yaşam 1322 No: 38 İç Kapı No: 8 Marmaris/Muğla, Marmaris Vergi Dairesi, Vergi No: 6121803775, Mersis No: 0612180377500001 (bundan böyle "Platform"), 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla kişisel verilerinizi aşağıda açıklanan amaçlar doğrultusunda işlemektedir.' },
      { heading: '2. İşlenen Kişisel Veriler', text: 'Platform tarafından işlenen kişisel veriler şunlardır:\n\n• Kimlik Bilgileri: Ad, soyad, T.C. kimlik numarası\n• İletişim Bilgileri: E-posta adresi, telefon numarası, adres bilgileri\n• Finansal Bilgiler: Banka hesap bilgileri (IBAN), ödeme bilgileri, fatura bilgileri\n• İşlem Güvenliği Bilgileri: IP adresi, çerez bilgileri, giriş/çıkış kayıtları, tarayıcı bilgileri\n• Müzayede İşlem Bilgileri: Teklif geçmişi, kazanılan lotlar, sipariş bilgileri, favori listesi\n• Şirket Bilgileri (Satıcılar için): Ticari unvan, vergi dairesi, vergi numarası, Mersis numarası' },
      { heading: '3. Kişisel Verilerin İşlenme Amaçları', text: 'Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:\n\n• Üyelik işlemlerinin gerçekleştirilmesi ve üye kimliğinin doğrulanması\n• Müzayede hizmetlerinin sunulması ve yönetilmesi\n• Teklif verme, ödeme ve sipariş süreçlerinin yürütülmesi\n• Yasal yükümlülüklerin yerine getirilmesi (vergi mevzuatı, tüketici hakları, MASAK vb.)\n• Platform güvenliğinin sağlanması ve dolandırıcılığın önlenmesi\n• İletişim, bilgilendirme ve hatırlatma faaliyetlerinin yürütülmesi\n• Satıcı onay ve denetim süreçlerinin yönetilmesi\n• Hizmet kalitesinin artırılması ve kullanıcı deneyiminin iyileştirilmesi\n• İstatistiksel analizlerin yapılması (anonim verilerle)' },
      { heading: '4. Kişisel Verilerin Aktarılması', text: 'Kişisel verileriniz aşağıdaki hallerde üçüncü kişilere aktarılabilir:\n\n• Müzayede sürecinin tamamlanması amacıyla satıcıya (yalnızca ödeme onayı sonrası teslimat için gerekli bilgiler)\n• Ödeme kuruluşlarına (ödeme işlemlerinin gerçekleştirilmesi için)\n• Kargo firmalarına (teslimat sürecinin yönetilmesi için)\n• Yasal zorunluluk halinde yetkili kamu kurum ve kuruluşlarına\n• Hukuki uyuşmazlıklarda mahkeme ve icra dairelerine\n\nÖdeme onaylanana kadar alıcı bilgileri satıcıdan gizli tutulmaktadır. Kişisel verileriniz hiçbir sebepten dolayı hiçbir kuruluş veya kurumla ticari amaçla paylaşılmamaktadır.' },
      { heading: '5. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi', text: 'Kişisel verileriniz; üyelik formu, satıcı başvuru formu, iletişim formu, teklif verme işlemleri, ödeme işlemleri ve çerezler aracılığıyla elektronik ortamda toplanmaktadır.\n\nHukuki sebepler:\n• Sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması (KVKK md. 5/2-c)\n• Veri sorumlusunun hukuki yükümlülüğü (KVKK md. 5/2-ç)\n• Veri sorumlusunun meşru menfaati (KVKK md. 5/2-f)\n• İlgili kişinin açık rızası (pazarlama faaliyetleri için)' },
      { heading: '6. Veri Saklama Süresi', text: 'Kişisel verileriniz, işleme amacının gerektirdiği süre boyunca ve yasal saklama süreleri kapsamında muhafaza edilecektir. Yasal sürelerin sona ermesinin ardından verileriniz silinecek, yok edilecek veya anonim hale getirilecektir.\n\n• Üyelik bilgileri: Üyelik süresince ve sonrasında 3 yıl\n• Finansal bilgiler: İlgili mevzuat gereği 10 yıl\n• İşlem kayıtları: 5651 sayılı Kanun gereği 2 yıl\n• Çerez verileri: İlgili çerez süresince' },
      { heading: '7. Veri Güvenliği', text: 'Platform, kişisel verilerinizin hukuka aykırı olarak işlenmesini, verilere hukuka aykırı olarak erişilmesini önlemek ve verilerin muhafazasını sağlamak amacıyla uygun güvenlik düzeyini temin etmeye yönelik gerekli teknik ve idari tedbirleri almaktadır. Bu kapsamda SSL şifreleme, güvenlik duvarı, erişim kontrolü ve düzenli güvenlik güncellemeleri uygulanmaktadır.' },
      { heading: '8. Çocukların Gizliliği', text: 'Platformumuz 18 yaşından küçük bireylere hizmet vermemektedir. 18 yaş altı bireylerin kişisel verileri bilerek toplanmaz. Böyle bir durumun tespiti halinde ilgili veriler derhal silinecektir.' },
      { heading: '9. Haklarınız (KVKK md. 11)', text: 'KVKK\'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:\n\na) Kişisel verilerinizin işlenip işlenmediğini öğrenme\nb) İşlenmişse buna ilişkin bilgi talep etme\nc) İşlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme\nç) Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme\nd) Eksik veya yanlış işlenmiş olması halinde düzeltilmesini isteme\ne) KVKK md. 7 kapsamında silinmesini veya yok edilmesini isteme\nf) Düzeltme/silme/yok etme işlemlerinin aktarıldığı üçüncü kişilere bildirilmesini isteme\ng) Münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme\nğ) Kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme' },
      { heading: '10. Başvuru Yöntemi', text: 'Yukarıda belirtilen haklarınızı kullanmak için bilgi@mezathane.tr adresine yazılı olarak veya platformdaki iletişim formu aracılığıyla başvurabilirsiniz. Başvurularınız en geç 30 gün içinde ücretsiz olarak yanıtlanacaktır. İşlemin ayrıca bir maliyet gerektirmesi halinde Kişisel Verileri Koruma Kurulu tarafından belirlenen tarifedeki ücret alınabilir.' },
    ],
  },
  'uyelik-sozlesmesi': {
    title: 'Üyelik Sözleşmesi',
    icon: 'BookOpen',
    sections: [
      { heading: '1. Taraflar', text: 'İşbu Üyelik Sözleşmesi, MANES YAPI İNŞAAT SANAYİ TİCARET LİMİTED ŞİRKETİ, Kemeraltı Mah. 155 Sk. Yaşam 1322 No: 38 İç Kapı No: 8 Marmaris/Muğla, Marmaris Vergi Dairesi, Vergi No: 6121803775, Mersis No: 0612180377500001 (bundan böyle "Platform") ile platforma üye olan gerçek veya tüzel kişi ("Üye") arasında, üyelik işleminin tamamlanması ile birlikte yürürlüğe girer.' },
      { heading: '2. Tanımlar', text: '• Platform: Mezathane.tr internet sitesi ve mobil uygulamaları\n• Üye: Platforma kayıt olarak üyelik sözleşmesini kabul eden gerçek veya tüzel kişi\n• Satıcı: Platformda müzayede düzenleme yetkisi verilen onaylı üye\n• Alıcı: Platformda teklif veren ve/veya müzayede kazanan üye\n• Müzayede: Platform üzerinden gerçekleştirilen online açık artırma\n• Lot: Müzayedede satışa sunulan her bir eser/ürün\n• Pey (Teklif): Bir lot için verilen fiyat teklifi\n• Alıcı Hizmet Bedeli: Müzayedeyi kazanan alıcıdan, satış bedeli üzerine %7 oranında alınan ve üzerine %20 KDV eklenen hizmet bedeli\n• Satıcı Komisyonu: Platformun aracılık hizmeti karşılığında satıcıdan aldığı, satıcı onay sürecinde belirlenen orandaki hizmet komisyonu' },
      { heading: '3. Üyelik Koşulları', text: '• Platforma üye olmak için 18 yaşını doldurmuş olmak zorunludur. 18 yaşından küçükler üye olamaz.\n• Üyelik başvurusunda verilen bilgilerin (ad, soyad, T.C. kimlik no, e-posta, telefon, adres) doğru ve güncel olması gerekmektedir.\n• Her kullanıcı yalnızca bir üyelik hesabı açabilir. Birden fazla hesap kullanan üyelerin tüm hesapları kapatılabilir.\n• Üye, hesap bilgilerinin gizliliğinden ve güvenliğinden bizzat sorumludur.\n• Üyelik başvurusu Platform tarafından değerlendirilir; uygun görülen her üyelik kabul edilir.' },
      { heading: '4. Üyenin Hak ve Yükümlülükleri', text: '• Üye, platformda yayınlanan müzayedelere katılma, teklif verme ve satın alma hakkına sahiptir.\n• Üye, verdiği tekliflerden sorumludur ve kazanılan müzayedelerde ödeme yükümlülüğünü kabul eder.\n• Üye, platformu yasalara uygun şekilde kullanmayı, sahte teklif vermemeyi, manipülatif davranışlarda bulunmamayı ve diğer üyelerin haklarına saygı göstermeyi taahhüt eder.\n• Üye, platform altyapısına zarar verecek, orantısız büyüklükte yük getirecek herhangi bir işlem yapamaz.\n• Platformun içeriği ve yazılımı, her türlü fikri ve mali hakkı Platforma aittir. Üyeler içerikleri kopyalayamaz, çoğaltamaz, değiştiremez.' },
      { heading: '5. Platformun Hak ve Yükümlülükleri', text: '• Platform, müzayede hizmetinin kesintisiz sunulması için azami gayreti gösterir, ancak teknik sorunlardan kaynaklanan kesintilerden sorumlu tutulamaz.\n• Platform, kurallara aykırı davranan üyelerin hesaplarını askıya alma veya kapatma hakkını saklı tutar.\n• Platform, üyelere ait kişisel verileri KVKK kapsamında korumakla yükümlüdür.\n• Platform, üye sayfalarında çeşitli formatlarda tanıtım veya reklam görüntüleri, yazıları veya bağlantıları yayınlama hakkına sahiptir.\n• Platform, dilediği üye veya üye grupları için reklam uygulaması yapabilir veya yapmayabilir.' },
      { heading: '6. Teklif Verme Kuralları', text: '• Verilen her teklif bağlayıcıdır ve geri alınamaz.\n• Teklif verebilmek için e-posta ve telefon doğrulaması yapılmış olmalıdır.\n• Müzayede Şartnamesi ve KVKK Aydınlatma Metni onaylanmış olmalıdır.\n• Teklifler, belirlenen minimum artış tutarına uygun olarak verilmelidir.\n• Müzayedeyi kazanan alıcının ödeme yükümlülüğünü yerine getirmemesi takdirde, bu işlemden doğacak her türlü alacak ve zarar için hukuki tahsil yöntemlerine başvurulur.' },
      { heading: '7. Ödeme ve Teslimat', text: 'Müzayedede verilen pey (teklif) tutarı, eserin KDV dahil satış bedelidir. Müzayedeyi kazanan alıcı, satış bedeline ek olarak satış bedelinin %7\'si oranında hizmet bedeli ve bu hizmet bedeli üzerinden %20 KDV öder. Ödenecek toplam tutar, teklif verme ekranında açıkça gösterilir. Örnek: 20.000 TL kazanan teklif için toplam ödeme 21.680 TL\'dir (20.000 + 1.400 hizmet bedeli + 280 KDV). Satıcıdan alınan hizmet komisyonu, satıcı onay sürecinde platform ile satıcı arasında belirlenen oran üzerinden satış bedelinden kesilir.\n\n• Ödeme, müzayede bitiminden itibaren belirtilen süre içinde (varsayılan 5 gün; müzayede bazında 2-7 gün arasında değişebilir) gerçekleştirilmelidir.\n• Satın alınan eserler için fatura, üye numarasına, ad, soyad ve adrese göre düzenlenmektedir.\n• Teslimat koşulları satıcı tarafından belirlenecek olup, detaylar sipariş onayı sonrası paylaşılacaktır.\n• Kargo firmasından kaynaklanan gecikmelerden Platform sorumlu tutulamaz.' },
      { heading: '8. Online Katalog ve Eser Bilgileri', text: '• Online müzayedede satışa sunulan eserlerin katalog değerleri, eserlerin final değerleri değil müzayede başlangıç fiyatıdır.\n• Eser hakkında verilen bilgiler ve her türlü ilan, taahhüt niteliğinde olmayıp genel bilgi niteliğindedir.\n• Alıcı bu durumu peşinen kabul eder.\n• Online müzayedelerde yer alan eserlerin fotoğrafları ve tanıtımı için verilen tüm bilgiler eksperlerin kanaatleridir.\n• 2863 sayılı Kültür ve Tabiat Varlıkları Kanunu kapsamına giren eserlerde, satıcı gerekli yasal izin ve belgeleri temin etmekle yükümlüdür. Platform bu belgelerin varlığını kontrol eder ancak eserlerin ekspertiz değerlendirmesinden satıcı sorumludur.' },
      { heading: '9. Fikri Mülkiyet Hakları', text: '• Platformun her türlü fikri ve mali hakkı Mezathane.tr\'ye aittir.\n• Üyeler, platform içeriklerini (yazı, fotoğraf, tasarım, yazılım) kopyalayamaz, çoğaltamaz, değiştiremez veya dağıtamaz.\n• Üyeler, platformu değer yaratacak bir içerik üretmeksizin, sadece ve doğrudan ticari tanıtım alanı olarak kullanamaz.\n• İzin alınmadan, kaynak gösterilerek dahi alıntı yapılamaz.' },
      { heading: '10. Üyeliğin Sona Ermesi', text: '• Üye, dilediği zaman hesabını kapatma talebinde bulunabilir. Ancak devam eden müzayede süreçleri (aktif teklifler, kazanılan ve ödemesi tamamlanmamış siparişler) varsa hesap kapatma işlemi bu süreçlerin tamamlanmasına kadar ertelenebilir.\n• Platform, sözleşme hükümlerine aykırı davranan üyelerin hesaplarını bildirimli veya bildirimsiz olarak askıya alabilir veya kapatabilir.\n• Kişisel üyelik sayfasını kapatırsa, o güne kadar ürettiği içeriğin Platform tarafından kullanım hakkı saklı kalacaktır.' },
      { heading: '11. Sorumluluk Sınırı', text: '• Platform, alıcı ve satıcı arasında aracı konumundadır; satıcı değildir.\n• Kullanıcı ve üyeler, hizmetin kullanılmasından dolayı uğrayabilecekleri zararlarla ilgili olarak Platform\'dan herhangi bir tazminat talep etmemeyi peşinen kabul etmişlerdir.\n• Platform, kullanıcı ve üyelerinin bilgilerinin yetkisiz kişilerce okunmasından, kullanıcı ve üyelerinin yazılım ve verilerine bu yolla gelebilecek herhangi bir zarardan dolayı sorumlu olmayacaktır.' },
      { heading: '12. Uyuşmazlık Çözümü', text: 'İşbu sözleşmeden doğabilecek uyuşmazlıklarda Türkiye Cumhuriyeti yasaları uygulanır. Uyuşmazlıkların çözümünde Muğla Mahkemeleri ve İcra Daireleri yetkilidir. Tüketici işlemlerinden kaynaklanan uyuşmazlıklarda 6502 sayılı Kanun uyarınca Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri de yetkilidir.' },
    ],
  },
  'muzayede-sartnamesi': {
    title: 'Müzayede Şartnamesi',
    icon: 'Gavel',
    sections: [
      { heading: '1. Genel Kurallar', text: 'Mezathane.tr platformunda gerçekleştirilen tüm müzayedeler işbu şartnameye tabidir. Müzayedeye katılan her kullanıcı bu şartnameyi okuduğunu, anladığını ve kabul ettiğini beyan eder. Müzayedeler Türk Lirası (₺) üzerinden gerçekleştirilir. Müzayedede verilen pey (teklif) tutarları eserin KDV dahil satış bedelidir.' },
      { heading: '2. Müzayedeye Katılım Şartları', text: 'Müzayedeye katılabilmek için:\n\n• Mezathane.tr üyesi olmak\n• E-posta ve telefon doğrulamasını tamamlamış olmak\n• Müzayede Şartnamesi ve KVKK Aydınlatma Metnini onaylamış olmak\n\nBu şartlardan herhangi birini sağlamayan kullanıcılar teklif veremez.' },
      { heading: '3. Teklif Verme', text: '• Her teklif bağlayıcıdır, verildikten sonra geri alınamaz ve iptal edilemez.\n• Teklifler, belirlenen minimum artış tutarına uygun olmalıdır. Minimum artış tutarı, mevcut fiyata göre otomatik olarak hesaplanır.\n• Otomatik Teklif (Proxy Bidding): Kullanıcı maksimum bir tutar belirler, sistem otomatik olarak bu tutara kadar en düşük gerekli teklifi verir.\n• Online müzayedede pey vermek suretiyle yapılmış olduğu teklif ile bağlıdır. Müzayede konusu eşya, önceden belirlenen müzayede bitiş saati itibariyle en yüksek teklifle bulunan alıcıya ihale edilir.' },
      { heading: '4. Anti-Sniping (Süre Uzatma) Kuralı', text: 'Yazılı (Online) Müzayedeler: Müzayede bitimine son 60 saniye kala herhangi bir teklif verilmesi halinde, müzayede süresi otomatik olarak 60 saniye daha uzatılır.\n\nCanlı Müzayedeler: Canlı müzayede sırasında verilen her yeni teklif, kalan süreyi otomatik olarak 10 saniye uzatır; böylece tüm katılımcılara yanıt verme fırsatı tanınır.\n\nBu kurallar adil bir rekabet ortamı sağlamak amacıyla uygulanmaktadır. Son dakika koruması sayesinde tüm katılımcılara eşit fırsat tanınır.' },
      { heading: '5. Kazanan Teklif ve Ödeme', text: '• Müzayede süresi dolduğunda en yüksek teklifi veren kullanıcı müzayedeyi kazanır.\n\nMüzayedede verilen pey (teklif) tutarı, eserin KDV dahil satış bedelidir. Müzayedeyi kazanan alıcı, satış bedeline ek olarak satış bedelinin %7\'si oranında hizmet bedeli ve bu hizmet bedeli üzerinden %20 KDV öder. Ödenecek toplam tutar, teklif verme ekranında açıkça gösterilir. Örnek: 20.000 TL kazanan teklif için toplam ödeme 21.680 TL\'dir (20.000 + 1.400 hizmet bedeli + 280 KDV). Satıcıdan alınan hizmet komisyonu, satıcı onay sürecinde platform ile satıcı arasında belirlenen oran üzerinden satış bedelinden kesilir.\n\n• Ödeme, müzayede bitiminden itibaren belirtilen süre içinde tamamlanmalıdır. Süresinde ödenmeyen siparişler iptal edilebilir ve kullanıcı hesabı kısıtlanabilir.\n• Ödemesi yapılmayan siparişler için cezai şart uygulanabilir.' },
      { heading: '6. Komisyon ve Ücretler', text: '• Alıcı hizmet bedeli oranı %7 olup, bu bedel üzerinden %20 KDV alınır; toplam tutar teklif verme ekranında ve müzayede detay sayfasında açıkça gösterilir.\n• Platform, aracı kuruluş sıfatıyla satıcıya hizmet komisyonu faturası keser; bu oran satıcı onay sürecinde belirlenir.\n• Fatura kesilmesi Platform\'un satıcı olduğunu göstermez; Platform aracılık hizmeti sunmaktadır.' },
      { heading: '7. Teslimat ve İade', text: '• Ödeme onaylandıktan sonra satıcı, belirtilen süre içinde ürünü alıcıya gönderir.\n• Hedeflenen kargo teslim süresi şehir içi ve şehir dışı için 7 gündür. Mevzuat gereği azami teslim süresi 30 gündür.\n• Ürün açıklamasına uymayan veya hasarlı gönderilen ürünler için alıcı, teslim tarihinden itibaren 7 gün içinde itiraz edebilir. Alıcı bu süre içinde teslim onayı vermez veya itiraz bildirmezse, teslimat otomatik olarak onaylanmış sayılır.\n• Alıcı, ürünü teslim aldığı anda kontrol etmekle yükümlüdür. Kargodan kaynaklanan hasar varsa kargo firması yetkilisine tutanak tutturmakla sorumludur.\n• İtiraz süreci platform tarafından değerlendirilir.' },
      { heading: '8. Yasaklı Davranışlar', text: 'Şunlar kesinlikle yasaktır:\n\n• Sahte veya manipülatif teklif verme (shill bidding)\n• Kendi lotlarına teklif verme\n• Birden fazla hesap kullanarak teklif verme\n• Müzayede sürecini manipüle etmeye çalışma\n• Diğer kullanıcıları yanıltıcı bilgi paylaşma\n• Platform altyapısına zarar verme veya orantısız yük oluşturma\n\nBu kurallara aykırı davranan kullanıcıların hesapları derhal kapatılır ve hukuki işlem başlatılır.' },
      { heading: '9. Sorumluluk Sınırı', text: '• Platform, alıcı ve satıcı arasında aracı konumundadır. Ürünlerin niteliği, özgünlüğü ve durumu konusunda satıcı sorumludur.\n• Platform, ürün açıklamalarının doğruluğunu garanti etmez, ancak şikâyet süreçlerini yönetir.\n• Online müzayede eserleri sadece Türkiye adreslerine teslim edilir.' },
    ],
  },
  'yasakli-urunler': {
    title: 'Yasaklı Ürünler',
    icon: 'Ban',
    sections: [
      { heading: '1. Genel İlke', text: 'Mezathane.tr platformunda yalnızca yürürlükteki mevzuata uygun, satışı serbest ürünler müzayedeye sunulabilir. Satıcılar, listeledikleri tüm ürünlerin yasal olarak satılabilir olduğunu, üzerlerinde tasarruf yetkilerinin bulunduğunu ve ürünlerin üçüncü kişilerin haklarını ihlal etmediğini taahhüt eder. Aşağıda belirtilen ürünlerin platforma eklenmesi kesinlikle yasaktır. Bu kurala aykırı hareket eden satıcıların lotları kaldırılır, hesapları askıya alınır veya kapatılır ve gerektiğinde yetkili mercilere bildirimde bulunulur.' },
      { heading: '2. Kültür ve Tabiat Varlıkları', text: '• 2863 sayılı Kültür ve Tabiat Varlıklarını Koruma Kanunu kapsamında bulunan ve satışı/devri izne tabi olan gerçek arkeolojik eserler ve tarihi eserler.\n• Devlete ait olan, yurt dışına çıkarılması veya izinsiz ticareti yasak olan kültür varlıkları.\n• Bakanlık izni/belgesi olmadan satışa sunulan koruma altındaki eserler.\n\nNot: Mevzuata uygun, belgeli ve satışı serbest antika/koleksiyon ürünleri bu kapsamda değildir; satıcı belge ve uygunluktan sorumludur. Benzer şekilde, koleksiyoner/nümismatik değeri taşıyan sikkeler (tedavülden kalkmış hatıra ve koleksiyon paraları, belgeli antik sikkeler vb.) satışa sunulabilir; satıcı eserin yasal satılabilirliğini ve gerekli belgeleri temin etmekle yükümlüdür.' },
      { heading: '3. Silah, Mühimmat ve Tehlikeli Maddeler', text: '• Ateşli silahlar, havalı silahlar, mühimmat, fişek ve bunların parçaları.\n• Kesici, delici, saldırı amaçlı silahlar (bıçak koleksiyonu istisnaları dahi platform onayına tabidir).\n• Patlayıcılar, yanıcı/parlayıcı maddeler, piroteknik ürünler.\n• Tehlikeli kimyasallar, radyoaktif maddeler ve zehirli maddeler.' },
      { heading: '4. Uyuşturucu, İlaç ve Sağlık Ürünleri', text: '• Uyuşturucu ve uyarıcı maddeler, bunların kullanımına yönelik aparatlar.\n• Reçeteli/reçetesiz ilaçlar, medikal cihazlar ve sağlık beyanı içeren ürünler.\n• İçeriği denetlenemeyen takviye edici gıda ve kozmetik ürünleri.' },
      { heading: '5. Sahte, Taklit ve Telif İhlali İçeren Ürünler', text: '• Marka taklidi (replika) ürünler, sahte saat, çanta, mücevher vb.\n• Sahte imza, sahte ekspertiz/sertifika ile değeri yükseltilmiş eserler.\n• Korsan/çoğaltılmış dijital içerik, telif hakkı ihlali içeren materyaller.\n• Orijinalliği belgelenemeyen ve eser sahibine ait olmayan kopyalar.' },
      { heading: '6. Çalıntı, Kaçak ve Haczedilmiş Mallar', text: '• Çalıntı, gasp veya kaçak yollarla elde edilmiş ürünler.\n• Üzerinde yasal tasarruf yetkisi bulunmayan, başkasına ait mallar.\n• Haczedilmiş veya satışı yargı kararıyla kısıtlanmış ürünler.' },
      { heading: '7. Canlı Varlıklar ve Koruma Altındaki Türler', text: '• Canlı hayvanlar ve insan kalıntıları/organları.\n• CITES sözleşmesi kapsamında koruma altındaki türlerden elde edilen ürünler (fildişi, kaplumbağa kabuğu, nesli tehlikedeki hayvan/bitki ürünleri vb.).\n• Avlanması veya ticareti yasak doğal türlere ait parçalar.' },
      { heading: '8. Resmi Belgeler ve Kişisel Veriler', text: '• Kimlik kartı, pasaport, ehliyet gibi resmi/kişiye özel belgeler.\n• Askeri malzeme, üniforma ve resmi kurum evrakı (mevzuatın izin vermediği haller).\n• Üçüncü kişilere ait kişisel veri içeren belge, liste veya arşivler.' },
      { heading: '9. Ahlaka Aykırı ve Yasak İçerikler', text: '• Müstehcen/pornografik materyaller.\n• Şiddeti, ırkçılığı, nefret söylemini veya yasa dışı örgütleri öven ürün ve materyaller.\n• Kamu düzenini, genel ahlakı ve milli değerleri zedeleyen içerikler.' },
      { heading: '10. Diğer Kısıtlı Ürünler', text: '• Alkollü içecekler ve tütün ürünleri (özel izin ve mevzuat gerektirir).\n• Sahte/tedavülden kalkmış para, döviz ve değerli maden ticaretinde mevzuata aykırı işlemler.\n• Platformun uygun görmediği, niteliği şüpheli veya açıklaması yanıltıcı diğer ürünler.\n\nTereddüt ettiğiniz ürünler için lot eklemeden önce bilgi@mezathane.tr adresinden bizimle iletişime geçiniz. Platform, herhangi bir ürünü gerekçe göstermeksizin yayından kaldırma hakkını saklı tutar.' },
    ],
  },
  'satici-sozlesmesi': {
    title: 'Satıcı Sözleşmesi',
    icon: 'FileText',
    sections: [
      { heading: '1. Taraflar ve Yürürlük', text: 'İşbu Satıcı Sözleşmesi ("Sözleşme"), Mezathane.tr platformunu işleten MANES YAPI İNŞAAT SANAYİ TİCARET LİMİTED ŞİRKETİ ("Platform") ile Platform üzerinde müzayede düzenleme yetkisi almış gerçek veya tüzel kişi ("Satıcı") arasında, Satıcı\'nın bu yetkiyi kullanarak Platformda ilk müzayedesini yayınlamasıyla yürürlüğe girer. İşbu Sözleşme, Üyelik Sözleşmesi\'ne ek ve tamamlayıcı niteliktedir; Satıcı, Üye sıfatıyla ayrıca Üyelik Sözleşmesi\'ne ve KVKK Aydınlatma Metni\'ne de tabidir.' },
      { heading: '2. Platformun Rolü', text: 'Platform, 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun kapsamında ARACI HİZMET SAĞLAYICIDIR. Platform, müzayedeye sunulan ürünlerin satıcısı değildir; Satıcı ile Alıcı arasındaki mesafeli satış sözleşmesinin tarafı değildir. Platformun bu Sözleşme kapsamındaki rolü, Satıcı ile Alıcı\'yı bir araya getiren teknik altyapıyı sağlamak ve işbu Sözleşme\'de tanımlanan asgari standartların uygulanmasını denetlemektir.' },
      { heading: '3. Satıcının Taahhüdü — Kendi Yasal Belgeleri', text: 'Satıcı, Platform üzerinden gerçekleştirdiği her satış için, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği\'ne uygun olarak kendi (a) Mesafeli Satış Sözleşmesi\'ni, (b) Ön Bilgilendirme Formu\'nu ve (c) İptal ve İade Koşulları\'nı hazırlamayı, güncel tutmayı ve kendi profil sayfasında ("Satış Şartları") yayınlamayı kabul, beyan ve taahhüt eder. Bu belgelerin içeriği tamamen Satıcı\'ya aittir; Platform bu belgeler için örnek metin veya şablon sağlamaz, içeriğine müdahale etmez ve içeriği hukuken onaylamış sayılmaz. Nereden başlayacağını bilmeyen Satıcı, Platformun sağladığı örnek metinlere `/satici/yasal-referans` adresinden bakabilir; bu metinleri kullanıp kullanmamak Satıcı\'nın tercihidir.' },
      { heading: '4. Asgari Standart', text: 'Satıcı\'nın 3. maddedeki belgelerinde en az şu unsurlar bulunmalıdır:\n\na) Mesafeli Satış Sözleşmesi: Satıcı bilgileri (unvan/adres/vergi dairesi/vergi no), ürün/fiyat/ödeme bilgisi, teslimat süresi ve şekli, cayma hakkının kapsamı ve istisnaları, uyuşmazlık halinde yetkili merci.\nb) Ön Bilgilendirme Formu: Sözleşme kurulmadan önce Alıcı\'ya sunulacak (a)\'daki tüm bilgiler, ayrıca sipariş konusu edimin yerine getirilememesi halinde uygulanacak bildirim ve iade usulü.\nc) İptal ve İade Koşulları: Ayıplı/açıklamaya uygun olmayan üründe Alıcı\'nın başvuru yapabileceği süre ve iletişim kanalı, haklı bulunan iade taleplerinde ürün bedelinin kaç gün içinde iade edileceği, hasarlı teslimatta izlenecek yol.\n\nMüzayede yoluyla satışlarda, 6502 sayılı Kanun md. 53/ç gereği cayma hakkının bulunmadığı bu belgelerde açıkça belirtilmelidir.' },
      { heading: '5. Platformun Denetim ve Onay Hakkı', text: 'Platform, Satıcı başvurusu sırasında ve Satıcı hesabı aktif olduğu sürece, 3. ve 4. maddedeki belgelerin varlığını ve asgari standarda uygunluğunu denetler. Belgesi eksik, güncel olmayan veya mevzuata aykırı bulunan başvuru onaylanmaz; mevcut Satıcı\'dan düzeltme talep edilebilir ve düzeltme yapılmadığı sürece Satıcı\'nın yeni müzayede açması Platform tarafından kısıtlanabilir.' },
      { heading: '6. Sorumluluk', text: 'Belgelerin hukuki yeterliliğinden, güncelliğinden ve mevzuata uygunluğundan münhasıran Satıcı sorumludur. Platform bir hukuk bürosu değildir; 5. maddedeki denetim faaliyeti, Satıcı\'nın belgesinin hukuken onaylandığı anlamına gelmez. Satıcı\'nın kendi belgesindeki eksiklik veya mevzuata aykırılıktan doğan zararlardan Platform sorumlu tutulamaz; Satıcı bu kapsamda Platform\'a yöneltilebilecek taleplere karşı Platform\'u tazmin etmeyi kabul eder.' },
      { heading: '7. İhlal ve Fesih', text: 'Satıcı\'nın işbu Sözleşme\'ye aykırı davranması (belgesinin bulunmaması, mevzuata aykırı olması, düzeltme talebine uyulmaması) halinde Platform, Satıcı\'nın müzayede düzenleme yetkisini bildirimli veya bildirimsiz olarak askıya alabilir veya sona erdirebilir. Bu durum, Satıcı\'nın Üye sıfatını veya Üyelik Sözleşmesi\'nden doğan haklarını etkilemez.' },
      { heading: '8. Değişiklik ve Yürürlük', text: 'Platform, işbu Sözleşme\'yi ve 4. maddedeki asgari standardı dilediği zaman güncelleyebilir; güncel metin Platformda yayımlandığı anda yürürlüğe girer. Önemli değişiklikler Satıcı\'ya ayrıca bildirilir.' },
      { heading: '9. Uyuşmazlık', text: 'İşbu Sözleşme\'den doğabilecek Platform-Satıcı uyuşmazlıklarında Türk hukuku uygulanır; Muğla Mahkemeleri ve İcra Daireleri yetkilidir. Satıcı\'nın kendi Mesafeli Satış Sözleşmesi\'nden Alıcı ile arasında doğabilecek uyuşmazlıklarda ise Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir; Platform bu uyuşmazlıklarda taraf değildir, talep halinde arabuluculuk yapabilir.' },
    ],
  },
  'banka-hesap': {
    title: 'Banka Hesap Bilgileri',
    icon: 'Banknote',
    sections: [
      { heading: 'Ödeme Bilgileri', text: 'Müzayede sonrası ödemelerinizi aşağıdaki banka hesap bilgilerini kullanarak havale/EFT yoluyla gerçekleştirebilirsiniz. Ödeme yaparken açıklama kısmına üye numaranızı ve sipariş numaranızı yazmayı unutmayınız.' },
      { heading: 'Havale/EFT Hesap Bilgileri', text: 'Banka hesap bilgileri sipariş onayı sonrasında tarafınıza e-posta ile iletilecektir.\n\nÖdeme detayları müzayede bazında değişiklik gösterebilir. Her müzayedenin kendi ödeme koşulları, satıcı tarafından müzayede açıklamasında belirtilmektedir.\n\nÖdeme süreleri ve koşulları hakkında detaylı bilgi için ilgili müzayede sayfasını inceleyiniz veya bilgi@mezathane.tr adresinden bizimle iletişime geçiniz.' },
      { heading: 'Ödeme Süresi', text: 'Müzayedeyi kazandıktan sonra ödemenizi, müzayede detayında belirtilen süre içinde (varsayılan 5 gün; müzayede bazında 2-7 gün arasında değişebilir) tamamlamanız gerekmektedir. Süresinde yapılmayan ödemeler için cezai işlem uygulanabilir ve hesabınız kısıtlanabilir.' },
      { heading: 'Önemli Uyarılar', text: '• Ödeme yaparken mutlaka sipariş/lot numaranızı belirtiniz.\n• Başka bir kişi adına yapılan ödemeler kabul edilmeyebilir.\n• Ödeme onayı, havale/EFT tutarının hesaba geçmesi ile tamamlanır.\n• Ödeme sorunları için bilgi@mezathane.tr adresinden destek alabilirsiniz.' },
    ],
  },
  'cerez': {
    title: 'Çerez Politikası',
    icon: 'Cookie',
    sections: [
      { heading: '1. Çerez Nedir?', text: 'Çerezler, web siteleri tarafından tarayıcınıza gönderilen ve cihazınızda saklanan küçük metin dosyalarıdır. Mezathane.tr platformu, size daha iyi bir deneyim sunmak ve hizmetlerimizi geliştirmek amacıyla çerezler kullanmaktadır.' },
      { heading: '2. Kullanılan Çerez Türleri', text: 'Zorunlu Çerezler: Platformun temel işlevlerinin (oturum yönetimi, teklif takibi, güvenlik) çalışması için gereklidir. Bu çerezler devre dışı bırakılamaz.\n\nPerformans Çerezleri: Sayfaların yüklenme hızını ve kullanıcı etkileşimlerini ölçmek için kullanılır. Toplanan veriler anonimdir.\n\nİşlevsel Çerezler: Dil tercihi, tema seçimi gibi kişiselleştirme ayarlarınızı hatırlamak için kullanılır.\n\nOturum Çerezleri: Giriş yaptıktan sonra oturumunuzun açık kalmasını sağlar. Tarayıcı kapatıldığında silinir.' },
      { heading: '3. Tarayıcı Çerezleri', text: 'Teknik iletişim dosyası (çerez), siteyi kaç kişinin ziyaret ettiğini, bir kişinin siteyi hangi amaçla, kaç kez ziyaret ettiğini ve ne kadar sitede kaldıkları hakkında istatistiksel bilgileri elde etmeye ve kullanıcılar için özel tasarlanmış kullanıcı sayfalarından dinamik olarak reklam ve içerik üretilmesine yardımcı olur. Teknik iletişim dosyası, ana bellekte veya e-postanızdan veri ya da başkaca herhangi bir kişisel bilgi almak için tasarlanmamıştır.' },
      { heading: '4. Üçüncü Taraf Çerezleri', text: 'Platformumuzda analitik ve performans ölçümü amacıyla üçüncü taraf çerezleri kullanılabilir. Bu çerezler, kullanıcı davranışlarını anonim olarak analiz etmek ve hizmetlerimizi iyileştirmek için kullanılır.' },
      { heading: '5. Çerez Yönetimi', text: 'Çerezleri tarayıcınızın ayarlarından yönetebilir veya silebilirsiniz. Ancak zorunlu çerezlerin devre dışı bırakılması platformun düzgün çalışmasını engelleyebilir. Tarayıcınızın pek çoğu başta teknik iletişim dosyasını kabul eder biçimde tasarlanmıştır ancak kullanıcılar dilerse teknik iletişim dosyasının gelmemesi veya teknik iletişim dosyasının gönderildiğinde uyarı verilmesini sağlayacak biçimde ayarları değiştirebilirler.' },
      { heading: '6. Değişiklikler', text: 'Mezathane.tr, çerez politikası hükümlerini dilediği zaman sitede yayınlamak veya kullanıcılara elektronik posta göndermek veya sitesinde yayınlamak suretiyle değiştirebilir. Çerez Politikası hükümleri değiştiği takdirde, yayınlandığı tarihte yürürlük kazanır.' },
    ],
  },
  'gizlilik': {
    title: 'Gizlilik Politikası',
    icon: 'Lock',
    sections: [
      { heading: '1. Genel', text: 'Mezathane.tr platformu, üyelerinin ve ziyaretçilerinin gizliliğine büyük önem vermektedir. Bu gizlilik politikası, platformumuz aracılığıyla toplanan kişisel verilerin nasıl toplandığı, kullanıldığı, paylaşıldığı ve korunduğunu açıklamaktadır.' },
      { heading: '2. Toplanan Bilgiler', text: 'Platform, çeşitli amaçlarla kişisel veriler toplayabilir. Aşağıda, toplanan kişisel verilerin nasıl ve ne şekilde toplandığı, bu verilerin nasıl ve ne şekilde korunduğu belirtilmiştir.\n\nÜyelik veya platformumuz üzerindeki çeşitli form ve anketlerin doldurulması suretiyle üyelerin kendileriyle ilgili bir takım kişisel bilgileri (isim-soyisim, firma bilgileri, telefon, adres veya e-posta adresleri gibi) platformumuz tarafından işin doğası gereği toplanmaktadır.' },
      { heading: '3. Bilgilerin Kullanımı', text: '• Üyelik işlemlerinin gerçekleştirilmesi ve hesap yönetimi\n• Müzayede hizmetlerinin sunulması\n• Sipariş ve ödeme süreçlerinin yönetilmesi\n• Yasal yükümlülüklerin yerine getirilmesi\n• İletişim ve bilgilendirme amaçları\n• Platform güvenliğinin sağlanması' },
      { heading: '4. Pazarlama İletişimi', text: 'Platform bazı dönemlerde müşterilerine ve üyelerine yeni ürünler hakkında bilgiler, promosyon gönderebilir. Üyelerimiz bu gibi bilgileri alıp almama konusunda her türlü seçimi üye olurken yapabilir, sonrasında üye girişi yaptıktan sonra hesap bilgileri bölümünden bu seçimi değiştirebilir ya da kendisine gelen bilgilendirme iletisindeki linkle bildirim yapabilir.' },
      { heading: '5. Bilgilerin Paylaşımı', text: 'Üyelerimiz tarafından platformumuza elektronik ortamdan iletilen kişisel bilgiler, üyelerimiz ile yaptığımız "Kullanıcı Sözleşmesi" ile belirlenen amaçlar ve kapsam dışında üçüncü kişilere açıklanmayacaktır.\n\nKişisel verileriniz hiçbir sebepten dolayı hiçbir kuruluş veya kurumla ticari amaçla paylaşılmamaktadır.' },
      { heading: '6. İstisnai Haller', text: 'Aşağıda belirtilen sınırlı hallerde Platform, işbu "Gizlilik Politikası" hükümleri dışında kullanıcılara ait bilgileri üçüncü kişilere açıklayabilir:\n\n1. Kanun, Kanun Hükmünde Kararname, Yönetmelik ve yetkili hukuki otorite tarafından çıkarılan ve yürürlükte olan hukuk kurallarının getirdiği zorunluluklara uymak\n2. Platformumuzun kullanıcılarla akdettiği "Üyelik Sözleşmesi" ve diğer sözleşmelerin gereklerini yerine getirmek ve bunları uygulamaya koymak amacıyla\n3. Yetkili idari ve adli otorite tarafından usulüne göre yürütülen bir araştırma veya soruşturma amacıyla kullanıcılarla ilgili bilgi talep edilmesi\n4. Kullanıcıların hakları veya güvenliklerini korumak için bilgi vermenin gerekli olduğu haller' },
      { heading: '7. E-Posta Güvenliği', text: 'Platformumuzun Müşteri Hizmetleri\'ne, herhangi bir siparişinizle ilgili olarak göndereceğiniz e-postalarda, asla kredi kartı numaranızı veya şifrelerinizi yazmayınız. E-postalarda yer alan bilgiler üçüncü şahıslar tarafından görülebilir. Platform e-postalarınızdan aktarılan bilgilerin güvenliğini hiçbir koşulda garanti edemez.' },
      { heading: '8. IP Adresi ve Sistem Bilgileri', text: 'Sistemle ilgili sorunların tanımlanması ve verilen hizmet ile ilgili çıkabilecek sorunların veya uyuşmazlıkların hızla çözülmesi için Platform, üyelerinin IP adresini kaydetmekte ve bunu kullanmaktadır. IP adresleri, kullanıcıları genel bir şekilde tanımlamak ve kapsamlı demografik bilgi toplamak amacıyla da kullanılabilir.' },
      { heading: '9. Değişiklikler', text: 'Platform, işbu "Gizlilik Politikası" hükümlerini dilediği zaman sitede yayınlamak veya kullanıcılara elektronik posta göndermek veya sitesinde yayınlamak suretiyle değiştirebilir. Gizlilik Politikası hükümleri değiştiği takdirde, yayınlandığı tarihte yürürlük kazanır.' },
    ],
  },
  'kullanim-kosullari': {
    title: 'Kullanım Koşulları',
    icon: 'Scale',
    sections: [
      { heading: '1. Genel', text: 'Bu Kullanım Koşulları, Mezathane.tr internet sitesi ve mobil uygulamalarının (kısaca "Platform") kullanımına ilişkin genel esasları düzenler. Platformu ziyaret ederek veya kullanarak bu koşulları kabul etmiş sayılırsınız. Üyelik, müzayede, kişisel veri ve çerez konularındaki ayrıntılı kurallar; Üyelik Sözleşmesi, Müzayede Şartnamesi, Satıcı Sözleşmesi, KVKK Aydınlatma Metni, Gizlilik Politikası ve Çerez Politikası ile birlikte geçerlidir.\n\nMesafeli Satış Sözleşmesi, Ön Bilgilendirme Formu ve İptal/İade Koşulları\'nın alıcıyı bağlayan asıl hali, ilgili satıcının kendi profil sayfasında ("Satış Şartları") yayınladığı belgedir; Platform ile Satıcı arasındaki Satıcı Sözleşmesi, satıcıların bu belgeleri hazırlaması/güncel tutması yükümlülüğünü ve bunun denetimini düzenler, alıcıyı bağlayan sözleşme değildir. Bir çelişki halinde ilgili özel sözleşme hükümleri esas alınır.' },
      { heading: '2. Platformun Rolü', text: 'Mezathane.tr, satıcılar ile alıcıları bir araya getiren bir aracı hizmet sağlayıcısıdır ("aracı kuruluş"). Platform, müzayedeye sunulan eserlerin satıcısı değildir; lotların gerçekliği, açıklamalara uygunluğu ve teslimi öncelikle ilgili satıcının sorumluluğundadır. Platform, taraflar arasında güvenli bir işlem ortamı sunar ve uyuşmazlıklarda arabuluculuk yapabilir.' },
      { heading: '3. Üyelik ve Hesap Güvenliği', text: '• Platformun teklif verme gibi özelliklerini kullanmak üyelik ve e-posta doğrulaması gerektirir.\n• Üye, hesabına ait giriş bilgilerinin gizliliğinden ve hesabı üzerinden yapılan tüm işlemlerden bizzat sorumludur.\n• Üye, kayıt sırasında doğru ve güncel bilgi vermekle yükümlüdür.\n• 18 yaşından küçükler Platformda işlem yapamaz.' },
      { heading: '4. Teklif ve Ödemenin Bağlayıcılığı', text: '• Bir lota verilen pey (teklif) bağlayıcıdır; müzayedeyi kazanan alıcı, satış bedeli ile birlikte satış bedelinin %7\'si oranındaki alıcı hizmet bedelini ve bu bedel üzerinden %20 KDV\'yi ödemekle yükümlüdür. Ödenecek toplam tutar teklif ekranında açıkça gösterilir.\n• Ödeme, müzayede bitiminden itibaren belirtilen süre içinde (varsayılan 5 gün; müzayede bazında 2-7 gün arasında değişebilir) yapılmalıdır.\n• Süresinde ödenmeyen siparişler iptal edilebilir, kullanıcı hesabı kısıtlanabilir ve cezai şart uygulanabilir.\n• Müzayede yoluyla yapılan satışlar yasa gereği cayma hakkı kapsamı dışındadır; ayrıntılar İptal ve İade Koşulları sayfasındadır.' },
      { heading: '5. Yasaklı Davranışlar', text: 'Platformu kullanırken aşağıdakiler yasaktır:\n• Yürürlükteki mevzuata veya Yasaklı Ürünler listesine aykırı eser sunmak.\n• Gerçek dışı, yanıltıcı veya başkasına ait bilgi/görsel kullanmak.\n• Müzayede sürecini manipüle etmek (örneğin fiyatı yapay biçimde artırmaya yönelik danışıklı teklifler).\n• Platformun güvenliğini tehdit eden, otomatik veri toplama (bot/scraping) dahil, teknik müdahalelerde bulunmak.\n• Başka kullanıcıları taciz eden, hakaret içeren veya hukuka aykırı içerik paylaşmak.' },
      { heading: '6. Fikri Mülkiyet', text: 'Platformun tasarımı, yazılımı, logosu ve içeriği Mezathane.tr\'ye veya ilgili hak sahiplerine aittir ve izinsiz kullanılamaz. Satıcılar, yükledikleri görsel ve açıklamaların kullanım haklarına sahip olduklarını ve bunları Platformda yayımlama yetkisi verdiklerini kabul eder.' },
      { heading: '7. Sorumluluğun Sınırlandırılması', text: 'Platform, hizmetin kesintisiz ve hatasız olacağını taahhüt etmez; bakım, teknik arıza veya mücbir sebep hallerinde hizmete ara verilebilir. Satıcı ile alıcı arasındaki satış ilişkisinden doğan sorumluluk taraflara aittir. Platformun sorumluluğu, ilgili sözleşmelerde ve yürürlükteki mevzuatta öngörülen sınırlar çerçevesindedir.' },
      { heading: '8. Koşullarda Değişiklik', text: 'Mezathane.tr, bu Kullanım Koşulları\'nı ve ilgili sözleşmeleri güncelleme hakkını saklı tutar. Güncel metin Platformda yayımlandığı anda yürürlüğe girer. Önemli değişiklikler, mümkün olduğunca üyelere ayrıca bildirilir.' },
      { heading: '9. Uygulanacak Hukuk', text: 'Bu koşulların yorum ve uygulanmasında yürürlükteki Türk hukuku geçerlidir. Uyuşmazlıkların çözümüne ilişkin usul ve yetkili merciler, Üyelik Sözleşmesi ile tüketici mevzuatı hükümlerine tabidir.' },
    ],
  },
};

const SIDEBAR_ORDER = [
  'kvkk',
  'uyelik-sozlesmesi',
  'muzayede-sartnamesi',
  'yasakli-urunler',
  'satici-sozlesmesi',
  'banka-hesap',
  'gizlilik',
  'cerez',
  'kullanim-kosullari',
];

const ICONS: Record<string, any> = { Scale, Shield, FileText, Cookie, Lock, Gavel, BookOpen, CreditCard, RotateCcw, Info, Banknote, Ban };

// ─────────────────────────────────────────────────────────────────────────────
// DIRECT (V2 / doğrudan ödeme) modu için YASAL METİN OVERRIDE'LARI.
// Yalnızca ödeme/komisyon/iade AKIŞI değişen bölümleri değiştirir; ESCROW (V1) metinleri
// LEGAL_PAGES içinde olduğu gibi durur → flag ESCROW'a dönünce eski metinler geri gelir.
// Model: Platform = ARACI HİZMET SAĞLAYICI (6563 sayılı E-Ticaret Kanunu). Satış sözleşmesi
// ALICI ile SATICI arasındadır. Alıcı, satış bedelini + satıcının belirlediği komisyonu + %20
// KDV'yi DOĞRUDAN satıcıya öder; platform ürün bedelini taraf olarak tahsil etmez. Platform geliri,
// satıcının önceden aldığı "Müzayede Hakkı"dır. (2026-08-08 düzeltme: bu V2/Kontör'e özgü metindir
// — satıcının kendi komisyonu HİÇ DEĞİŞMEDİ. V3/Hizmet Bedeli'nde bu terim ve kim-belirler farklıdır,
// bkz. HIZMET_BEDELI_OVERRIDES altta — o katman aktifken bu metnin üstüne biner.)
// Anahtar = bölüm başlığı (heading); değeri o bölümün DIRECT metnidir.
const DIRECT_OVERRIDES: Record<string, Record<string, string>> = {
  'kvkk': {
    '4. Kişisel Verilerin Aktarılması': 'Kişisel verileriniz aşağıdaki hallerde üçüncü kişilere aktarılabilir:\n\n• Satış sözleşmesinin tarafı olan satıcıya (siparişin tamamlanması ve teslimat için gerekli bilgiler; ödeme doğrudan satıcıya yapıldığından ödeme/iletişim için gerekli bilgiler paylaşılır)\n• Kargo firmalarına (teslimat sürecinin yönetilmesi için)\n• Yasal zorunluluk halinde yetkili kamu kurum ve kuruluşlarına\n• Hukuki uyuşmazlıklarda mahkeme ve icra dairelerine\n\nBu modelde ürün bedeli platform tarafından tahsil edilmez; ödeme doğrudan alıcı ile satıcı arasında gerçekleşir. Kişisel verileriniz hiçbir sebepten dolayı hiçbir kuruluş veya kurumla ticari amaçla paylaşılmamaktadır.',
  },
  'uyelik-sozlesmesi': {
    '2. Tanımlar': '• Platform: Mezathane.tr internet sitesi ve mobil uygulamaları (aracı hizmet sağlayıcı)\n• Üye: Platforma kayıt olarak üyelik sözleşmesini kabul eden gerçek veya tüzel kişi\n• Satıcı: Platformda müzayede düzenleme yetkisi verilen onaylı üye; satışın asıl SATICI tarafı\n• Alıcı: Platformda teklif veren ve/veya müzayede kazanan üye\n• Müzayede: Platform üzerinden gerçekleştirilen online açık artırma\n• Lot: Müzayedede satışa sunulan her bir eser/ürün\n• Pey (Teklif): Bir lot için verilen fiyat teklifi\n• Satıcı Komisyonu (Alıcıdan): Müzayedeyi kazanan alıcıdan, satış bedeli üzerine SATICININ belirlediği oranda alınan ve üzerine %20 KDV eklenen komisyon. Alıcı bu tutarı doğrudan satıcıya öder; platform bu tutara taraf olarak dokunmaz.\n• Müzayede Hakkı: Satıcının, müzayede açabilmek için platformdan önceden satın aldığı kullanım hakkıdır ve platformun bu modeldeki gelirini oluşturur. Platform, satılan ürünün bedelinden ayrıca komisyon/pay almaz.',
    '7. Ödeme ve Teslimat': 'Müzayedede verilen pey (teklif) tutarı, eserin KDV dahil satış bedelidir. Müzayedeyi kazanan alıcı, satış bedeline ek olarak SATICININ belirlediği oranda satıcı komisyonu ve bu komisyon üzerinden %20 KDV öder. Ödenecek toplam tutar, teklif verme ekranında açıkça gösterilir. Bu ödemenin tamamı DOĞRUDAN SATICIYA yapılır; platform aracı hizmet sağlayıcı olup ürün bedelini taraf olarak tahsil etmez ve ürün bedelinden komisyon almaz.\n\n• Ödeme, müzayede bitiminden itibaren belirtilen süre içinde (varsayılan 5 gün; müzayede bazında 2-7 gün arasında değişebilir) satıcının bildirdiği hesaba gerçekleştirilmelidir.\n• Satın alınan esere ilişkin fatura, satışın tarafı olan SATICI tarafından alıcı adına düzenlenir.\n• Teslimat koşulları satıcı tarafından belirlenir; satıcının kendi satış/iade/teslimat şartları lot sayfasında gösterilir.\n• Kargo firmasından kaynaklanan gecikmelerden Platform sorumlu tutulamaz.',
  },
  'muzayede-sartnamesi': {
    '5. Kazanan Teklif ve Ödeme': '• Müzayede süresi dolduğunda en yüksek teklifi veren kullanıcı müzayedeyi kazanır.\n\nMüzayedede verilen pey (teklif) tutarı, eserin KDV dahil satış bedelidir. Müzayedeyi kazanan alıcı, satış bedeline ek olarak SATICININ belirlediği oranda satıcı komisyonu ve bu komisyon üzerinden %20 KDV öder. Ödenecek toplam tutar, teklif verme ekranında açıkça gösterilir. Bu tutarın tamamı DOĞRUDAN SATICIYA ödenir; platform ürün bedelini tahsil etmez.\n\n• Ödeme, müzayede bitiminden itibaren belirtilen süre içinde satıcının hesabına tamamlanmalıdır. Süresinde ödenmeyen siparişler iptal edilebilir ve kullanıcı hesabı kısıtlanabilir.\n• Ödemesi yapılmayan siparişler için cezai şart uygulanabilir.',
    '6. Komisyon ve Ücretler': '• Satıcı komisyonu oranını SATICI belirler; bu oran lot ve ödeme ekranında açıkça gösterilir ve üzerine %20 KDV eklenir. Alıcı bu tutarı doğrudan satıcıya öder.\n• Platform, satılan ürünün bedelinden komisyon/pay ALMAZ. Platformun bu modeldeki geliri, satıcının önceden satın aldığı Müzayede Hakkı bedelidir.\n• Satışa ilişkin fatura satıcı tarafından düzenlenir; platform ürün satışının tarafı değildir, aracı hizmet sağlayıcıdır.',
    '7. Teslimat ve İade': '• Satıcı, ödemeyi aldığını teyit ettikten sonra ürünü belirtilen süre içinde alıcıya gönderir.\n• Hedeflenen kargo teslim süresi şehir içi ve şehir dışı için 7 gündür. Mevzuat gereği azami teslim süresi 30 gündür.\n• Ürün açıklamasına uymayan veya hasarlı gönderilen ürünler için alıcı, teslim tarihinden itibaren 7 gün içinde itiraz edebilir. Alıcı bu süre içinde teslim onayı vermez veya itiraz bildirmezse, teslimat otomatik olarak onaylanmış sayılır.\n• İade/ayıp hallerinde muhatap, satışın tarafı olan satıcıdır; ürün bedeli alıcıya satıcı tarafından iade edilir. Platform süreçte arabuluculuk yapar.\n• Alıcı, ürünü teslim aldığı anda kontrol etmekle yükümlüdür. Kargodan kaynaklanan hasar varsa kargo firması yetkilisine tutanak tutturmakla sorumludur.',
  },
  // Not (2026-08-08): mesafeli-satis/on-bilgilendirme/iptal-iade artık alıcıya yönelik değil,
  // platform↔satıcı standardı anlatıyor (bkz. LEGAL_PAGES'teki yeni metin) — mod'a göre değişen
  // (kim'e ödeme yapılıyor gibi) içerik kalmadığı için bu 3 slug'a artık override YOK. Alıcıya
  // yönelik asıl belge her satıcının kendi profilinde; ödeme akışı farkı satıcının kendi
  // belgesinde ele alınır, platform sayfasında değil.
  'banka-hesap': {
    'Ödeme Bilgileri': 'Bu satışlarda ödeme, platforma değil DOĞRUDAN SATICIYA yapılır. Müzayedeyi kazandığınızda satıcının banka hesap bilgileri (IBAN) sipariş/ödeme sayfanızda gösterilir. Ödemenizi bu bilgileri kullanarak havale/EFT yoluyla gerçekleştirin ve açıklama kısmına üye/sipariş numaranızı yazın.',
    'Havale/EFT Hesap Bilgileri': 'Ödeme yapılacak IBAN, satışın tarafı olan satıcıya aittir ve kazandığınız siparişin ödeme sayfasında görüntülenir.\n\nGüvenliğiniz için: Ödeme yapmadan önce IBAN\'ı yalnızca mezathane.tr üzerindeki resmi ödeme sayfasından doğrulayın; e-posta/mesaj yoluyla gelen farklı bir IBAN\'a ödeme yapmayın. Platform ürün bedelini tahsil etmediğinden, platform adına IBAN paylaşıldığını iddia eden mesajlara itibar etmeyin.',
  },
  'kullanim-kosullari': {
    '4. Teklif ve Ödemenin Bağlayıcılığı': '• Bir lota verilen pey (teklif) bağlayıcıdır; müzayedeyi kazanan alıcı, satış bedeli ile birlikte SATICININ belirlediği orandaki satıcı komisyonunu ve bu komisyon üzerinden %20 KDV\'yi ödemekle yükümlüdür. Bu ödemenin tamamı doğrudan satıcıya yapılır; ödenecek toplam tutar teklif ekranında açıkça gösterilir.\n• Ödeme, müzayede bitiminden itibaren belirtilen süre içinde (varsayılan 5 gün; müzayede bazında 2-7 gün arasında değişebilir) satıcının hesabına yapılmalıdır.\n• Süresinde ödenmeyen siparişler iptal edilebilir, kullanıcı hesabı kısıtlanabilir ve cezai şart uygulanabilir.\n• Müzayede yoluyla yapılan satışlar yasa gereği cayma hakkı kapsamı dışındadır; ayrıntılar İptal ve İade Koşulları sayfasındadır.',
  },
};

// AŞAMA 3 (2026-08-07, düzeltme 2026-08-08): V3 (HİZMET_BEDELİ) için EK override katmanı.
// DIRECT_OVERRIDES'ın (V2/Kontör'e özgü, "Satıcı Komisyonu" terimini kullanan) ÜSTÜNE biner
// (sadece directRevenueModel==='HIZMET_BEDELI' iken uygulanır) — V2'nin kendi metnine dokunmaz.
// V3'te terim "Hizmet Bedeli"dir ve oranını SATICI değil PLATFORM belirler; alıcı bunu doğrudan
// satıcıya öder, satıcı da AYNI tutarı SONRADAN (haftalık) platforma öder. V2'deki "Satıcı
// Komisyonu" ile V3'teki "Hizmet Bedeli" TAMAMEN AYRI kavramlardır (2026-08-08 netleştirmesi).
const HIZMET_BEDELI_OVERRIDES: Record<string, Record<string, string>> = {
  'uyelik-sozlesmesi': {
    '2. Tanımlar': '• Platform: Mezathane.tr internet sitesi ve mobil uygulamaları (aracı hizmet sağlayıcı)\n• Üye: Platforma kayıt olarak üyelik sözleşmesini kabul eden gerçek veya tüzel kişi\n• Satıcı: Platformda müzayede düzenleme yetkisi verilen onaylı üye; satışın asıl SATICI tarafı\n• Alıcı: Platformda teklif veren ve/veya müzayede kazanan üye\n• Müzayede: Platform üzerinden gerçekleştirilen online açık artırma\n• Lot: Müzayedede satışa sunulan her bir eser/ürün\n• Pey (Teklif): Bir lot için verilen fiyat teklifi\n• Hizmet Bedeli: Müzayedeyi kazanan alıcıdan, satış bedeli üzerine PLATFORM tarafından satıcı bazında belirlenen oranda alınan ve üzerine %20 KDV eklenen bedel. Alıcı bu tutarı doğrudan satıcıya öder; satıcı da aynı tutarı SONRADAN (satış sonrası, haftalık) platforma öder — bu, platformun bu modeldeki gelirini oluşturur. Satıcı, müzayede açmak için önceden bir ödeme yapmaz.',
    '7. Ödeme ve Teslimat': 'Müzayedede verilen pey (teklif) tutarı, eserin KDV dahil satış bedelidir. Müzayedeyi kazanan alıcı, satış bedeline ek olarak PLATFORM tarafından satıcı bazında belirlenen oranda Hizmet Bedeli ve bu bedel üzerinden %20 KDV öder. Ödenecek toplam tutar, teklif verme ekranında açıkça gösterilir. Bu ödemenin tamamı DOĞRUDAN SATICIYA yapılır; platform ürün bedelini taraf olarak tahsil etmez. Ancak satıcı, alıcıdan tahsil ettiği bu Hizmet Bedelini satıştan SONRA (haftalık) platforma öder.\n\n• Ödeme, müzayede bitiminden itibaren belirtilen süre içinde (varsayılan 5 gün; müzayede bazında 2-7 gün arasında değişebilir) satıcının bildirdiği hesaba gerçekleştirilmelidir.\n• Satın alınan esere ilişkin fatura, satışın tarafı olan SATICI tarafından alıcı adına düzenlenir.\n• Teslimat koşulları satıcı tarafından belirlenir; satıcının kendi satış/iade/teslimat şartları lot sayfasında gösterilir.\n• Kargo firmasından kaynaklanan gecikmelerden Platform sorumlu tutulamaz.',
  },
  'muzayede-sartnamesi': {
    '5. Kazanan Teklif ve Ödeme': '• Müzayede süresi dolduğunda en yüksek teklifi veren kullanıcı müzayedeyi kazanır.\n\nMüzayedede verilen pey (teklif) tutarı, eserin KDV dahil satış bedelidir. Müzayedeyi kazanan alıcı, satış bedeline ek olarak PLATFORM tarafından satıcı bazında belirlenen oranda Hizmet Bedeli ve bu bedel üzerinden %20 KDV öder. Ödenecek toplam tutar, teklif verme ekranında açıkça gösterilir. Bu tutarın tamamı DOĞRUDAN SATICIYA ödenir; platform ürün bedelini tahsil etmez. Satıcı, alıcıdan tahsil ettiği bu Hizmet Bedelini satıştan SONRA (haftalık) platforma öder.\n\n• Ödeme, müzayede bitiminden itibaren belirtilen süre içinde satıcının hesabına tamamlanmalıdır. Süresinde ödenmeyen siparişler iptal edilebilir ve kullanıcı hesabı kısıtlanabilir.\n• Ödemesi yapılmayan siparişler için cezai şart uygulanabilir.',
    '6. Komisyon ve Ücretler': '• Hizmet Bedeli oranını PLATFORM (admin), satıcı bazında belirler — satıcı bu oranı kendisi belirleyemez; oran lot ve ödeme ekranında açıkça gösterilir ve üzerine %20 KDV eklenir. Alıcı bu tutarı doğrudan satıcıya öder.\n• Platform, ürün bedelini taraf olarak tahsil etmez (bedelin tamamı doğrudan satıcıya ödenir). Ancak satıcı, alıcıdan tahsil ettiği bu AYNI Hizmet Bedelini, platform üzerinden gerçekleştirdiği her satıştan SONRA platforma öder; bu, platformun bu modeldeki gelir kaynağıdır.\n• Satışa ilişkin fatura satıcı tarafından düzenlenir; platform ürün satışının tarafı değildir, aracı hizmet sağlayıcıdır.',
  },
  'kullanim-kosullari': {
    '4. Teklif ve Ödemenin Bağlayıcılığı': '• Bir lota verilen pey (teklif) bağlayıcıdır; müzayedeyi kazanan alıcı, satış bedeli ile birlikte PLATFORM tarafından satıcı bazında belirlenen orandaki Hizmet Bedelini ve bu bedel üzerinden %20 KDV\'yi ödemekle yükümlüdür. Bu ödemenin tamamı doğrudan satıcıya yapılır; satıcı bu Hizmet Bedelini satıştan SONRA platforma öder. Ödenecek toplam tutar teklif ekranında açıkça gösterilir.\n• Ödeme, müzayede bitiminden itibaren belirtilen süre içinde (varsayılan 5 gün; müzayede bazında 2-7 gün arasında değişebilir) satıcının hesabına yapılmalıdır.\n• Süresinde ödenmeyen siparişler iptal edilebilir, kullanıcı hesabı kısıtlanabilir ve cezai şart uygulanabilir.\n• Müzayede yoluyla yapılan satışlar yasa gereği cayma hakkı kapsamı dışındadır; ayrıntılar İptal ve İade Koşulları sayfasındadır.',
  },
};

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: currentSlug } = await params;
  let page = LEGAL_PAGES[currentSlug];
  if (!page) return notFound();

  // Ödeme modu (sürüm anahtarı). DIRECT'te ödeme/komisyon/iade akışı değiştiği için ilgili bölümler
  // DIRECT_OVERRIDES ile değiştirilir; ESCROW'da metinler olduğu gibi kalır.
  const mode = await getPaymentMode();
  if (mode === 'DIRECT' && DIRECT_OVERRIDES[currentSlug]) {
    const ov = DIRECT_OVERRIDES[currentSlug];
    page = {
      ...page,
      sections: page.sections.map((s) => (ov[s.heading] ? { ...s, text: ov[s.heading] } : s)),
    };
  }

  // AŞAMA 3 (2026-08-07): DIRECT içinde HİZMET_BEDELİ aktifse, platformun kendi gelir kaynağını
  // tanımlayan 2 başlık bir kez daha override edilir (bkz. yukarıdaki not — buyer'a yönelik metinler
  // değişmez). KONTOR'da (varsayılan) bu blok hiç çalışmaz, DIRECT_OVERRIDES'taki metin geçerli kalır.
  if (mode === 'DIRECT') {
    const { model: revenueModel } = await getServiceFeeSettings();
    if (revenueModel === 'HIZMET_BEDELI' && HIZMET_BEDELI_OVERRIDES[currentSlug]) {
      const ov2 = HIZMET_BEDELI_OVERRIDES[currentSlug];
      page = {
        ...page,
        sections: page.sections.map((s) => (ov2[s.heading] ? { ...s, text: ov2[s.heading] } : s)),
      };
    }
  }

  // Banka Hesap Bilgileri sayfası: IBAN vb. Site Ayarları'ndan okunup gösterilir.
  // Ayar boşsa (henüz girilmemişse) uydurma yapılmaz, mevcut "e-posta ile iletilecek" metni kalır.
  // DIRECT modda ödeme doğrudan satıcıya yapıldığından platform IBAN'ı GÖSTERİLMEZ (override yeterli).
  if (currentSlug === 'banka-hesap' && mode !== 'DIRECT') {
    let bank: { bankName: string; bankAccountHolder: string; bankIban: string } | null = null;
    try {
      bank = await prisma.siteSettings.findUnique({
        where: { id: 'default' },
        select: { bankName: true, bankAccountHolder: true, bankIban: true },
      });
    } catch {
      bank = null; // DB'ye ulaşılamazsa sabit metne düş
    }
    if (bank?.bankIban) {
      const lines = [
        bank.bankName && `Banka: ${bank.bankName}`,
        bank.bankAccountHolder && `Hesap Sahibi: ${bank.bankAccountHolder}`,
        `IBAN: ${bank.bankIban}`,
      ].filter(Boolean).join('\n');
      page = {
        ...page,
        sections: page.sections.map((s) =>
          s.heading === 'Havale/EFT Hesap Bilgileri'
            ? {
                ...s,
                text: `${lines}\n\nÖdeme yaparken açıklama kısmına üye numaranızı ve sipariş numaranızı yazmayı unutmayınız. Her müzayedenin kendi ödeme koşulları, satıcı tarafından müzayede açıklamasında belirtilebilir.\n\nGüvenliğiniz için: Ödeme yapmadan önce IBAN bilgisini yalnızca mezathane.tr üzerinden doğrulayın; e-posta/mesaj yoluyla gelen farklı bir IBAN'a ödeme yapmayın.`,
              }
            : s
        ),
      };
    }
  }

  const IconComp = ICONS[page.icon] ?? FileText;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-[1100px] px-4">
          <div className="mb-4">
            <Link href="/" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors inline-flex items-center gap-2 text-sm"><ArrowLeft className="h-4 w-4" /> Ana Sayfa</Link>
          </div>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <aside className="md:w-[260px] shrink-0">
              <nav className="sticky top-24 space-y-1">
                {SIDEBAR_ORDER.filter(s => LEGAL_PAGES[s]).map(slug => {
                  const p = LEGAL_PAGES[slug];
                  const isActive = slug === currentSlug;
                  const SideIcon = ICONS[p.icon] ?? FileText;
                  return (
                    <Link
                      key={slug}
                      href={`/yasal/${slug}`}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? 'bg-[#d4af37]/10 text-[#d4af37] font-semibold border border-[#d4af37]/20'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <SideIcon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{p.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="rounded-xl border border-border bg-card p-8 md:p-12">
                <div className="flex items-center gap-3 mb-8">
                  <div className="rounded-full bg-[#d4af37]/10 p-3">
                    <IconComp className="h-6 w-6 text-[#d4af37]" />
                  </div>
                  <h1 className="font-display text-2xl md:text-3xl font-bold">{page.title}</h1>
                </div>
                <div className="space-y-6">
                  {page.sections.map((s, i) => (
                    <div key={i}>
                      <h2 className="text-lg font-semibold text-[#d4af37] mb-2">{s.heading}</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{s.text}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t border-border">
                  <p className="text-xs text-muted-foreground">Son güncelleme: Temmuz 2026 | İşbu metin Mezathane.tr platformuna aittir.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
