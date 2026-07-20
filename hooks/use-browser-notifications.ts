'use client';

import { useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'mezathane_notif_pref';
const DISMISSED_KEY = 'mezathane_notif_dismissed';

type NotifPref = 'granted' | 'denied' | 'dismissed' | 'default';

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotifPref>('default');
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const stored = localStorage.getItem(STORAGE_KEY) as NotifPref | null;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    const browserPerm = Notification.permission;

    if (browserPerm === 'granted') {
      setPermission('granted');
      localStorage.setItem(STORAGE_KEY, 'granted');
      setShowBanner(false);
    } else if (browserPerm === 'denied') {
      setPermission('denied');
      localStorage.setItem(STORAGE_KEY, 'denied');
      setShowBanner(false);
    } else if (dismissed || stored === 'dismissed') {
      setPermission('dismissed');
      setShowBanner(false);
    } else {
      setPermission('default');
      // Show banner after 5 seconds delay
      const timer = setTimeout(() => setShowBanner(true), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotifPref);
      localStorage.setItem(STORAGE_KEY, result);
      setShowBanner(false);
    } catch {
      setPermission('denied');
    }
  }, []);

  const dismissBanner = useCallback(() => {
    setPermission('dismissed');
    localStorage.setItem(DISMISSED_KEY, 'true');
    localStorage.setItem(STORAGE_KEY, 'dismissed');
    setShowBanner(false);
  }, []);

  const resetPreference = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DISMISSED_KEY);
    setPermission('default');
    setShowBanner(true);
  }, []);

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      try {
        const notif = new Notification(title, {
          icon: '/favicon.png',
          badge: '/favicon.png',
          ...options,
        });
        notif.onclick = () => {
          window.focus();
          if (options?.data?.url) {
            window.location.href = options.data.url;
          }
          notif.close();
        };
      } catch {
        // Notification failed silently
      }
    },
    []
  );

  return {
    permission,
    showBanner,
    requestPermission,
    dismissBanner,
    resetPreference,
    sendNotification,
    isSupported: typeof window !== 'undefined' && 'Notification' in window,
  };
}
