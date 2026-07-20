'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  endDate: string | Date;
  onComplete?: () => void;
  className?: string;
}

export function CountdownTimer({ endDate, onComplete, className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isComplete, setIsComplete] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) {
        setIsComplete(true);
        onComplete?.();
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endDate, onComplete]);

  if (!mounted) {
    return <div className={`flex items-center gap-1 ${className ?? ''}`}><div className="bg-muted rounded-md px-2 py-1"><span className="text-lg font-bold font-mono">--:--:--</span></div></div>;
  }

  if (isComplete) {
    return <span className={className}>Süre Doldu</span>;
  }

  return (
    <div className={`flex items-center gap-1 ${className ?? ''}`}>
      {timeLeft.days > 0 && (
        <div className="flex flex-col items-center bg-muted rounded-md px-2 py-1">
          <span className="text-lg font-bold font-mono">{timeLeft.days}</span>
          <span className="text-[10px] text-muted-foreground">Gün</span>
        </div>
      )}
      <div className="flex flex-col items-center bg-muted rounded-md px-2 py-1">
        <span className="text-lg font-bold font-mono">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="text-[10px] text-muted-foreground">Saat</span>
      </div>
      <span className="text-lg font-bold text-[#d4af37]">:</span>
      <div className="flex flex-col items-center bg-muted rounded-md px-2 py-1">
        <span className="text-lg font-bold font-mono">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-[10px] text-muted-foreground">Dk</span>
      </div>
      <span className="text-lg font-bold text-[#d4af37]">:</span>
      <div className="flex flex-col items-center bg-muted rounded-md px-2 py-1">
        <span className="text-lg font-bold font-mono text-[#d4af37]">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="text-[10px] text-muted-foreground">Sn</span>
      </div>
    </div>
  );
}
