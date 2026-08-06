import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import Link from 'next/link';
import { Store, Check, Gavel, Wallet, ShieldCheck, ArrowRight, BadgeCheck, TrendingUp, Receipt } from 'lucide-react';
import {
  AUCTION_RIGHT_UNIT_PRICE,
  AUCTION_RIGHT_VALIDITY_DAYS,
  AUCTION_RIGHT_UNLIMITED_PRICE,
  AUCTION_RIGHT_UNLIMITED_DAYS,
} from '@/lib/auction-rights';
import { getServiceFeeSettings } from '@/lib/revenue-model';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Satıcı Ol — Mezathane.tr',
  description: 'Mezathane.tr\'de müzayede evi olun. Satıştan komisyon almıyoruz.',
};

const tl = (n: number) => n.toLocaleString('tr-TR');

export default async function SellerLandingPage() {
  // AŞAMA 3 (2026-08-06/07): bu sayfa KONTOR'da önden hak fiyatlandırması, HİZMET_BEDELİ'nde
  // satış-sonrası hizmet bedeli açıklaması gösterir. Model okunamazsa güvenli tarafa (KONTOR) düşer.
  const { model, rate } = await getServiceFeeSettings();
  const isServiceFee = model === 'HIZMET_BEDELI';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-b from-[#1a1a2e]/40 to-transparent">
          <div className="mx-auto max-w-[1000px] px-4 py-16 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/5 px-3 py-1 text-xs font-medium text-[#d4af37] mb-5">
              <Store className="h-3.5 w-3.5" /> Müzayede Evleri İçin
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold leading-tight" style={{ textWrap: 'balance' } as any}>
              Mezathane.tr'de Müzayedelerinizi Düzenleyin
            </h1>
            <p className="mt-4 text-lg text-[#d4af37] font-semibold">
              Satıştan komisyon almıyoruz.
            </p>
            <p className="mx-auto mt-3 max-w-[620px] text-sm sm:text-base text-muted-foreground leading-relaxed">
              {isServiceFee ? (
                <>Ödemenizi doğrudan alıcıdan alırsınız; platform araya girmez. Önden hiçbir ödeme
                  yapmazsınız — sadece satış gerçekleştiğinde, satış bedeli üzerinden{' '}
                  <strong className="text-foreground">%{rate} hizmet bedeli</strong> platforma
                  ödersiniz. Alıcı komisyon oranınızı da kendiniz belirlersiniz.</>
              ) : (
                <>Ödemenizi doğrudan alıcıdan alırsınız; platform araya girmez. Tek maliyetiniz, müzayede açmak
                  için aldığınız <strong className="text-foreground">Müzayede Hakkı</strong>'dır. Alıcı komisyon
                  oranınızı da kendiniz belirlersiniz.</>
              )}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/satici-basvuru" className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-6 py-3 text-sm font-bold text-black hover:brightness-110 transition-all">
                Satıcı Başvurusu Yap <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/satici-giris" className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors">
                Zaten satıcıyım — Giriş
              </Link>
            </div>
          </div>
        </section>

        {/* Neden biz */}
        <section className="mx-auto max-w-[1000px] px-4 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              isServiceFee
                ? { icon: Wallet, title: 'Ürün bedeli doğrudan size', desc: 'Ürün bedelini doğrudan alıcıdan tahsil edersiniz; platform hiç aracı olmaz. Hizmet bedelini satış sonrasında siz platforma ödersiniz.' }
                : { icon: Wallet, title: 'Komisyonsuz satış', desc: 'Ürün bedelini doğrudan alıcıdan tahsil edersiniz. Platform satıştan pay almaz.' },
              { icon: BadgeCheck, title: 'Kendi komisyonunuz', desc: 'Alıcıdan alacağınız hizmet komisyonu oranını siz belirlersiniz.' },
              { icon: ShieldCheck, title: 'Kendi faturanız', desc: 'Satışın faturasını kendi firmanız adına kesip alıcıya iletirsiniz.' },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-5">
                <f.icon className="h-6 w-6 text-[#d4af37] mb-3" />
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Fiyatlandırma */}
        <section id="fiyatlandirma" className="mx-auto max-w-[1000px] px-4 pb-12 scroll-mt-24">
          {isServiceFee ? (
            <>
              <div className="text-center mb-8">
                <h2 className="font-display text-2xl font-bold">Fiyatlandırma</h2>
                <p className="mt-2 text-sm text-muted-foreground">Önden ödeme yok — sadece gerçekleşen satıştan pay.</p>
              </div>
              <div className="max-w-[420px] mx-auto rounded-2xl border-2 border-[#d4af37] bg-[#d4af37]/5 p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-5 w-5 text-[#d4af37]" />
                  <h3 className="font-semibold">Hizmet Bedeli</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">Müzayede açmak için hiçbir ön ödeme yapmazsınız.</p>
                <div className="mb-4">
                  <span className="font-display text-3xl font-bold">%{rate}</span>
                  <span className="text-sm text-muted-foreground"> + KDV / gerçekleşen satış</span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground flex-1">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#d4af37] shrink-0 mt-0.5" /> Müzayede açmak tamamen ücretsiz</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#d4af37] shrink-0 mt-0.5" /> Sadece SATTIĞINIZ ürünler için ödeme yaparsınız</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#d4af37] shrink-0 mt-0.5" /> Haftalık toplu özet, havale ile ödeme</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-[#d4af37] shrink-0 mt-0.5" /> Satış olmazsa hiçbir maliyet çıkmaz</li>
                </ul>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-5">
                Not: Bu oran platformun müzayede hizmeti içindir. Ürün satış bedelini ve belirlediğiniz alıcı
                komisyonunu doğrudan siz tahsil edersiniz; hizmet bedelini satış sonrasında platforma ödersiniz.
              </p>
            </>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="font-display text-2xl font-bold">Fiyatlandırma</h2>
                <p className="mt-2 text-sm text-muted-foreground">İki seçenek — ihtiyacınıza göre seçin. Ödeme havale/EFT ile, admin onayı sonrası tanımlanır.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[760px] mx-auto">
                {/* Müzayede başı */}
                <div className="rounded-2xl border border-border bg-card p-6 flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <Gavel className="h-5 w-5 text-[#d4af37]" />
                    <h3 className="font-semibold">Müzayede Başı</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Ara sıra müzayede düzenleyenler için esnek seçenek.</p>
                  <div className="mb-4">
                    <span className="font-display text-3xl font-bold">{tl(AUCTION_RIGHT_UNIT_PRICE)} ₺</span>
                    <span className="text-sm text-muted-foreground"> + KDV / hak</span>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground flex-1">
                    <li className="flex gap-2"><Check className="h-4 w-4 text-[#d4af37] shrink-0 mt-0.5" /> 1 hak = 1 müzayede açma</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 text-[#d4af37] shrink-0 mt-0.5" /> İstediğiniz kadar hak alabilirsiniz</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 text-[#d4af37] shrink-0 mt-0.5" /> Onaydan sonra {AUCTION_RIGHT_VALIDITY_DAYS} gün geçerli</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 text-[#d4af37] shrink-0 mt-0.5" /> Boş müzayede iptalinde hak iade edilir</li>
                  </ul>
                </div>

                {/* Aylık sınırsız — öne çıkan */}
                <div className="rounded-2xl border-2 border-[#d4af37] bg-[#d4af37]/5 p-6 flex flex-col relative">
                  <span className="absolute -top-2.5 right-5 rounded-full bg-[#d4af37] text-black text-[10px] font-bold px-2.5 py-0.5">POPÜLER</span>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-5 w-5 text-[#d4af37]" />
                    <h3 className="font-semibold">Aylık Sınırsız</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Düzenli, yoğun müzayede yapan evler için avantajlı paket.</p>
                  <div className="mb-4">
                    <span className="font-display text-3xl font-bold">{tl(AUCTION_RIGHT_UNLIMITED_PRICE)} ₺</span>
                    <span className="text-sm text-muted-foreground"> + KDV / ay</span>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground flex-1">
                    <li className="flex gap-2"><Check className="h-4 w-4 text-[#d4af37] shrink-0 mt-0.5" /> {AUCTION_RIGHT_UNLIMITED_DAYS} gün boyunca <strong className="text-foreground">sınırsız</strong> müzayede</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 text-[#d4af37] shrink-0 mt-0.5" /> Müzayede başına hak düşülmez</li>
                    <li className="flex gap-2"><Check className="h-4 w-4 text-[#d4af37] shrink-0 mt-0.5" /> Çok sayıda müzayede açacaksanız tek tek almaktan uygun</li>
                  </ul>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground mt-5">
                Not: Bu bedeller platformun müzayede hizmeti içindir. Ürün satış bedelini ve belirlediğiniz alıcı
                komisyonunu doğrudan siz tahsil edersiniz — platform bunlardan pay almaz.
              </p>
            </>
          )}
        </section>

        {/* Nasıl çalışır */}
        <section className="border-t border-border bg-muted/20">
          <div className="mx-auto max-w-[1000px] px-4 py-12">
            <h2 className="font-display text-2xl font-bold text-center mb-8">Nasıl Başlarım?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {(isServiceFee
                ? [
                    { n: '1', t: 'Başvur', d: 'Firma bilgilerinizle satıcı başvurusu yapın.' },
                    { n: '2', t: 'Onaylan', d: 'Ekibimiz başvurunuzu inceleyip onaylar.' },
                    { n: '3', t: 'Müzayede aç', d: 'Ön ödeme yapmadan lotlarınızı ekleyip müzayedenizi yayınlayın.' },
                    { n: '4', t: 'Satınca öde', d: 'Sadece gerçekleşen satışlar için hizmet bedelini haftalık ödersiniz.' },
                  ]
                : [
                    { n: '1', t: 'Başvur', d: 'Firma bilgilerinizle satıcı başvurusu yapın.' },
                    { n: '2', t: 'Onaylan', d: 'Ekibimiz başvurunuzu inceleyip onaylar.' },
                    { n: '3', t: 'Hak al', d: 'Müzayede hakkı satın alın (havale + onay).' },
                    { n: '4', t: 'Müzayede aç', d: 'Lotlarınızı ekleyip müzayedenizi yayınlayın.' },
                  ]
              ).map((s) => (
                <div key={s.n} className="rounded-xl border border-border bg-card p-5">
                  <div className="h-8 w-8 rounded-full bg-[#d4af37]/15 text-[#d4af37] font-bold flex items-center justify-center mb-3">{s.n}</div>
                  <h3 className="font-semibold text-sm mb-1">{s.t}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/satici-basvuru" className="inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-6 py-3 text-sm font-bold text-black hover:brightness-110 transition-all">
                Hemen Başvur <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
