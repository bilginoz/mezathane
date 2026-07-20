'use client';

import { BadgeCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VerifiedBadge({ size = 'sm', className = '' }: VerifiedBadgeProps) {
  const sizeMap = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' };
  return (
    <span title="Doğrulanmış Satıcı" className={`inline-flex items-center ${className}`}>
      <BadgeCheck className={`${sizeMap[size]} text-[#d4af37] fill-[#d4af37]/20`} />
    </span>
  );
}
