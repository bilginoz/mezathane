import { prisma } from '@/lib/prisma';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { getPaymentMode } from '@/lib/payment-mode';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText, Info } from 'lucide-react';

export const dynamic = 'force-dynamic';

// Satıcının KENDİ satış/iade/teslimat şartları — ayrı bir sayfa olarak, platformun /yasal
// sayfalarıyla AYNI görsel dilde ama bizim yasal metinlerimizle KARIŞMADAN. İçerik serbest metin
// olarak satıcı profilinden gelir (SellerProfile.salesTerms); DIRECT modelde satışın asıl tarafı
// satıcı olduğu için bu şartlar bağlayıcıdır. Metin boşsa (2026-08-08'den itibaren) platformun
// /yasal/mesafeli-satis vb. sayfalarına YÖNLENDİRİLMEZ — o sayfalar artık platform↔satıcı
// standardını anlatıyor, alıcıya yönelik değil (bkz. app/yasal/[slug]/page.tsx). Sadece genel
// Kullanım Koşulları'na link verilir, satıcıyla iletişime geçilmesi önerilir.
export default async function SellerTermsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const seller = await prisma.sellerProfile.findUnique({
    where: { id, status: 'APPROVED' },
    select: { id: true, companyName: true, salesTerms: true, logoUrl: true },
  });
  if (!seller) return notFound();

  const mode = await getPaymentMode();
  const hasOwnTerms = mode === 'DIRECT' && !!seller.salesTerms?.trim();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-[900px] px-4">
          <div className="mb-4">
            <Link href={`/muzayede-evi/${seller.id}`} className="rounded-lg border border-border p-2 hover:bg-muted transition-colors inline-flex items-center gap-2 text-sm">
              <ArrowLeft className="h-4 w-4" /> {seller.companyName}
            </Link>
          </div>

          <div className="rounded-xl border border-border bg-card p-8 md:p-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="rounded-full bg-[#d4af37]/10 p-3">
                <FileText className="h-6 w-6 text-[#d4af37]" />
              </div>
              <div>
                <h1 className="font-display text-2xl md:text-3xl font-bold">Satış Şartları</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{seller.companyName}</p>
              </div>
            </div>

            {hasOwnTerms ? (
              <>
                <div className="space-y-6">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{seller.salesTerms}</p>
                </div>
                <div className="mt-8 pt-6 border-t border-border flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Bu şartlar <strong className="text-foreground">{seller.companyName}</strong> tarafından belirlenmiştir ve yalnızca bu satıcının
                    ürünlerinin satışı için geçerlidir. Platformun genel <Link href="/yasal/kullanim-kosullari" className="text-[#d4af37] hover:underline">Kullanım Koşulları</Link>&apos;ı ayrıca geçerlidir.
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">{seller.companyName}</strong> henüz kendi özel satış/iade/teslimat şartlarını eklemedi.
                  Bu satıcının Mesafeli Satış Sözleşmesi ve İptal/İade Koşulları için lütfen satın almadan önce satıcıyla iletişime geçin.
                  Platformun genel kullanım koşulları her durumda geçerlidir:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/yasal/kullanim-kosullari" className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4af37]/30 bg-[#d4af37]/5 px-3 py-1.5 text-xs font-medium text-[#d4af37] hover:bg-[#d4af37]/10 transition-colors">
                    Kullanım Koşulları
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
