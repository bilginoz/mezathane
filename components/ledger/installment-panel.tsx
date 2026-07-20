'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Plus, Trash2, Check, Undo2, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

const gold = '#d4af37';

function money(n: number) {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n || 0) + ' ₺';
}
function fmtDate(d?: string | null) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Istanbul' });
  } catch {
    return '-';
  }
}

type Installment = {
  id: string;
  seq: number;
  amount: number;
  dueDate: string;
  paidAmount: number;
  isPaid: boolean;
  paidAt: string | null;
};
type Plan = {
  id: string;
  lotId: string;
  totalAmount: number;
  installmentCount: number;
  note: string | null;
  createdAt: string;
  installments: Installment[];
  lot: { id: string; title: string; lotNumber: number; auction: { title: string } | null } | null;
};
type WonLot = {
  lotId: string;
  title: string;
  lotNumber: number | null;
  auctionTitle: string | null;
  amount: number;
};

export default function InstallmentPanel({ userId, onClose, onChanged }: { userId: string; onClose: () => void; onChanged: () => void }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [wonLots, setWonLots] = useState<WonLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, lRes] = await Promise.all([
        fetch(`/api/admin/installments?userId=${userId}`, { cache: 'no-store' }),
        fetch(`/api/admin/ledger?type=buyer&id=${userId}`, { cache: 'no-store' }),
      ]);
      const pJson = await pRes.json();
      const lJson = await lRes.json();
      if (pRes.ok) setPlans(pJson.plans || []);
      if (lRes.ok) {
        const rows = (lJson.rows || []) as any[];
        const lots: WonLot[] = rows
          .filter((r) => r.lotId && r.borc > 0 && (!r.category || r.category === 'satis' || r.category === 'kazanilan'))
          .map((r) => ({ lotId: r.lotId, title: r.description?.split(' — ')[0] || 'Ürün', lotNumber: r.lotNumber ?? null, auctionTitle: r.auctionTitle ?? null, amount: r.borc }));
        // benzersiz lotlar
        const seen = new Set<string>();
        setWonLots(lots.filter((l) => (seen.has(l.lotId) ? false : (seen.add(l.lotId), true))));
      }
    } catch {
      toast.error('Taksit bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const togglePay = async (inst: Installment, action: 'pay' | 'unpay') => {
    setBusyId(inst.id);
    try {
      const res = await fetch('/api/admin/installments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installmentId: inst.id, action, paymentMethod: 'Havale' }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      toast.success(action === 'pay' ? 'Taksit ödendi olarak işaretlendi' : 'Ödeme geri alındı');
      await load();
      onChanged();
    } catch (e: any) {
      toast.error(e.message || 'İşlem başarısız');
    } finally {
      setBusyId(null);
    }
  };

  const deletePlan = async (planId: string) => {
    if (!confirm('Bu taksit planını silmek istediğinize emin misiniz? (Ödenen taksitlerin ekstre kayıtları silinmez)')) return;
    setBusyId(planId);
    try {
      const res = await fetch(`/api/admin/installments?id=${planId}`, { method: 'DELETE' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      toast.success('Plan silindi');
      await load();
      onChanged();
    } catch (e: any) {
      toast.error(e.message || 'Silinemedi');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <CalendarClock className="h-5 w-5" style={{ color: gold }} /> Taksit Planları
          </h3>
          <div className="flex items-center gap-2">
            {!showForm && (
              <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-black" style={{ backgroundColor: gold }}>
                <Plus className="h-4 w-4" /> Yeni Plan
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="h-5 w-5" /></button>
          </div>
        </div>

        {showForm && (
          <NewPlanForm
            userId={userId}
            wonLots={wonLots}
            onCancel={() => setShowForm(false)}
            onCreated={() => { setShowForm(false); load(); onChanged(); }}
          />
        )}

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" style={{ color: gold }} /></div>
        ) : plans.length === 0 && !showForm ? (
          <div className="py-10 text-center text-muted-foreground text-sm">Bu alıcı için henüz taksit planı yok.</div>
        ) : (
          <div className="space-y-4 mt-2">
            {plans.map((plan) => {
              const paid = plan.installments.filter((i) => i.isPaid).reduce((s, i) => s + i.paidAmount, 0);
              const remaining = plan.totalAmount - paid;
              return (
                <div key={plan.id} className="border border-border rounded-xl overflow-hidden">
                  <div className="bg-muted/40 px-4 py-3 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm">{plan.lot?.title || 'Ürün'}{plan.lot?.auction?.title ? ` — ${plan.lot.auction.title}` : ''}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {plan.installmentCount} taksit · Toplam {money(plan.totalAmount)} · Ödenen {money(paid)} · Kalan <span className="font-semibold text-foreground">{money(remaining)}</span>
                      </div>
                      {plan.note && <div className="text-xs text-muted-foreground mt-1 italic">{plan.note}</div>}
                    </div>
                    <button onClick={() => deletePlan(plan.id)} disabled={busyId === plan.id} className="p-1.5 rounded hover:bg-red-500/15 text-red-400 shrink-0" title="Planı sil">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {plan.installments.map((inst) => {
                      const overdue = !inst.isPaid && new Date(inst.dueDate) < new Date();
                      return (
                        <div key={inst.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: inst.isPaid ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', color: inst.isPaid ? '#4ade80' : undefined }}>{inst.seq}</span>
                            <div>
                              <div className="font-medium">{money(inst.amount)}</div>
                              <div className={`text-xs ${overdue ? 'text-amber-400 font-semibold' : 'text-muted-foreground'}`}>
                                Vade: {fmtDate(inst.dueDate)}{overdue ? ' · Gecikmiş' : ''}{inst.isPaid ? ` · Ödendi ${fmtDate(inst.paidAt)}` : ''}
                              </div>
                            </div>
                          </div>
                          {inst.isPaid ? (
                            <button onClick={() => togglePay(inst, 'unpay')} disabled={busyId === inst.id} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted">
                              {busyId === inst.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />} Geri al
                            </button>
                          ) : (
                            <button onClick={() => togglePay(inst, 'pay')} disabled={busyId === inst.id} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-black" style={{ backgroundColor: '#4ade80' }}>
                              {busyId === inst.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Ödendi
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function NewPlanForm({ userId, wonLots, onCancel, onCreated }: { userId: string; wonLots: WonLot[]; onCancel: () => void; onCreated: () => void }) {
  const [lotId, setLotId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentCount, setInstallmentCount] = useState('3');
  const [firstDueDate, setFirstDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [intervalDays, setIntervalDays] = useState('30');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const onPickLot = (id: string) => {
    setLotId(id);
    const lot = wonLots.find((l) => l.lotId === id);
    if (lot && !totalAmount) setTotalAmount(String(lot.amount));
  };

  const submit = async () => {
    if (!lotId) { toast.error('Ürün seçiniz'); return; }
    if (!totalAmount || parseFloat(totalAmount) <= 0) { toast.error('Geçerli tutar giriniz'); return; }
    const cnt = parseInt(installmentCount);
    if (!cnt || cnt < 2 || cnt > 36) { toast.error('Taksit sayısı 2-36 arası olmalı'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/installments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, lotId, totalAmount, installmentCount, firstDueDate, intervalDays, note }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      toast.success('Taksit planı oluşturuldu');
      onCreated();
    } catch (e: any) {
      toast.error(e.message || 'Plan oluşturulamadı');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-border rounded-xl p-4 mb-4 bg-muted/20">
      <h4 className="font-semibold text-sm mb-3">Yeni Taksit Planı</h4>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">Ürün (kazanılan lot)</label>
          {wonLots.length === 0 ? (
            <div className="text-xs text-amber-400 mt-1">Bu alıcının kazandığı ürün bulunamadı. Yine de tutarı elle girebilmek için önce bir ürün gerekir.</div>
          ) : (
            <select value={lotId} onChange={(e) => onPickLot(e.target.value)} className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm">
              <option value="">Seçiniz…</option>
              {wonLots.map((l) => (
                <option key={l.lotId} value={l.lotId}>{l.title}{l.auctionTitle ? ` — ${l.auctionTitle}` : ''} ({money(l.amount)})</option>
              ))}
            </select>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">Toplam Tutar (₺)</label>
            <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="0" className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Taksit Sayısı</label>
            <input type="number" min={2} max={36} value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground">İlk Vade Tarihi</label>
            <input type="date" value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)} className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Taksit Aralığı (gün)</label>
            <input type="number" value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)} className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Not (ops.)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ör: Müşteri ile anlaşıldı" className="w-full mt-1 rounded-lg bg-background border border-border px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={submit} disabled={saving} className="flex-1 rounded-lg py-2.5 font-semibold text-black flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: gold }}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Planı Oluştur
          </button>
          <button onClick={onCancel} className="rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted">Vazgeç</button>
        </div>
      </div>
    </div>
  );
}
