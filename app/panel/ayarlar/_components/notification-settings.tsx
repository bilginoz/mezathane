'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bell, Mail, Smartphone, Loader2, Shield, ChevronDown, ChevronUp, ArrowLeft, Monitor, Lock } from 'lucide-react';
import { useBrowserNotifications } from '@/hooks/use-browser-notifications';
import { motion } from 'framer-motion';

interface NotificationPrefs {
  emailOutbid: boolean;
  emailAuctionWon: boolean;
  emailPaymentReminder: boolean;
  emailWatchlistBid: boolean;
  emailAuctionStart: boolean;
  emailOrderStatus: boolean;
  inAppOutbid: boolean;
  inAppAuctionWon: boolean;
  inAppWatchlistBid: boolean;
  inAppAuctionStart: boolean;
  inAppOrderStatus: boolean;
  emailLiveAuction: boolean;
  inAppLiveAuction: boolean;
}

const MANDATORY_NOTIFICATIONS = [
  {
    title: 'Müzayede Kazanma',
    description: 'Bir müzayedeyi kazandığınızda e-posta ve uygulama içi bildirim gönderilir',
    icon: '🏆',
    channels: ['E-posta', 'Uygulama İçi'],
  },
  {
    title: 'Ödeme Hatırlatması',
    description: 'Ödeme vadesi yaklaştığında e-posta ve uygulama içi hatırlatma gönderilir',
    icon: '💳',
    channels: ['E-posta', 'Uygulama İçi'],
  },
];

const NOTIFICATION_GROUPS = [
  {
    title: 'Teklif Bildirimleri',
    description: 'Teklifleriniz geçildiğinde bildirim alın',
    emailKey: 'emailOutbid' as keyof NotificationPrefs,
    inAppKey: 'inAppOutbid' as keyof NotificationPrefs,
    icon: '🔔',
  },
  {
    title: 'Favori Lot Teklifleri',
    description: 'İzleme listenizdeki lotlara yeni teklif geldiğinde bildirim alın',
    emailKey: 'emailWatchlistBid' as keyof NotificationPrefs,
    inAppKey: 'inAppWatchlistBid' as keyof NotificationPrefs,
    icon: '❤️',
  },
  {
    title: 'Müzayede Başlangıcı',
    description: 'İlgilendiğiniz müzayedeler başladığında bildirim alın',
    emailKey: 'emailAuctionStart' as keyof NotificationPrefs,
    inAppKey: 'inAppAuctionStart' as keyof NotificationPrefs,
    icon: '🚀',
  },
  {
    title: 'Canlı Müzayede Hatırlatması',
    description: 'Canlı müzayede başlamadan 20 dk önce bildirim alın',
    emailKey: 'emailLiveAuction' as keyof NotificationPrefs,
    inAppKey: 'inAppLiveAuction' as keyof NotificationPrefs,
    icon: '🔴',
  },
  {
    title: 'Sipariş Durumu',
    description: 'Siparişlerinizin durumu değiştiğinde bildirim alın',
    emailKey: 'emailOrderStatus' as keyof NotificationPrefs,
    inAppKey: 'inAppOrderStatus' as keyof NotificationPrefs,
    icon: '📦',
  },
];

export default function NotificationSettings({ embedded }: { embedded?: boolean } = {}) {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const { permission, requestPermission, resetPreference, isSupported } = useBrowserNotifications();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/giris');
    }
  }, [status, router]);

  const fetchPrefs = useCallback(async () => {
    try {
      const res = await fetch('/api/notification-preferences');
      if (res.ok) {
        const data = await res.json();
        setPrefs(data);
      }
    } catch (error) {
      console.error('Tercihler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPrefs();
    }
  }, [status, fetchPrefs]);

  const updatePref = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!prefs) return;
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    setSaving(true);
    try {
      const res = await fetch('/api/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      if (res.ok) {
        toast.success('Tercih güncellendi');
      } else {
        setPrefs(prefs); // Geri al
        toast.error('Tercih güncellenemedi');
      }
    } catch {
      setPrefs(prefs);
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const toggleAll = async (channel: 'email' | 'inApp', value: boolean) => {
    if (!prefs) return;
    const updates: Partial<NotificationPrefs> = {};
    for (const group of NOTIFICATION_GROUPS) {
      if (channel === 'email') {
        updates[group.emailKey] = value;
      } else if (group.inAppKey) {
        updates[group.inAppKey] = value;
      }
    }
    const newPrefs = { ...prefs, ...updates };
    setPrefs(newPrefs);
    setSaving(true);
    try {
      const res = await fetch('/api/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        toast.success(`Tüm ${channel === 'email' ? 'e-posta' : 'uygulama'} bildirimleri ${value ? 'açıldı' : 'kapatıldı'}`);
      } else {
        setPrefs(prefs);
        toast.error('Güncelleme başarısız');
      }
    } catch {
      setPrefs(prefs);
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
      </div>
    );
  }

  if (!prefs) return null;

  const allEmailOn = NOTIFICATION_GROUPS.every(g => prefs[g.emailKey]);
  const allInAppOn = NOTIFICATION_GROUPS.filter(g => g.inAppKey).every(g => prefs[g.inAppKey!]);

  return (
    <div className={embedded ? '' : 'max-w-3xl mx-auto px-4 py-8 sm:py-12'}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Başlık */}
        {!embedded && (
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="rounded-lg border border-border p-2 hover:bg-muted transition-colors"><ArrowLeft className="h-4 w-4" /></button>
            <div className="w-12 h-12 rounded-xl bg-[#d4af37]/20 flex items-center justify-center">
              <Bell className="w-6 h-6 text-[#d4af37]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Bildirim Ayarları</h1>
              <p className="text-white/50 text-sm">Hangi bildirimleri almak istediğinizi seçin</p>
            </div>
          </div>
        )}

        {/* Toplu Kontrol */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
          <h3 className="text-white font-semibold mb-4 text-lg">Hızlı Kontrol</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => toggleAll('email', !allEmailOn)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all flex-1 justify-center ${
                allEmailOn
                  ? 'bg-[#d4af37]/20 border-[#d4af37]/50 text-[#d4af37]'
                  : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span className="text-sm font-medium">Tüm E-posta Bildirimleri</span>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${allEmailOn ? 'bg-[#d4af37]/30' : 'bg-white/10'}`}>
                {allEmailOn ? 'AÇIK' : 'KAPALI'}
              </span>
            </button>
            <button
              onClick={() => toggleAll('inApp', !allInAppOn)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all flex-1 justify-center ${
                allInAppOn
                  ? 'bg-[#d4af37]/20 border-[#d4af37]/50 text-[#d4af37]'
                  : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span className="text-sm font-medium">Tüm Uygulama Bildirimleri</span>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${allInAppOn ? 'bg-[#d4af37]/30' : 'bg-white/10'}`}>
                {allInAppOn ? 'AÇIK' : 'KAPALI'}
              </span>
            </button>
          </div>
        </div>

        {/* Zorunlu Bildirimler */}
        <div className="bg-white/5 border border-amber-500/30 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-amber-400" />
            <h3 className="text-white font-semibold text-lg">Zorunlu Bildirimler</h3>
          </div>
          <p className="text-white/40 text-xs mb-4">Bu bildirimler platform güvenliği ve yasal yükümlülükler gereği kapatılamaz.</p>
          <div className="space-y-3">
            {MANDATORY_NOTIFICATIONS.map((notif, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-lg bg-white/5 p-3">
                <span className="text-xl">{notif.icon}</span>
                <div className="flex-1">
                  <h4 className="text-white text-sm font-medium">{notif.title}</h4>
                  <p className="text-white/40 text-xs">{notif.description}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {notif.channels.map(ch => (
                    <span key={ch} className="text-[10px] px-2 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37] font-medium">{ch}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bildirim Grupları */}
        <div className="space-y-3">
          {NOTIFICATION_GROUPS.map((group, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            >
              {/* Grup Başlığı */}
              <button
                onClick={() => setExpandedGroup(expandedGroup === idx ? null : idx)}
                className="w-full flex items-center gap-3 p-4 sm:p-5 hover:bg-white/5 transition-colors"
              >
                <span className="text-2xl">{group.icon}</span>
                <div className="flex-1 text-left">
                  <h3 className="text-white font-semibold">{group.title}</h3>
                  <p className="text-white/40 text-sm hidden sm:block">{group.description}</p>
                </div>
                {/* Durum Göstergesi */}
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${prefs[group.emailKey] ? 'bg-[#d4af37]' : 'bg-white/20'}`} />
                  {group.inAppKey && (
                    <div className={`w-2 h-2 rounded-full ${prefs[group.inAppKey] ? 'bg-blue-400' : 'bg-white/20'}`} />
                  )}
                </div>
                {expandedGroup === idx ? (
                  <ChevronUp className="w-4 h-4 text-white/40" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-white/40" />
                )}
              </button>

              {/* Genişletilmiş İçerik */}
              {expandedGroup === idx && (
                <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3 border-t border-white/5 pt-3">
                  <p className="text-white/40 text-sm sm:hidden">{group.description}</p>
                  {/* E-posta Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#d4af37]" />
                      <span className="text-white/80 text-sm">E-posta Bildirimi</span>
                    </div>
                    <button
                      onClick={() => updatePref(group.emailKey, !prefs[group.emailKey])}
                      disabled={saving}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                        prefs[group.emailKey] ? 'bg-[#d4af37]' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                          prefs[group.emailKey] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Uygulama İçi Toggle */}
                  {group.inAppKey && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-blue-400" />
                        <span className="text-white/80 text-sm">Uygulama Bildirimi</span>
                      </div>
                      <button
                        onClick={() => updatePref(group.inAppKey!, !prefs[group.inAppKey!])}
                        disabled={saving}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                          prefs[group.inAppKey!] ? 'bg-blue-500' : 'bg-white/20'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                            prefs[group.inAppKey!] ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Tarayıcı Bildirimleri */}
        {isSupported && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <Monitor className="w-5 h-5 text-amber-400" />
              <h3 className="text-white font-semibold text-lg">Tarayıcı Bildirimleri</h3>
            </div>
            <p className="text-white/50 text-sm mb-4">
              Siz sitede gezinirken masaüstü bildirimi alın. Teklifiniz geçildiğinde, müzayede kazandığınızda anında haberdar olun.
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  permission === 'granted' ? 'bg-green-400' :
                  permission === 'denied' ? 'bg-red-400' : 'bg-white/30'
                }`} />
                <span className="text-white/80 text-sm">
                  {permission === 'granted' ? 'Bildirimler açık' :
                   permission === 'denied' ? 'Tarayıcı tarafından engellendi' :
                   'Bildirimler kapalı'}
                </span>
              </div>
              {permission === 'granted' ? (
                <span className="text-xs text-green-400/70 px-3 py-1.5 rounded-lg bg-green-400/10">✓ Aktif</span>
              ) : permission === 'denied' ? (
                <span className="text-xs text-white/40 px-3 py-1.5">Tarayıcı ayarlarından açabilirsiniz</span>
              ) : (
                <button
                  onClick={permission === 'dismissed' ? resetPreference : requestPermission}
                  className="px-4 py-1.5 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                >
                  {permission === 'dismissed' ? 'Tekrar Sor' : 'İzin Ver'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bilgi Notu */}
        <div className="bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-xl p-4 flex gap-3">
          <Shield className="w-5 h-5 text-[#d4af37] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white/80 text-sm">
              E-postalar <strong className="text-[#d4af37]">bilgi@mezathane.tr</strong> adresinden gönderilir.
              Spam klasörünüzü kontrol etmeyi unutmayın.
            </p>
            <p className="text-white/50 text-xs mt-1">
              SMS bildirimleri yakında eklenecektir.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
