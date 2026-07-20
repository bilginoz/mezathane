'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MailOpen, Trash2, X, ChevronLeft, ChevronRight, MessageSquare, Filter, ArrowLeft } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function MessagesManagement() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('');
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);

  const user = session?.user as any;

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filter) params.set('filter', filter);
      const res = await fetch(`/api/admin/messages?${params}`);
      const data = await res.json();
      setMessages(data.messages ?? []);
      setTotalPages(data.totalPages ?? 1);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      toast.error('Mesajlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    if (status === 'unauthenticated') { router.replace('/giris'); return; }
    if (status === 'authenticated' && user?.role !== 'ADMIN') { router.replace('/panel'); return; }
    if (status === 'authenticated') fetchMessages();
  }, [status, router, user?.role, fetchMessages]);

  const handleAction = async (messageId: string, action: string) => {
    try {
      const res = await fetch('/api/admin/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, action }),
      });
      if (!res.ok) { toast.error('İşlem başarısız'); return; }
      toast.success(
        action === 'markRead' ? 'Okundu olarak işaretlendi' :
        action === 'markUnread' ? 'Okunmadı olarak işaretlendi' :
        'Mesaj silindi'
      );
      if (action === 'delete') setSelectedMsg(null);
      fetchMessages();
    } catch {
      toast.error('Hata oluştu');
    }
  };

  const openMessage = (msg: Message) => {
    setSelectedMsg(msg);
    if (!msg.isRead) {
      handleAction(msg.id, 'markRead');
    }
  };

  if (status === 'loading' || (status === 'authenticated' && loading && messages.length === 0)) {
    return (
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-[1200px] px-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 bg-muted rounded" />)}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 py-8">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></Link>
          <MessageSquare className="h-6 w-6 text-[#d4af37]" />
          <h1 className="font-display text-2xl font-bold">İletişim Mesajları</h1>
          {unreadCount > 0 && (
            <span className="ml-2 rounded-full bg-[#d4af37] px-2 py-0.5 text-xs font-bold text-black">
              {unreadCount} okunmamış
            </span>
          )}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6">
          {[
            { value: '', label: 'Tümü' },
            { value: 'unread', label: 'Okunmamış' },
            { value: 'read', label: 'Okunmuş' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(1); }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-[#d4af37] text-black'
                  : 'border border-border hover:bg-muted'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Messages List */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border">
            {messages.map(msg => (
              <div
                key={msg.id}
                onClick={() => openMessage(msg)}
                className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                  !msg.isRead ? 'bg-[#d4af37]/5' : ''
                }`}
              >
                <div className="mt-0.5">
                  {msg.isRead ? (
                    <MailOpen className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Mail className="h-4 w-4 text-[#d4af37]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm truncate ${!msg.isRead ? 'font-semibold' : 'font-medium'}`}>
                      {msg.name}
                    </p>
                    <span className="text-xs text-muted-foreground">&lt;{msg.email}&gt;</span>
                  </div>
                  <p className={`text-sm truncate ${!msg.isRead ? 'font-medium' : 'text-muted-foreground'}`}>
                    {msg.subject ?? 'Konu belirtilmemiş'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(msg.createdAt)}</span>
                  <button
                    onClick={e => { e.stopPropagation(); handleAction(msg.id, 'delete'); }}
                    className="rounded-lg p-1 hover:bg-red-500/10 transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">Mesaj bulunamadı</div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border p-3">
              <p className="text-xs text-muted-foreground">Sayfa {page} / {totalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg p-1.5 hover:bg-muted disabled:opacity-30 transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg p-1.5 hover:bg-muted disabled:opacity-30 transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message Detail Modal */}
        <AnimatePresence>
          {selectedMsg && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              onClick={() => setSelectedMsg(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-lg rounded-xl border border-border bg-card"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h3 className="font-display font-semibold">{selectedMsg.subject ?? 'Konu belirtilmemiş'}</h3>
                  <button onClick={() => setSelectedMsg(null)} className="rounded-lg p-1 hover:bg-muted">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{selectedMsg.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedMsg.email}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatDate(selectedMsg.createdAt)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedMsg.message}
                  </div>
                </div>
                <div className="flex gap-2 p-4 border-t border-border">
                  <button
                    onClick={() => handleAction(selectedMsg.id, selectedMsg.isRead ? 'markUnread' : 'markRead')}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-1"
                  >
                    {selectedMsg.isRead ? <Mail className="h-3 w-3" /> : <MailOpen className="h-3 w-3" />}
                    {selectedMsg.isRead ? 'Okunmadı İşaretle' : 'Okundu İşaretle'}
                  </button>
                  <button
                    onClick={() => handleAction(selectedMsg.id, 'delete')}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> Sil
                  </button>
                  <a
                    href={`mailto:${selectedMsg.email}?subject=Re: ${selectedMsg.subject ?? ''}`}
                    className="ml-auto rounded-lg bg-[#d4af37] px-3 py-1.5 text-xs font-medium text-black hover:bg-[#c4a030] transition-colors"
                  >
                    Yanıtla
                  </a>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
