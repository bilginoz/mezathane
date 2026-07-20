import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Gavel, Shield, Users, Clock, ArrowLeft } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-16">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="mb-4">
            <Link href="/" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors inline-flex items-center gap-2 text-sm"><ArrowLeft className="h-4 w-4" /> Geri</Link>
          </div>
          <div className="max-w-3xl mx-auto text-center mb-12">
            <Gavel className="h-10 w-10 text-[#d4af37] mx-auto mb-4" />
            <h1 className="font-display text-3xl font-bold mb-4">Hakkımızda</h1>
            <p className="text-muted-foreground leading-relaxed">
              Mezathane.tr, Türkiye&apos;nin premium açık artırma platformudur. Antika, tesbih, mücevher ve koleksiyon ürünlerinin güvenli ve şeffaf bir şekilde alıcılarla buluşturulmasını sağlıyoruz.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Güvenli', desc: 'Tüm işlemler güvenli altyapı üzerinden gerçekleşir' },
              { icon: Users, title: 'Çok Satıcılı', desc: 'Farklı müzayede evleri tek platformda' },
              { icon: Clock, title: 'Canlı Müzayede', desc: 'Gerçek zamanlı teklif sistemi' },
              { icon: Gavel, title: 'Adil Sistem', desc: 'Son saniye koruması ve otomatik teklif' },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6 text-center">
                <item.icon className="h-8 w-8 text-[#d4af37] mx-auto mb-3" />
                <h3 className="font-display font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
