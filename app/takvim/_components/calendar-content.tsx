'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, Gavel, Clock, MapPin } from 'lucide-react';

const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  ACTIVE: 'bg-green-500/20 border-green-500/50 text-green-400',
  LIVE: 'bg-red-500/20 border-red-500/50 text-red-400',
  COMPLETED: 'bg-gray-500/20 border-gray-500/50 text-gray-400',
};

const statusLabels: Record<string, string> = {
  SCHEDULED: 'Planlandı',
  ACTIVE: 'Aktif',
  LIVE: 'Canlı',
  COMPLETED: 'Tamamlandı',
};

interface Auction {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  bannerUrl?: string;
  seller?: { companyName: string };
  _count?: { lots: number };

}

export default function CalendarContent() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const fetchAuctions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?month=${month}&year=${year}`);
      const data = await res.json();
      setAuctions(Array.isArray(data) ? data : []);
    } catch {
      setAuctions([]);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchAuctions(); }, [fetchAuctions]);

  const prevMonth = () => {
    setSelectedDay(null);
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const nextMonth = () => {
    setSelectedDay(null);
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Takvim hesaplamaları
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Pazartesi başlangıç
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  // Günlere müzayede eşle
  const getAuctionsForDay = (day: number) => {
    const dayStart = new Date(year, month, day);
    const dayEnd = new Date(year, month, day, 23, 59, 59);
    return auctions.filter(a => {
      const start = new Date(a.startDate);
      const end = new Date(a.endDate);
      return start <= dayEnd && end >= dayStart;
    });
  };

  const selectedAuctions = selectedDay ? getAuctionsForDay(selectedDay) : [];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
  };

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      {/* Başlık */}
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl font-bold mb-2">
          <span className="gold-text">Müzayede</span> Takvimi
        </h1>
        <p className="text-sm text-muted-foreground">Yaklaşan ve devam eden müzayedeleri takvimde görüntüleyin</p>
      </div>

      {/* Ay navigasyonu */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="font-display text-xl font-bold">
          {MONTHS[month]} {year}
        </h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Takvim Grid */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Gün başlıkları */}
          <div className="grid grid-cols-7 bg-muted/50">
            {DAYS.map(d => (
              <div key={d} className="p-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
            ))}
          </div>

          {/* Günler */}
          <div className="grid grid-cols-7">
            {/* Boş hücreler */}
            {Array.from({ length: adjustedFirstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] sm:min-h-[100px] border-t border-r border-border/30 bg-muted/10" />
            ))}

            {/* Günler */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayAuctions = getAuctionsForDay(day);
              const isToday = isCurrentMonth && today.getDate() === day;
              const isSelected = selectedDay === day;
              const hasAuctions = dayAuctions.length > 0;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`min-h-[80px] sm:min-h-[100px] border-t border-r border-border/30 p-1 sm:p-1.5 text-left transition-colors relative
                    ${isSelected ? 'bg-[#d4af37]/10 ring-1 ring-[#d4af37]/50' : hasAuctions ? 'hover:bg-muted/50' : 'hover:bg-muted/20'}
                    ${isToday ? 'bg-[#d4af37]/5' : ''}
                  `}
                >
                  <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full
                    ${isToday ? 'bg-[#d4af37] text-black font-bold' : 'text-muted-foreground'}
                  `}>
                    {day}
                  </span>
                  <div className="mt-0.5 space-y-0.5">
                    {dayAuctions.slice(0, 2).map(a => (
                      <div key={a.id} className={`text-[9px] sm:text-[10px] px-1 py-0.5 rounded truncate border ${statusColors[a.status] || 'bg-muted text-muted-foreground border-border'}`}>
                        {a.title.length > 18 ? a.title.slice(0, 18) + '…' : a.title}
                      </div>
                    ))}
                    {dayAuctions.length > 2 && (
                      <div className="text-[9px] text-muted-foreground text-center">+{dayAuctions.length - 2} daha</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sağ Panel — Seçili gün detayı veya özet */}
        <div className="space-y-4">
          {/* Renk kodu */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Durum Renkleri</h3>
            <div className="space-y-2">
              {Object.entries(statusLabels).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full border ${statusColors[key]?.replace(/text-\S+/, '')}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Seçili gün detayı */}
          <AnimatePresence mode="wait">
            {selectedDay && (
              <motion.div
                key={selectedDay}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="rounded-xl border border-border bg-card p-4"
              >
                <h3 className="text-sm font-bold mb-3">
                  <Calendar className="inline h-4 w-4 mr-1.5 text-[#d4af37]" />
                  {selectedDay} {MONTHS[month]} {year}
                </h3>
                {selectedAuctions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Bu günde müzayede yok</p>
                ) : (
                  <div className="space-y-3">
                    {selectedAuctions.map(a => (
                      <Link key={a.id} href={`/muzayede/${a.id}`} className="block rounded-lg border border-border hover:border-[#d4af37]/50 p-3 transition-colors group">
                        <div className="flex items-start gap-2 mb-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${statusColors[a.status]}`}>
                            {statusLabels[a.status]}
                          </span>
                          {(a._count?.lots ?? 0) > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{a._count?.lots} lot</span>
                          )}
                        </div>
                        <h4 className="text-sm font-medium group-hover:text-[#d4af37] transition-colors mb-1">{a.title}</h4>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(a.startDate)}</span>
                          <span className="flex items-center gap-1"><Gavel className="h-3 w-3" />{a._count?.lots ?? 0} lot</span>
                        </div>
                        {a.seller?.companyName && (
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {a.seller.companyName}
                          </p>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Yaklaşan müzayedeler listesi */}
          {!selectedDay && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Bu Aydaki Müzayedeler</h3>
              {loading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">Yükleniyor...</div>
              ) : auctions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">Bu ayda müzayede bulunmuyor</div>
              ) : (
                <div className="space-y-2">
                  {auctions.slice(0, 8).map(a => (
                    <Link key={a.id} href={`/muzayede/${a.id}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className={`w-2 h-2 rounded-full ${statusColors[a.status]?.split(' ')[0]?.replace('/20', '')}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{a.title}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(a.startDate)}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{a._count?.lots ?? 0} lot</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
