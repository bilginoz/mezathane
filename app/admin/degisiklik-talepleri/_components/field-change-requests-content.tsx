'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, Clock, User, Building2, Shield, AlertTriangle,
} from 'lucide-react';

const FIELD_LABELS: Record<string, string> = {
  companyName: 'Firma Unvanı',
  taxOffice: 'Vergi Dairesi',
  taxNumber: 'Vergi Numarası',
  mersisNo: 'Mersis No',
  iban: 'IBAN',
  taxDocumentUrl: 'Vergi Levhası',
  tcKimlikNo: 'TC Kimlik No',
  fullName: 'Ad Soyad',
  phone: 'Telefon',
  address: 'Adres',
  shippingAddress: 'Gönderim Adresi',
  billingAddress: 'Fatura Adresi',
  city: 'İl',
  district: 'İlçe',
  postalCode: 'Posta Kodu',
  companyAddress: 'Firma Adresi',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Beklemede', color: 'text-amber-500', icon: Clock },
  APPROVED: { label: 'Onaylandı', color: 'text-green-500', icon: CheckCircle2 },
  REJECTED: { label: 'Reddedildi', color: 'text-red-500', icon: XCircle },
};

export function FieldChangeRequestsContent() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const user = session?.user as any;
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/giris');
    if (status === 'authenticated' && user?.role !== 'ADMIN') router.push('/');
  }, [status, user?.role, router]);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin/field-change-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch {
      toast.error('Talepler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && user?.role === 'ADMIN') fetchRequests();
  }, [status, user?.role]);

  const handleAction = async (requestId: string, action: 'APPROVED' | 'REJECTED') => {
    setProcessing(requestId);
    try {
      const res = await fetch('/api/admin/field-change-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action, adminNote: adminNotes[requestId] || '' }),
      });
      if (res.ok) {
        toast.success(action === 'APPROVED' ? 'Talep onaylandı, alan güncellendi' : 'Talep reddedildi');
        fetchRequests();
      } else {
        const data = await res.json();
        toast.error(data?.error ?? 'İşlem başarısız');
      }
    } catch {
      toast.error('Bir hata oluştu');
    } finally {
      setProcessing(null);
    }
  };

  const filtered = filter === 'ALL' ? requests : requests.filter(r => r.status === filter);

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-5xl px-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
          <button onClick={() => router.push('/admin')} className="h-10 w-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold">Bilgi Değişiklik Talepleri</h1>
            <p className="text-sm text-muted-foreground">Kullanıcıların kilitli alan değişiklik taleplerini yönetin</p>
          </div>
        </motion.div>

        {/* Filtre */}
        <div className="flex gap-2 mb-6">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f ? 'bg-[#d4af37] text-black' : 'bg-card border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {f === 'ALL' ? 'Tümü' : STATUS_CONFIG[f].label}
              {f === 'PENDING' && requests.filter(r => r.status === 'PENDING').length > 0 && (
                <span className="ml-1.5 bg-amber-500 text-black text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {requests.filter(r => r.status === 'PENDING').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#d4af37]" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Talep bulunamadı</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((req: any) => {
              const statusCfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
              const StatusIcon = statusCfg.icon;
              const fieldLabel = FIELD_LABELS[req.fieldName] || req.fieldName;
              const isPending = req.status === 'PENDING';

              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-4 w-4 ${statusCfg.color}`} />
                        <span className={`text-sm font-bold ${statusCfg.color}`}>{statusCfg.label}</span>
                        <span className="text-xs text-muted-foreground">• {new Date(req.createdAt).toLocaleDateString('tr-TR')}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{req.user?.fullName || req.user?.email}</span>
                        {req.sellerProfile && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> {req.sellerProfile.companyName}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                        <div className="rounded-lg bg-muted/50 p-2.5">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Alan</p>
                          <p className="text-sm font-semibold">{fieldLabel}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2.5">
                          <p className="text-[10px] text-muted-foreground mb-0.5">Mevcut Değer</p>
                          <p className="text-sm font-mono break-all">{req.currentValue || '—'}</p>
                        </div>
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5">
                          <p className="text-[10px] text-amber-400 mb-0.5">Talep Edilen Değer</p>
                          <p className="text-sm font-mono font-bold break-all">{req.requestedValue}</p>
                        </div>
                      </div>

                      {/* IBAN değişiklik talebi için admin hatırlatma */}
                      {req.fieldName === 'iban' && isPending && (
                        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-300">
                              <strong>Hatırlatma:</strong> Bu IBAN'ın hesap sahibi adı, satıcının kayıtlı adı/şirket unvanıyla uyuşuyor mu kontrol edin.
                              Gerekirse satıcıdan banka dekontu/ekran görüntüsü isteyin (“Ek Belgeler” veya “Eksik Bilgi / Düzeltme İste” akışı üzerinden).
                            </p>
                          </div>
                        </div>
                      )}

                      {req.reason && (
                        <p className="text-xs text-muted-foreground mt-1">Açıklama: {req.reason}</p>
                      )}
                      {req.adminNote && (
                        <p className="text-xs text-muted-foreground mt-1">Admin Notu: {req.adminNote}</p>
                      )}
                    </div>

                    {isPending && (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <input
                          placeholder="Admin notu (opsiyonel)"
                          value={adminNotes[req.id] || ''}
                          onChange={e => setAdminNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                          className="rounded-lg border border-border bg-background py-2 px-3 text-xs focus:border-[#d4af37] focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(req.id, 'APPROVED')}
                            disabled={processing === req.id}
                            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {processing === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            Onayla
                          </button>
                          <button
                            onClick={() => handleAction(req.id, 'REJECTED')}
                            disabled={processing === req.id}
                            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {processing === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                            Reddet
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
