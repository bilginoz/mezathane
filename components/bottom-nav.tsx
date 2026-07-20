'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Gavel, Heart, User, Bell, Search, LayoutDashboard, Store, Shield } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';

export function BottomNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession() || {};
  const user = session?.user as any;
  const [unreadCount, setUnreadCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (user?.id) {
      fetch('/api/notifications')
        .then((r) => r.json())
        .then((d) => setUnreadCount(d?.unreadCount ?? 0))
        .catch(() => {});
    }
  }, [user?.id, pathname]);

  // Admin/satıcı panellerinde gösterme
  const hiddenPaths = ['/admin', '/satici', '/giris', '/kayit', '/dogrulama', '/sifremi-unuttum', '/sifre-sifirla'];
  const shouldHide = hiddenPaths.some(p => pathname?.startsWith(p));
  if (shouldHide) return null;

  const getDashboardLink = () => {
    if (!user) return '/giris';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'SELLER') return '/satici';
    return '/panel';
  };

  const getDashboardIcon = () => {
    if (!user) return <User className="h-5 w-5" />;
    if (user.role === 'ADMIN') return <Shield className="h-5 w-5" />;
    if (user.role === 'SELLER') return <Store className="h-5 w-5" />;
    return <LayoutDashboard className="h-5 w-5" />;
  };

  const getDashboardLabel = () => {
    if (!user) return 'Giriş';
    return 'Panel';
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  };

  const navItems = [
    { href: '/', icon: Home, label: 'Ana Sayfa' },
    { href: '/muzayedeler', icon: Gavel, label: 'Müzayede' },
    { href: user ? '/panel/favorilerim' : '/giris', icon: Heart, label: 'Favoriler' },
    {
      href: user ? '/bildirimler' : '/giris',
      icon: Bell,
      label: 'Bildirim',
      badge: unreadCount,
    },
    {
      href: getDashboardLink(),
      icon: () => getDashboardIcon(),
      label: getDashboardLabel(),
      customIcon: true,
    },
  ];

  if (!mounted) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const IconComponent = item.icon;
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors relative ${
                active ? 'text-[#d4af37]' : 'text-muted-foreground'
              }`}
            >
              <div className="relative">
                {item.customIcon ? (
                  getDashboardIcon()
                ) : (
                  <IconComponent className="h-5 w-5" />
                )}
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#d4af37] text-[9px] font-bold text-black px-1">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] font-medium ${active ? 'text-[#d4af37]' : ''}`}>
                {item.label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#d4af37]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
