'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, ArrowLeft, Search, ChevronLeft, ChevronRight, Filter, Clock, User, Activity } from 'lucide-react';
import { toast } from 'sonner';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-500/20 text-green-400',
  UPDATE: 'bg-blue-500/20 text-blue-400',
  DELETE: 'bg-red-500/20 text-red-400',
  LOGIN: 'bg-purple-500/20 text-purple-400',
  APPROVE: 'bg-emerald-500/20 text-emerald-400',
  REJECT: 'bg-orange-500/20 text-orange-400',
  PAYMENT: 'bg-amber-500/20 text-amber-400',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Oluşturma',
  UPDATE: 'Güncelleme',
  DELETE: 'Silme',
  LOGIN: 'Giriş',
  APPROVE: 'Onaylama',
  REJECT: 'Reddetme',
  PAYMENT: 'Ödeme',
};

const ENTITY_LABELS: Record<string, string> = {
  User: 'Kullanıcı',
  Auction: 'Müzayede',
  Lot: 'Lot',
  Payment: 'Ödeme',
  Seller: 'Satıcı',
  SiteSettings: 'Site Ayarları',
  Category: 'Kategori',
  Dispute: 'Anlaşmazlık',
  LedgerEntry: 'Cari Kayıt',
  Installment: 'Taksit',
};

export function AuditLogViewer() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const limit = 30;

  const user = session?.user as any;

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/giris');
    if (status === 'authenticated' && user?.role !== 'ADMIN') router.replace('/panel');
  }, [status, router, user?.role]);

  useEffect(() => {
    if (status !== 'authenticated' || user?.role !== 'ADMIN') return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (entityFilter) params.set('entity', entityFilter);
    if (actionFilter) params.set('action', actionFilter);
    if (search) params.set('search', search);
    fetch(`/api/admin/audit-log?${params}`)
      .then(r => r.json())
      .then(d => { setLogs(d?.logs ?? []); setTotal(d?.total ?? 0); })
      .catch(() => toast.error('Kayıtlar yüklenemedi'))
      .finally(() => setLoading(false));
  }, [status, user?.role, page, entityFilter, actionFilter, search]);

  const totalPages = Math.ceil(total / limit);

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return d; }
  };

  const parseDetails = (d: string | null) => {
    if (!d) return null;
    try { return JSON.parse(d); } catch { return null; }
  };

  if (status === 'loading' || loading) {
    return (
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></Link>
            <Shield className="h-6 w-6 text-[#d4af37]" />
            <h1 className="font-display text-2xl font-bold">Denetim Kayıtları</h1>
          </div>
          <span className="text-sm text-muted-foreground">{total} kayıt</span>
        </div>

        {/* Filtreler */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Kullanıcı, detay ara..."
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm focus:border-[#d4af37] focus:outline-none"
            />
          </div>
          <select
            value={entityFilter}
            onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm focus:outline-none"
          >
            <option value="">Tüm Varlıklar</option>
            {Object.entries(ENTITY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm focus:outline-none"
          >
            <option value="">Tüm İşlemler</option>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Kayıtlar */}
        <div className="space-y-2">
          {logs.length === 0 ? (
            <div className="text-center py-16">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Kayıt bulunamadı</p>
            </div>
          ) : (
            logs.map((log: any) => {
              const details = parseDetails(log.details);
              return (
                <div key={log.id} className="rounded-xl border border-border bg-card p-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${ACTION_COLORS[log.action] ?? 'bg-gray-500/20 text-gray-400'}`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {ENTITY_LABELS[log.entity] ?? log.entity}
                      </span>
                      <span className="text-sm truncate">
                        {log.userName && <span className="font-medium">{log.userName}</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatDate(log.createdAt)}
                    </div>
                  </div>
                  {details && (
                    <div className="mt-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5 max-h-24 overflow-y-auto">
                      {Object.entries(details).map(([k, v]) => (
                        <div key={k}><strong>{k}:</strong> {String(v)}</div>
                      ))}
                    </div>
                  )}
                  {log.ipAddress && (
                    <div className="mt-1 text-[10px] text-muted-foreground">IP: {log.ipAddress}</div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sayfalama */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground">Sayfa {page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
