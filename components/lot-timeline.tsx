'use client';

import { useEffect, useState } from 'react';
import { Clock, Gavel, CreditCard, Tag, Info } from 'lucide-react';

interface HistoryEntry {
  id: string;
  event: string;
  description: string | null;
  createdAt: string;
}

const EVENT_ICONS: Record<string, any> = {
  BID: Gavel,
  PAYMENT: CreditCard,
  TAG: Tag,
  STATUS: Info,
};

const EVENT_COLORS: Record<string, string> = {
  BID: 'text-[#d4af37]',
  PAYMENT: 'text-green-500',
  TAG: 'text-blue-500',
  STATUS: 'text-orange-500',
};

export function LotTimeline({ lotId }: { lotId: string }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/lot-history/${lotId}`)
      .then(r => r.json())
      .then(data => setHistory(data.history ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [lotId]);

  if (loading) return null;
  if (history.length === 0) return null;

  const recent = history.slice(-10).reverse();

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-[#d4af37]" />
        <h3 className="text-sm font-semibold">Lot Geçmişi</h3>
        <span className="text-xs text-muted-foreground">({history.length})</span>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {recent.map((entry) => {
          const Icon = EVENT_ICONS[entry.event] || Info;
          const color = EVENT_COLORS[entry.event] || 'text-muted-foreground';
          return (
            <div key={entry.id} className="flex items-start gap-2 text-xs py-1">
              <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-foreground truncate">{entry.description || entry.event}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
