'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Star, User } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface SellerRatingProps {
  sellerId: string;
  sellerName: string;
  compact?: boolean;
}

export function SellerRating({ sellerId, sellerName, compact = false }: SellerRatingProps) {
  const { data: session } = useSession() || {};
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews?sellerId=${sellerId}`);
      const data = await res.json();
      setReviews(data.reviews ?? []);
      setAvgRating(data.averageRating ?? 0);
      setReviewCount(data.reviewCount ?? 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (sellerId) fetchReviews();
  }, [sellerId]);

  const handleSubmit = async () => {
    if (!rating) { toast.error('Lütfen puan verin'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId, rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Hata oluştu'); return; }
      toast.success('Değerlendirmeniz kaydedildi');
      setShowForm(false);
      setRating(0);
      setComment('');
      fetchReviews();
    } catch {
      toast.error('Hata oluştu');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (value: number, size = 'h-4 w-4') => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`${size} ${s <= value ? 'text-[#d4af37] fill-[#d4af37]' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        {renderStars(Math.round(avgRating), 'h-3 w-3')}
        <span className="text-xs text-muted-foreground">
          {avgRating > 0 ? avgRating.toFixed(1) : '-'} ({reviewCount})
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold">Satıcı Değerlendirmeleri</h3>
            <div className="flex items-center gap-2 mt-1">
              {renderStars(Math.round(avgRating))}
              <span className="text-sm font-medium">{avgRating > 0 ? avgRating.toFixed(1) : '-'}</span>
              <span className="text-xs text-muted-foreground">({reviewCount} değerlendirme)</span>
            </div>
          </div>
          {session?.user && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-[#d4af37] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#c4a030] transition-colors"
            >
              Değerlendir
            </button>
          )}
        </div>
      </div>

      {/* Review Form */}
      {showForm && (
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">Puanınız:</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(s)}
                  className="p-0.5"
                >
                  <Star className={`h-5 w-5 transition-colors ${
                    s <= (hoverRating || rating) ? 'text-[#d4af37] fill-[#d4af37]' : 'text-muted-foreground/30'
                  }`} />
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Yorumunuz (isteğe bağlı)..."
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting || !rating}
              className="rounded-lg bg-[#d4af37] px-4 py-1.5 text-xs font-medium text-black hover:bg-[#c4a030] disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Gönderiliyor...' : 'Gönder'}
            </button>
            <button
              onClick={() => { setShowForm(false); setRating(0); setComment(''); }}
              className="rounded-lg border border-border px-4 py-1.5 text-xs hover:bg-muted transition-colors"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="divide-y divide-border">
        {reviews.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Henüz değerlendirme yok</div>
        ) : (
          reviews.slice(0, 5).map((r: any) => (
            <div key={r.id} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium">{r.user?.fullName ?? 'Anonim'}</span>
                <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
              </div>
              {renderStars(r.rating, 'h-3 w-3')}
              {r.comment && <p className="text-sm text-muted-foreground mt-1">{r.comment}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
