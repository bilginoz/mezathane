'use client';

import { useState, useEffect } from 'react';

type RevenueModel = 'KONTOR' | 'HIZMET_BEDELI';

// Modu bir kez çekip modül genelinde önbelleğe alır (usePaymentMode ile aynı desen).
let cached: { model: RevenueModel; rate: number } | null = null;
let inflight: Promise<{ model: RevenueModel; rate: number }> | null = null;

async function fetchModel(): Promise<{ model: RevenueModel; rate: number }> {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch('/api/revenue-model')
      .then((r) => r.json())
      .then((d) => {
        cached = { model: d?.model === 'HIZMET_BEDELI' ? 'HIZMET_BEDELI' : 'KONTOR', rate: d?.rate ?? 7.0 };
        return cached;
      })
      .catch(() => ({ model: 'KONTOR' as RevenueModel, rate: 7.0 }));
  }
  return inflight;
}

// Güvenli varsayılan KONTOR (mevcut davranış). Model okununca HİZMET_BEDELİ'ye güncellenebilir.
export function useRevenueModel(): { model: RevenueModel; rate: number } {
  const [state, setState] = useState(cached ?? { model: 'KONTOR' as RevenueModel, rate: 7.0 });
  useEffect(() => {
    let alive = true;
    fetchModel().then((d) => { if (alive) setState(d); });
    return () => { alive = false; };
  }, []);
  return state;
}
