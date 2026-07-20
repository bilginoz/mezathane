'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Eye, MessageSquare, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  OPEN: { label: 'Açık', color: 'bg-red-500/20 text-red-400', icon: AlertTriangle },
  IN_REVIEW: { label: 'İnceleniyor', color: 'bg-yellow-500/20 text-yellow-400', icon: Eye },
  RESOLVED: { label: 'Çözüldü', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  REJECTED: { label: 'Reddedildi', color: 'bg-gray-500/20 text-gray-400', icon: XCircle },
};

export function DisputesManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [resolution, setResolution] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/giris');
    if (status === 'authenticated' && (session?.user as any)?.role !== 'ADMIN') router.push('/panel');
  }, [status, session, router]);

  const fetchDisputes = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/disputes?status=${filterStatus}`);
      if (res.ok) setDisputes(await res.json());
    } catch {} finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => {
    if (status === 'authenticated') fetchDisputes();
  }, [status, fetchDisputes]);

  const updateDispute = async (disputeId: string, data: any) => {
    try {
      const res = await fetch('/api/admin/disputes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disputeId, ...data }),
      });
      if (res.ok) {
        toast.success('Güncellendi');
        fetchDisputes();
        setExpandedId(null);
      } else {
        toast.error('Güncelleme başarısız');
      }
    } catch { toast.error('Hata oluştu'); }
  };

  if (loading) {
    return <main className="flex-1 py-8"><div className="max-w-[1200px] mx-auto px-4"><div className="animate-pulse space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl" />)}</div></div></main>;
  }

  return (
    <main className="flex-1 py-8">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></Link>
            <AlertTriangle className="h-6 w-6 text-[#d4af37]" />
            <h1 className="font-display text-2xl font-bold">Anlaşmazlık Yönetimi</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            {['ALL', 'OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterStatus === s ? 'bg-[#d4af37] text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {s === 'ALL' ? 'Tümü' : STATUS_MAP[s]?.label ?? s}
              </button>
            ))}
          </div>
        </div>

        {disputes.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Anlaşmazlık bulunamadı</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map((d: any) => {
              const st = STATUS_MAP[d.status] ?? STATUS_MAP.OPEN;
              const StIcon = st.icon;
              const isExpanded = expandedId === d.id;

              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setExpandedId(isExpanded ? null : d.id);
                      if (!isExpanded) {
                        setAdminNote(d.adminNote ?? '');
                        setResolution(d.resolution ?? '');
                      }
                    }}
                    className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors text-left"
                  >
                    <StIcon className="h-5 w-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm">{d.reason}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${st.color}`}>{st.label}</span>
                      </div>
                      <p className="text-xs text-white/40 mt-1">
                        <span className="text-white/60">{d.reporter?.fullName}</span> → <span className="text-white/60">{d.against?.fullName ?? 'Bilinmiyor'}</span>
                        {' • '}{d.lot?.title ?? 'Lot'}
                        {' • '}{formatDate(d.createdAt)}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-white/40" /> : <ChevronDown className="h-4 w-4 text-white/40" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-white/5 pt-4 space-y-4">
                      {/* Açıklama */}
                      <div>
                        <h4 className="text-xs font-medium text-white/40 mb-1">Şikayet Detayı</h4>
                        <p className="text-sm text-white/80 bg-white/5 rounded-lg p-3">{d.description}</p>
                      </div>

                      {/* Taraflar */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-xs text-white/40 mb-1">Şikayetçi</p>
                          <p className="text-sm font-medium">{d.reporter?.fullName}</p>
                          <p className="text-xs text-white/50">{d.reporter?.email}</p>
                        </div>
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-xs text-white/40 mb-1">Şikayet Edilen</p>
                          <p className="text-sm font-medium">{d.against?.fullName ?? 'Bilinmiyor'}</p>
                          <p className="text-xs text-white/50">{d.against?.email ?? '-'}</p>
                        </div>
                      </div>

                      {/* Admin Notu */}
                      <div>
                        <label className="text-xs font-medium text-white/40 mb-1 block">Admin Notu (İç kullanım)</label>
                        <textarea
                          value={adminNote}
                          onChange={e => setAdminNote(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#d4af37]/50 resize-none"
                          rows={2}
                          placeholder="İç not ekleyin..."
                        />
                      </div>

                      {/* Çözüm */}
                      <div>
                        <label className="text-xs font-medium text-white/40 mb-1 block">Çözüm Açıklaması (Kullanıcıya gösterilir)</label>
                        <textarea
                          value={resolution}
                          onChange={e => setResolution(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#d4af37]/50 resize-none"
                          rows={2}
                          placeholder="Çözüm açıklaması yazın..."
                        />
                      </div>

                      {/* Aksiyonlar */}
                      <div className="flex flex-wrap gap-2">
                        {d.status === 'OPEN' && (
                          <button
                            onClick={() => updateDispute(d.id, { status: 'IN_REVIEW', adminNote })}
                            className="px-4 py-2 rounded-lg bg-yellow-600 text-white text-sm font-medium hover:bg-yellow-700 flex items-center gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" /> İncelemeye Al
                          </button>
                        )}
                        {(d.status === 'OPEN' || d.status === 'IN_REVIEW') && (
                          <>
                            <button
                              onClick={() => updateDispute(d.id, { status: 'RESOLVED', adminNote, resolution })}
                              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 flex items-center gap-1.5"
                            >
                              <CheckCircle className="h-3.5 w-3.5" /> Çözüldü Olarak İşaretle
                            </button>
                            <button
                              onClick={() => updateDispute(d.id, { status: 'REJECTED', adminNote, resolution })}
                              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 flex items-center gap-1.5"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Reddet
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => updateDispute(d.id, { adminNote })}
                          className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20 flex items-center gap-1.5"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Notu Kaydet
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
