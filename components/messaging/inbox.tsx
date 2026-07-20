'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Send, ArrowLeft, Clock, User, Package,
  Search, ChevronRight, Inbox as InboxIcon
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ConversationItem {
  id: string;
  subject: string;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  otherParty: { name: string; avatarUrl: string | null };
  lot: { id: string; title: string; imageUrl?: string } | null;
  createdAt: string;
}

interface MessageItem {
  id: string;
  senderId: string;
  senderRole: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface ConversationDetail {
  id: string;
  subject: string;
  buyer: { id: string; fullName: string; avatarUrl: string | null };
  seller: { id: string; name: string; avatarUrl: string | null };
  lot: { id: string; title: string; imageUrl?: string } | null;
  createdAt: string;
}

export function MessagingInbox() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [currentRole, setCurrentRole] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/giris');
    }
  }, [status, router]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (e) {
      console.error('Failed to load conversations:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      loadConversations();
    }
  }, [status, loadConversations]);

  // Check URL for conversation ID
  useEffect(() => {
    const convId = searchParams.get('id');
    if (convId && !selectedId) {
      setSelectedId(convId);
    }
  }, [searchParams, selectedId]);

  // Load messages when conversation selected
  useEffect(() => {
    if (!selectedId) return;
    setLoadingMessages(true);
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/conversations/${selectedId}`);
        const data = await res.json();
        setDetail(data.conversation);
        setMessages(data.messages || []);
        setCurrentRole(data.currentRole);
        // Update unread in list
        setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, unreadCount: 0 } : c));
      } catch (e) {
        console.error('Failed to load messages:', e);
      } finally {
        setLoadingMessages(false);
      }
    };
    loadMessages();

    // Poll for new messages every 5s
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/conversations/${selectedId}`);
        const data = await res.json();
        setMessages(data.messages || []);
      } catch (e) {}
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending || !selectedId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        // Update list
        setConversations(prev =>
          prev.map(c =>
            c.id === selectedId
              ? { ...c, lastMessage: data.message.content, lastMessageAt: data.message.createdAt }
              : c
          )
        );
      }
    } catch (e) {
      console.error('Failed to send message:', e);
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.subject.toLowerCase().includes(q) ||
      c.otherParty.name.toLowerCase().includes(q) ||
      c.lot?.title.toLowerCase().includes(q) ||
      c.lastMessage?.toLowerCase().includes(q)
    );
  });

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Az önce';
    if (mins < 60) return `${mins}dk`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}sa`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}g`;
    return formatDate(dateStr);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#d4af37] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="mx-auto max-w-[1200px] px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <MessageCircle className="h-6 w-6 text-[#d4af37]" />
          <h1 className="text-2xl font-display font-bold">Mesajlarım</h1>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden" style={{ height: 'calc(100vh - 260px)', minHeight: '500px' }}>
          <div className="flex h-full">
            {/* Conversation List */}
            <div className={`w-full md:w-[360px] border-r border-border flex flex-col ${selectedId ? 'hidden md:flex' : 'flex'}`}>
              {/* Search */}
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Konuşma ara..."
                    className="w-full rounded-lg border border-border bg-muted/50 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <InboxIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'Sonuç bulunamadı' : 'Henüz mesajınız yok'}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      Lot sayfasından satıcıya soru sorabilirsiniz
                    </p>
                  </div>
                ) : (
                  filteredConversations.map(conv => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedId(conv.id)}
                      className={`w-full text-left p-3 border-b border-border/50 hover:bg-muted/50 transition-colors ${
                        selectedId === conv.id ? 'bg-muted/80' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {conv.otherParty.avatarUrl ? (
                              <Image src={conv.otherParty.avatarUrl} alt="" width={40} height={40} className="object-cover" />
                            ) : (
                              <User className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          {conv.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#d4af37] text-[10px] font-bold text-black flex items-center justify-center">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold' : 'font-medium'}`}>
                              {conv.otherParty.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {timeAgo(conv.lastMessageAt)}
                            </span>
                          </div>
                          <p className="text-xs text-[#d4af37] mb-0.5 truncate">{conv.subject}</p>
                          <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {conv.lastMessage || 'Mesaj yok'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Message Area */}
            <div className={`flex-1 flex flex-col ${selectedId ? 'flex' : 'hidden md:flex'}`}>
              {!selectedId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <MessageCircle className="h-16 w-16 text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground">Bir konuşma seçin</p>
                </div>
              ) : loadingMessages ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#d4af37] border-t-transparent" />
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 p-3 border-b border-border bg-muted/30">
                    <button
                      onClick={() => { setSelectedId(null); setDetail(null); setMessages([]); }}
                      className="md:hidden p-1 rounded-lg hover:bg-muted"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {(currentRole === 'BUYER' ? detail?.seller.avatarUrl : detail?.buyer.avatarUrl) ? (
                        <Image
                          src={(currentRole === 'BUYER' ? detail?.seller.avatarUrl : detail?.buyer.avatarUrl) || ''}
                          alt="" width={36} height={36} className="object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {currentRole === 'BUYER' ? detail?.seller.name : detail?.buyer.fullName}
                      </p>
                      <p className="text-xs text-[#d4af37] truncate">{detail?.subject}</p>
                    </div>
                    {detail?.lot && (
                      <Link
                        href={`/lot/${detail.lot.id}`}
                        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-xs transition-colors"
                      >
                        <Package className="h-3.5 w-3.5 text-[#d4af37]" />
                        <span className="truncate max-w-[120px]">{detail.lot.title}</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map(msg => {
                      const isMe = msg.senderRole === currentRole;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                              isMe
                                ? 'bg-[#d4af37] text-black rounded-br-md'
                                : 'bg-muted rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${isMe ? 'text-black/50' : 'text-muted-foreground'}`}>
                              {timeAgo(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t border-border bg-muted/20">
                    <div className="flex items-end gap-2">
                      <textarea
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder="Mesajınızı yazın..."
                        rows={1}
                        className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37] max-h-32"
                        style={{ minHeight: '42px' }}
                      />
                      <button
                        onClick={handleSend}
                        disabled={!newMessage.trim() || sending}
                        className="flex-shrink-0 rounded-xl bg-[#d4af37] p-2.5 text-black hover:bg-[#c9a430] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Send className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
