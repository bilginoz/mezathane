export const dynamic = 'force-dynamic';

import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { FileText, Shield, BookOpen, Gavel, Cookie, Lock, Scale } from 'lucide-react';

const ICONS: Record<string, any> = { FileText, Shield, BookOpen, Gavel, Cookie, Lock, Scale };

function renderContent(content: string) {
  const sections = content.split(/^## /m).filter(Boolean);
  if (sections.length === 0) {
    return <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{content}</p>;
  }
  return (
    <div className="space-y-6">
      {sections.map((section, i) => {
        const lines = section.split('\n');
        const heading = lines[0]?.trim();
        const body = lines.slice(1).join('\n').trim();
        return (
          <div key={i}>
            {heading && <h2 className="text-lg font-semibold text-[#d4af37] mb-2">{heading}</h2>}
            {body && <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{body}</p>}
          </div>
        );
      })}
    </div>
  );
}

export default async function DynamicPage({ params }: { params: { slug: string } }) {
  const page = await prisma.page.findUnique({ where: { slug: params.slug } });
  if (!page || !page.isActive) return notFound();

  const IconComp = ICONS[page.icon] ?? FileText;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-[800px] px-4">
          <div className="rounded-xl border border-border bg-card p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-full bg-[#d4af37]/10 p-3">
                <IconComp className="h-6 w-6 text-[#d4af37]" />
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-bold">{page.title}</h1>
            </div>
            {renderContent(page.content)}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
