'use client';

import { useState, useEffect } from 'react';

type PaymentMode = 'ESCROW' | 'DIRECT';

// Modu bir kez çekip modül genelinde önbelleğe alır; çok sayıda lot kartı olsa da tek istek atılır.
let cached: PaymentMode | null = null;
let inflight: Promise<PaymentMode> | null = null;

async function fetchMode(): Promise<PaymentMode> {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch('/api/payment-mode')
      .then((r) => r.json())
      .then((d) => {
        cached = d?.paymentMode === 'DIRECT' ? 'DIRECT' : 'ESCROW';
        return cached;
      })
      .catch(() => 'ESCROW' as PaymentMode);
  }
  return inflight;
}

// Güvenli varsayılan ESCROW (V1 davranışı). Mod okununca DIRECT'e günceller.
export function usePaymentMode(): PaymentMode {
  const [mode, setMode] = useState<PaymentMode>(cached ?? 'ESCROW');
  useEffect(() => {
    let alive = true;
    fetchMode().then((m) => { if (alive) setMode(m); });
    return () => { alive = false; };
  }, []);
  return mode;
}
