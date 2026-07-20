'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, Eye, Tag, Share2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface BlogPostContentProps {
  post: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    coverImage: string | null;
    tags: string | null;
    publishedAt: string | null;
    viewCount: number;
  };
}

export function BlogPostContent({ post }: BlogPostContentProps) {
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url: shareUrl });
      } catch {}
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link kopyalandı');
    }
  };

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <article className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/blog" className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="text-sm text-muted-foreground">Blog</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold mb-4">{post.title}</h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
          {post.publishedAt && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {formatDate(post.publishedAt)}</span>}
          <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {post.viewCount} görüntülenme</span>
          <button onClick={handleShare} className="flex items-center gap-1 hover:text-foreground transition-colors">
            <Share2 className="h-4 w-4" /> Paylaş
          </button>
        </div>

        {post.coverImage && (
          <div className="relative aspect-video rounded-xl overflow-hidden mb-8 bg-muted">
            <Image src={post.coverImage} alt={post.title} fill className="object-cover" />
          </div>
        )}

        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {post.tags && (
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {post.tags.split(',').map(tag => (
                <span key={tag.trim()} className="text-xs px-2 py-1 rounded-full bg-[#d4af37]/10 text-[#d4af37]">
                  {tag.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>
    </main>
  );
}
