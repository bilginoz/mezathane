'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, Loader2, Radio, Gavel, ArrowLeft } from 'lucide-react';

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-500',
  ACTIVE: 'bg-green-500',
  LIVE: 'bg-red-500',
};

export function CalendarView() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  useEffect(() => { setCurrentDate(new Date()); }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/giris');
    if (status === 'authenticated' && (session?.user as any)?.role !== 'ADMIN') router.push('/panel');
  }, [status, session, router]);

  const fetchAuctions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/calendar');
      if (res.ok) setAuctions(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') fetchAuctions();
  }, [status, fetchAuctions]);

  const year = currentDate?.getFullYear() ?? 2026;
  const month = currentDate?.getMonth() ?? 0;

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    const days: { date: Date; isCurrentMonth: boolean }[] = [];
    // Previous month
    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrentMonth: false });
    }
    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    // Next month fill
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
  }, [year, month]);

  const getAuctionsForDate = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return auctions.filter(a => {
      const start = new Date(a.startDate).toISOString().split('T')[0];
      const end = a.endDate ? new Date(a.endDate).toISOString().split('T')[0] : start;
      return dateStr >= start && dateStr <= end;
    });
  }, [auctions]);

  const selectedAuctions = useMemo(() => {
    if (!selectedDate) return [];
    return getAuctionsForDate(new Date(selectedDate));
  }, [selectedDate, getAuctionsForDate]);

  const today = currentDate ? currentDate.toISOString().split('T')[0] : '';

  if (loading || !currentDate) {
    return <main className="flex-1 py-8"><div className="flex justify-center items-center min-h-[40vh]"><Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" /></div></main>;
  }

  return (
    <main className="flex-1 py-8">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></Link>
          <Calendar className="h-6 w-6 text-[#d4af37]" />
          <h1 className="font-display text-2xl font-bold">Müzayede Takvimi</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Takvim */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-bold">{MONTHS_TR[month]} {year}</h2>
              <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {DAYS_TR.map(day => (
                <div key={day} className="text-center text-xs font-medium text-white/40 py-2">{day}</div>
              ))}
              {calendarDays.map((day, idx) => {
                const dateStr = day.date.toISOString().split('T')[0];
                const dayAuctions = getAuctionsForDate(day.date);
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDate;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`relative p-1.5 sm:p-2 rounded-lg text-sm transition-all min-h-[48px] sm:min-h-[60px] flex flex-col items-center ${
                      !day.isCurrentMonth ? 'text-white/20' : 'text-white'
                    } ${
                      isSelected ? 'bg-[#d4af37]/20 border border-[#d4af37]/50' : 'hover:bg-white/5'
                    } ${
                      isToday ? 'ring-1 ring-[#d4af37]/50' : ''
                    }`}
                  >
                    <span className={`text-xs sm:text-sm ${isToday ? 'font-bold text-[#d4af37]' : ''}`}>
                      {day.date.getDate()}
                    </span>
                    {dayAuctions.length > 0 && (
                      <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                        {dayAuctions.slice(0, 3).map((a: any, i: number) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[a.status] ?? 'bg-gray-400'}`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4 mt-4 pt-4 border-t border-white/10">
              {Object.entries(STATUS_COLORS).map(([key, color]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="text-xs text-white/50">
                    {key === 'SCHEDULED' ? 'Planlanmış' : key === 'ACTIVE' ? 'Aktif' : 'Canlı'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Seçilen Gün Detayları */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
            <h3 className="font-semibold mb-4">
              {selectedDate
                ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' })
                : 'Bir gün seçin'}
            </h3>

            {selectedDate && selectedAuctions.length === 0 && (
              <p className="text-white/40 text-sm">Bu tarihte müzayede yok</p>
            )}

            <div className="space-y-3">
              {selectedAuctions.map((a: any) => (
                <Link key={a.id} href={`/muzayede/${a.id}`} className="block bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors">
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${STATUS_COLORS[a.status] ?? 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{a.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">
                        {a.seller?.companyName ?? a.seller?.user?.fullName} • {a._count?.lots ?? 0} lot
                      </p>
                      <p className="text-xs text-white/50 mt-1">
                        {new Date(a.startDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' })}
                        {a.endDate && ` - ${new Date(a.endDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: 'Europe/Istanbul' })}`}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
