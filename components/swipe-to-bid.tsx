'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Gavel, Loader2, ChevronRight } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

interface SwipeToBidProps {
  amount: number;
  onSwipeComplete: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
}

export function SwipeToBid({ amount, onSwipeComplete, disabled = false, loading = false, label }: SwipeToBidProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const x = useMotionValue(0);
  const thumbSize = 56; // px
  const maxDrag = Math.max(containerWidth - thumbSize - 8, 0); // 8px padding

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Derived values
  const progress = useTransform(x, [0, maxDrag], [0, 1]);
  const trackBg = useTransform(
    x,
    [0, maxDrag],
    ['rgba(212,175,55,0.15)', 'rgba(212,175,55,0.4)']
  );
  const thumbScale = useTransform(x, [0, maxDrag * 0.8, maxDrag], [1, 1.05, 1.1]);

  // Chevron opacity — fade out as user drags
  const chevronOpacity = useTransform(x, [0, maxDrag * 0.3], [1, 0]);

  const handleDragEnd = useCallback(() => {
    if (disabled || loading) return;
    const currentX = x.get();
    // Complete if dragged past 85%
    if (currentX >= maxDrag * 0.85) {
      animate(x, maxDrag, { duration: 0.15 });
      onSwipeComplete();
    } else {
      // Snap back
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }, [disabled, loading, maxDrag, onSwipeComplete, x]);

  // Reset position when loading finishes or amount changes
  useEffect(() => {
    if (!loading) {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }, [loading, amount, x]);

  const isDisabled = disabled || loading;

  return (
    <div className="space-y-1">
      {/* Amount display above the slider */}
      <div className="text-center">
        <span className="text-lg font-bold font-mono text-[#d4af37]">{formatPrice(amount)}</span>
        {label && <span className="text-xs text-muted-foreground ml-2">{label}</span>}
      </div>

      {/* Swipe track */}
      <motion.div
        ref={containerRef}
        style={{ backgroundColor: trackBg }}
        className={`relative h-[64px] rounded-2xl border-2 overflow-hidden select-none
          ${isDisabled
            ? 'border-muted-foreground/20 opacity-50 cursor-not-allowed'
            : 'border-[#d4af37]/40'}
        `}
      >
        {/* Center label */}
        <motion.div
          style={{ opacity: chevronOpacity }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="flex items-center gap-1.5 text-[#d4af37]/70 text-sm font-semibold">
            <span>Kaydırarak Teklif Ver</span>
            <ChevronRight className="h-4 w-4 animate-pulse" />
            <ChevronRight className="h-4 w-4 animate-pulse" style={{ animationDelay: '150ms' }} />
          </div>
        </motion.div>

        {/* Progress fill */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-[#d4af37]/20 rounded-2xl"
          style={{ width: useTransform(x, v => v + thumbSize + 4) }}
        />

        {/* Draggable thumb */}
        <motion.div
          drag={isDisabled ? false : 'x'}
          dragConstraints={{ left: 0, right: maxDrag }}
          dragElastic={0}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          style={{ x, scale: thumbScale }}
          className={`absolute top-1 left-1 w-[56px] h-[56px] rounded-xl flex items-center justify-center shadow-lg
            ${isDisabled
              ? 'bg-muted-foreground/30'
              : 'bg-[#d4af37] cursor-grab active:cursor-grabbing'}
          `}
          whileTap={isDisabled ? {} : { cursor: 'grabbing' }}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 text-black animate-spin" />
          ) : (
            <Gavel className="h-6 w-6 text-black" />
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
