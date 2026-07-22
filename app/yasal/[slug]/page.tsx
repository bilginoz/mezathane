import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Scale, Shield, FileText, Cookie, Lock, Gavel, BookOpen, CreditCard, RotateCcw, Info, Banknote, Ban, ArrowLeft } from 'lucide-react';

const LEGAL_PAGES: Record<string, { title: string; icon: string; sections: { heading: string; text: string }[] }> = {
  'kvkk': {
    title: 'Kişisel Verilerin Korunması (KVKK)',
    icon: 'Shield',
    sections: [
      { heading: '1. Veri Sorumlusu', text: '[ŞİRKET UNVANI], [ADRES], Vergi No: [VKN], Mersis: [MERSİS] (bundan böyle "Platform"), 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla kişisel verilerinizi aşağıda açıklanan amaçlar doğrultusunda işlemektedir.' },
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
      { heading: '1. Taraflar', text: 'İşbu Üyelik Sözleşmesi, [ŞİRKET UNVANI], [ADRES], Vergi No: [VKN], Mersis: [MERSİS] (bundan böyle "Platform") ile platforma üye olan gerçek veya tüzel kişi ("Üye") arasında, üyelik işleminin tamamlanması ile birlikte yürürlüğe girer.' },
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
      { heading: '12. Uyuşmazlık Çözümü', text: 'İşbu sözleşmeden doğabilecek uyuşmazlıklarda Türkiye Cumhuriyeti yasaları uygulanır. Uyuşmazlıkların çözümünde Denizli Mahkemeleri ve İcra Daireleri yetkilidir. Tüketici işlemlerinden kaynaklanan uyuşmazlıklarda 6502 sayılı Kanun uyarınca Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri de yetkilidir.' },
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
  'mesafeli-satis': {
    title: 'Mesafeli Satış Sözleşmesi',
    icon: 'FileText',
    sections: [
      { heading: '1. Sözleşmenin Konusu', text: 'İşbu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri uyarınca, Mezathane.tr platformu üzerinden müzayede yoluyla gerçekleştirilen satışlara ilişkin tarafların hak ve yükümlülüklerini düzenler. Mezathane.tr web sitesini ziyaret ederek veya üyesi olarak, web sitesinin kullanım koşullarının tamamını okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan edersiniz.' },
      { heading: '2. Aracı Bilgileri', text: 'Platform, aracı hizmet sağlayıcı konumundadır. Satıcı ile alıcı arasındaki ticari ilişkide aracılık hizmeti sunmaktadır. Platformun ticari unvanı, adresi ve iletişim bilgileri sitemizin iletişim sayfasında yer almaktadır.' },
      { heading: '3. Satıcı Bilgileri', text: 'Her müzayede, platformda onaylanmış bir satıcı firma tarafından düzenlenmektedir. Satıcının ticari unvanı, vergi bilgileri ve iletişim bilgileri müzayede ve sipariş detaylarında yer almaktadır.' },
      { heading: '4. Alıcı Bilgileri', text: 'Alıcının adı soyadı, adresi, telefonu, e-posta adresi ve teslim edilecek kişi bilgileri sipariş sürecinde kayıt altına alınmaktadır.' },
      { heading: '5. Ürün Bilgileri', text: '• Satışa sunulan ürünlerin temel nitelikleri (açıklama, fotoğraflar, tahmini değer, başlangıç fiyatı) müzayede ve lot detay sayfalarında belirtilmektedir.\n• Ürün görselleri temsilidir ve gerçek ürünle birebir örtüşmeyebilir.\n• Satıcı, ürün bilgilerinin doğruluğundan sorumludur.\n• Online müzayedede satışa sunulan eserlerin katalog değerleri, eserlerin final değerleri değil müzayede başlangıç fiyatıdır.' },
      { heading: '6. Fiyat ve Ödeme', text: 'Müzayedede verilen pey (teklif) tutarı, eserin KDV dahil satış bedelidir. Müzayedeyi kazanan alıcı, satış bedeline ek olarak satış bedelinin %7\'si oranında hizmet bedeli ve bu hizmet bedeli üzerinden %20 KDV öder. Ödenecek toplam tutar, teklif verme ekranında açıkça gösterilir. Örnek: 20.000 TL kazanan teklif için toplam ödeme 21.680 TL\'dir (20.000 + 1.400 hizmet bedeli + 280 KDV). Satıcıdan alınan hizmet komisyonu, satıcı onay sürecinde platform ile satıcı arasında belirlenen oran üzerinden satış bedelinden kesilir.\n\n• Ödeme, müzayede bitiminden itibaren belirtilen süre içinde tamamlanmalıdır.\n• Alıcı, satış bedelinin tamamını havale yoluyla peşin olarak öder.' },
      { heading: '7. Teslimat', text: '• Siparişiniz 6502 sayılı Tüketicinin Korunması Hakkında Kanun hükümlerine uygun olarak sipariş tarihinden itibaren en geç 30 (otuz) gün içinde alıcı adına kargo firmasına teslim edilir.\n• Ödemenin onaylanmasının ardından satıcı, ürünü belirtilen süre içinde kargo ile gönderir.\n• Hedeflenen kargo teslim süresi şehir içi ve şehir dışı için 7 gündür. Mevzuat gereği azami teslim süresi 30 gündür.\n• Kargo ücreti ve koşulları satıcı tarafından belirlenir.' },
      { heading: '8. Cayma Hakkı', text: 'Müzayede yoluyla gerçekleştirilen satışlar, 6502 sayılı Kanun\'un 53/ç maddesi ve Mesafeli Sözleşmeler Yönetmeliği\'nin 15/ç maddesi gereğince cayma hakkı kapsamı dışındadır.\n\nAncak ürünün açıklamaya uygun olmaması veya ayıplı olması halinde tüketici hakları saklıdır.' },
      { heading: '9. Kullanıcı İçerik Sorumlulukları', text: '• Kullanıcılar platformu kamu düzenini bozucu, genel ahlaka aykırı, başkalarını rahatsız ve taciz edecek şekilde kullanamaz.\n• Başkalarının fikri ve telif haklarına tecavüz edecek şekilde kullanamazlar.\n• Platform, kayıtlarını eksik giren üyelerin veya üyeliğinin kullanım koşullarına uygun olmadığını tespit ettiği üyelerin hesaplarını hiçbir açıklama yapmaksızın sistemden çıkarma hakkına sahiptir.' },
      { heading: '10. Ödeme Güvenliği', text: 'Platform, kredi kartı bilgisi talep etmez ve saklamaz. Ödemeler banka havalesi/EFT ile yapılır. Ödeme bilgilerinizin güvenliği için lütfen banka hesap bilgilerini yalnızca resmi platform sayfalarından edininiz.' },
      { heading: '11. Uyuşmazlık', text: 'İşbu sözleşmeden doğabilecek uyuşmazlıklarda Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir. Taraflar işbu Sözleşme şartlarının yanı sıra Tüketicilerin Korunması Hakkındaki Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümlerini kabul ettiklerini ve bu hükümlere uygun hareket edeceklerini kabul, beyan ve taahhüt ederler.' },
    ],
  },
  'on-bilgilendirme': {
    title: 'Ön Bilgilendirme Formu',
    icon: 'Info',
    sections: [
      { heading: 'Genel Bilgilendirme', text: 'İşbu Mesafeli Satış Sözleşmesi Ön Bilgilendirme Formu, SİPARİŞ VEREN/ALICI\'nın satın aldığı, Mezathane.tr platformunun aracılık yaptığı, aşağıda nitelikleri ve satış fiyatı belirtilen ürün/ürünlerin satışı ve teslimi ile ilgili olarak 6502 sayılı Tüketicilerin Korunması Hakkındaki Kanun ("Kanun") ve Mesafeli Sözleşmelere Dair Yönetmelik ("Yönetmelik") hükümleri gereğince ALICI\'yı bilgilendirmek içindir.' },
      { heading: '1. Aracı Bilgileri', text: 'TİCARİ UNVAN: [ŞİRKET UNVANI]\nADRES: [ADRES]\nVERGİ NO: [VKN]\nMERSİS: [MERSİS]\nTELEFON: İletişim sayfasında belirtilmektedir.\nE-POSTA: bilgi@mezathane.tr' },
      { heading: '2. Satıcı Bilgileri', text: 'Her müzayede, platformda onaylanmış bir satıcı tarafından düzenlenmektedir. Satıcı bilgileri (ticari unvan, vergi dairesi, vergi numarası) müzayede detay sayfasında ve sipariş onayında yer almaktadır.' },
      { heading: '3. Alıcı Bilgileri', text: 'Alıcının adı soyadı, adresi, telefonu, e-posta adresi ve teslim edilecek kişi bilgileri üyelik ve sipariş bilgilerinden temin edilmektedir.' },
      { heading: '4. Ürün Bilgileri', text: '• Ürünün temel nitelikleri, açıklamaları ve fotoğrafları lot detay sayfasında belirtilmektedir.\n• Satış fiyatı, müzayede sonucunda oluşan kazanan teklif tutarıdır.\n\nMüzayedede verilen pey (teklif) tutarı, eserin KDV dahil satış bedelidir. Müzayedeyi kazanan alıcı, satış bedeline ek olarak satış bedelinin %7\'si oranında hizmet bedeli ve bu hizmet bedeli üzerinden %20 KDV öder. Ödenecek toplam tutar, teklif verme ekranında açıkça gösterilir. Örnek: 20.000 TL kazanan teklif için toplam ödeme 21.680 TL\'dir (20.000 + 1.400 hizmet bedeli + 280 KDV). Satıcıdan alınan hizmet komisyonu, satıcı onay sürecinde platform ile satıcı arasında belirlenen oran üzerinden satış bedelinden kesilir.\n\n• Ödeme şekli: Havale/EFT' },
      { heading: '5. Teslimat Bilgileri', text: '• Hedeflenen kargo teslim süresi şehir içi ve şehir dışı için 7 gündür. Siparişiniz 6502 sayılı Tüketicinin Korunması Hakkında Kanun hükümlerine uygun olarak sipariş tarihinden itibaren en geç 30 (otuz) gün içinde alıcı adına kargo firmasına teslim edilir.\n• Mezathane.tr, 27/02/2015 tarihinde yürürlüğe giren 29188 sayılı Mesafeli Sözleşmeler Yönetmeliği\'nin 16. maddesinin 4. fıkrasında yer alan; "Sipariş konusu mal ya da hizmetin ediminin yerine getirilmesinin imkansızlaştığı hallerde satıcı veya sağlayıcının bu durumu öğrendiği tarihten itibaren üç gün içinde tüketiciye yazılı olarak veya kalıcı veri saklayıcısı ile bildirmesi ve varsa teslimat masrafları da dahil olmak üzere tahsil edilen tüm ödemeleri bildirim tarihinden itibaren en geç on dört gün içinde iade etmesi zorunludur" hükmü uyarınca internet sitesi üzerinden satışa sunulma aşamasında teknik hatalar nedeniyle ürün fiyatı, ürün açıklaması, ürün niteliği vb. özelliklerde hata olması halinde sipariş iptal etme ve tahsil edilmiş tutarları ilgili mevzuat hükümleri uyarınca Alıcı\'ya iade etme hakkına sahiptir.' },
      { heading: '6. Genel Hükümler', text: 'A) Alıcı\'nın işbu Ön Bilgilendirme Formu\'nu elektronik ortamda teyit etmesi, mesafeli satış sözleşmesinin kurulmasından önce, Alıcı\'nın aldığı ürünlere ait temel özellikleri, ürünlerin vergiler dahil fiyatı, ödeme ve teslimat bilgileri de dahil olmak üzere işbu Ön Bilgilendirme Formu\'nda yer alan tüm bilgileri doğru ve eksiksiz olarak edindiği anlamına gelmektedir.\n\nB) Sözleşme konusu ürün, 30 günlük yasal süreyi aşmamak kaydı ile Alıcı\'nın yerleşim yeri uzaklığına bağlı olarak internet sitesindeki ön bilgiler kısmında belirtilen süre zarfında ALICI veya ALICI\'nın gösterdiği adresteki kişi ve/veya kuruluşa teslim edilir.\n\nC) Platform, sözleşme konusu ürünü eksiksiz, siparişte belirtilen niteliklere uygun teslim etmeyi, yasal mevzuat gereklerine göre sağlam, standartlara uygun bir şekilde doğruluk ve dürüstlük esasları dahilinde ifa etmeyi taahhüt eder.\n\nD) Alıcı, sözleşme konusu ürünün teslimatı için işbu Ön Bilgilendirme Formunu elektronik ortamda teyit edeceğini, herhangi bir nedenle sözleşme konusu ürün bedelinin ödenmemesi ve/veya banka kayıtlarında iptal edilmesi halinde, satıcının sözleşme konusu ürünü teslim yükümlülüğünün sona ereceğini kabul, beyan ve taahhüt eder.' },
    ],
  },
  'iptal-iade': {
    title: 'İptal ve İade Koşulları',
    icon: 'RotateCcw',
    sections: [
      { heading: 'Genel İlke', text: 'Mezathane.tr, tüketici haklarını korumakta ve satış sonrası müşteri memnuniyetini ön planda tutmaktadır. Satın aldığınız ürünlerle ilgili yaşayabileceğiniz her türlü sorun, titizlikle değerlendirilmekte ve en kısa sürede çözüme kavuşturulmaktadır.' },
      { heading: '1. Müzayede Ürünleri Hakkında Önemli Not', text: '⚠️ Önemli Bilgilendirme: Müzayede yoluyla satışa sunulan eserler, 6502 sayılı Tüketicinin Korunması Hakkında Kanun\'un 53/ç maddesi ve 27.11.2014 tarihli 29188 sayılı Resmi Gazete\'de yayımlanan Mesafeli Sözleşmeler Yönetmeliği gereği "Cayma Hakkının İstisnaları" kapsamındadır.\n\nBu nedenle müzayedelerden satın alınan eserlerde cayma hakkı kullanılamaz.\n\nAncak ürünün açıklamaya uygun olmaması veya ayıplı olması halinde tüketici hakları saklıdır.' },
      { heading: '2. Ayıplı / Açıklamaya Uygun Olmayan Ürün', text: '• Teslim edilen ürünün lot açıklamasıyla uyuşmadığını veya ayıplı olduğunu düşünüyorsanız, teslim tarihinden itibaren 7 gün içinde bilgi@mezathane.tr adresine sipariş numaranız ve durumu açıklayan fotoğraflarla birlikte başvurmanız gerekmektedir.\n• Platform, itirazı değerlendirerek taraflar arasında arabuluculuk yapar. Haklı bulunan iade taleplerinde ürün bedeli, satıcının iade onayının ardından 14 (ondört) gün içinde alıcıya iade edilir.\n• İade edilecek ürünün orijinal ambalajında ve teslim alındığı durumda olması gerekmektedir.' },
      { heading: '3. Hasarlı Teslimat', text: 'Siparişini verdiğiniz ürünün teslimi sırasında zarar görmüş paket veya paketler var ise teslim aldığınız kargo firma yetkilisi önünde bizzat kendiniz açarak kontrol ediniz. Hasarlı ürün için kargo firmasına tutanak tutturunuz ve derhal bilgi@mezathane.tr adresine bildiriniz.' },
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
      { heading: '1. Genel', text: 'Bu Kullanım Koşulları, Mezathane.tr internet sitesi ve mobil uygulamalarının (kısaca "Platform") kullanımına ilişkin genel esasları düzenler. Platformu ziyaret ederek veya kullanarak bu koşulları kabul etmiş sayılırsınız. Üyelik, müzayede, ödeme, teslimat, iade, kişisel veri ve çerez konularındaki ayrıntılı kurallar; Üyelik Sözleşmesi, Müzayede Şartnamesi, Mesafeli Satış Sözleşmesi, Ön Bilgilendirme Formu, İptal ve İade Koşulları, KVKK Aydınlatma Metni, Gizlilik Politikası ve Çerez Politikası ile birlikte geçerlidir. Bir çelişki halinde ilgili özel sözleşme hükümleri esas alınır.' },
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
  'mesafeli-satis',
  'on-bilgilendirme',
  'iptal-iade',
  'banka-hesap',
  'gizlilik',
  'cerez',
  'kullanim-kosullari',
];

const ICONS: Record<string, any> = { Scale, Shield, FileText, Cookie, Lock, Gavel, BookOpen, CreditCard, RotateCcw, Info, Banknote, Ban };

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: currentSlug } = await params;
  const page = LEGAL_PAGES[currentSlug];
  if (!page) return notFound();
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
