// Çalıştır: npm run test  (veya: node --import tsx --test lib/sale-math.test.ts)
// DIRECT/ESCROW satış matematiği + isim maskeleme birim testleri.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSalePayment } from './sale-math.ts';
import { maskName } from './utils.ts';

test('DIRECT: platform komisyonu 0, alıcı komisyonu = satıcı oranı, KDV %20', () => {
  const r = computeSalePayment({ mode: 'DIRECT', hammer: 150, sellerCommissionRate: 10, sellerPremiumRate: 10 });
  assert.equal(r.commissionAmount, 0, 'DIRECT: platform üründen komisyon almaz');
  assert.equal(r.buyerPremiumRate, 10, 'satıcının oranı uygulanmalı');
  assert.equal(r.buyerPremiumAmount, 15);
  assert.equal(r.buyerPremiumKDV, 3);
  assert.equal(r.totalAmount, 168, '150 + 15 + 3 = 168');
});

test('DIRECT: satıcı oranı tanımsızsa %7 varsayılana düşer', () => {
  const r = computeSalePayment({ mode: 'DIRECT', hammer: 100, sellerCommissionRate: 0, sellerPremiumRate: null });
  assert.equal(r.buyerPremiumRate, 7);
  assert.equal(r.commissionAmount, 0);
  assert.equal(r.buyerPremiumAmount, 7);
  assert.equal(r.buyerPremiumKDV, 1.4);
  assert.equal(r.totalAmount, 108.4);
});

test('ESCROW: sabit %7 hizmet bedeli, satıcı komisyonu oranından kesilir (CLAUDE.md örneği)', () => {
  const r = computeSalePayment({ mode: 'ESCROW', hammer: 20000, sellerCommissionRate: 10, sellerPremiumRate: 99 /* yok sayılmalı */ });
  assert.equal(r.buyerPremiumRate, 7, 'ESCROW: alıcı hizmet bedeli her zaman %7');
  assert.equal(r.buyerPremiumAmount, 1400);
  assert.equal(r.buyerPremiumKDV, 280);
  assert.equal(r.totalAmount, 21680, '20000 + 1400 + 280');
  assert.equal(r.commissionAmount, 2000, 'satıcı komisyonu %10 = 2000');
});

test('ESCROW: satıcı komisyonu 0 iken platform payı 0, alıcı yine %7 öder', () => {
  const r = computeSalePayment({ mode: 'ESCROW', hammer: 150, sellerCommissionRate: 0, sellerPremiumRate: 10 });
  assert.equal(r.commissionAmount, 0);
  assert.equal(r.buyerPremiumRate, 7);
  assert.equal(r.buyerPremiumAmount, 10.5);
  assert.equal(r.buyerPremiumKDV, 2.1);
  assert.equal(r.totalAmount, 162.6);
});

test('maskName: tam isim maskelenir, tek isim korunur, boş → Anonim', () => {
  assert.equal(maskName('Ahmet Sancak'), 'Ahmet S.');
  assert.equal(maskName('Mehmet Ali Yılmaz'), 'Mehmet A. Y.');
  assert.equal(maskName('Ali'), 'Ali');
  assert.equal(maskName('  Zeynep   Kaya  '), 'Zeynep K.');
  assert.equal(maskName(''), 'Anonim');
  assert.equal(maskName(null), 'Anonim');
  assert.equal(maskName(undefined), 'Anonim');
});
