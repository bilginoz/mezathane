'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Bell, Menu, X, User, LogOut, LayoutDashboard,
  ChevronDown, Gavel, Store, Shield, Heart, Settings, Sun, Moon, UserCheck,
  CreditCard, Package, Tag, Calendar, MessageCircle, HelpCircle
} from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { useBrowserNotifications } from '@/hooks/use-browser-notifications';

export function Header() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [pendingPayments, setPendingPayments] = useState(0);
  const { theme, setTheme } = useTheme();
  const { sendNotification } = useBrowserNotifications();
  const prevUnreadRef = useRef(0);
  const user = session?.user as any;

  useEffect(() => {
    fetch('/api/site-settings').then(r => r.json()).then(d => setSiteSettings(d?.settings)).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.id) {
      const fetchNotifications = () => {
        fetch('/api/notifications')
          .then((r) => r.json())
          .then((d) => {
            const newCount = d?.unreadCount ?? 0;
            // Yeni bildirim geldiğinde tarayıcı bildirimi gönder
            if (newCount > prevUnreadRef.current && prevUnreadRef.current >= 0 && d?.notifications?.length) {
              const latest = d.notifications[0];
              sendNotification(latest.title || 'Mezathane.tr', {
                body: latest.message || 'Yeni bildiriminiz var',
                tag: 'mezathane-' + latest.id,
                data: { url: latest.link || '/bildirimler' },
              });
            }
            prevUnreadRef.current = newCount;
            setUnreadCount(newCount);
          })
          .catch(() => {});
      };
      fetchNotifications();
      // Her 30 saniyede bir bildirim kontrolü (kredi harcamaz)
      const interval = setInterval(fetchNotifications, 30000);
      // Ödeme bekleyen siparişleri kontrol et
      fetch('/api/buyer/pending-payments')
        .then((r) => r.json())
        .then((d) => setPendingPayments(d?.count ?? 0))
        .catch(() => {});
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  // Autocomplete arama
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults(null); setSearchOpen(false); return; }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data);
      const hasResults = (data.lots?.length || 0) + (data.auctions?.length || 0) + (data.categories?.length || 0) > 0;
      setSearchOpen(hasResults || q.length >= 2);
    } catch { setSearchResults(null); }
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  // Dışarı tıklayınca kapat
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setDesktopSearchOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDesktopSearch();
        setMobileSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchOpen(false);
    setDesktopSearchOpen(false);
    if (searchQuery?.trim()) {
      router.push(`/muzayedeler?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleResultClick = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults(null);
    setDesktopSearchOpen(false);
  };

  const closeDesktopSearch = () => {
    setDesktopSearchOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults(null);
  };

  const getDashboardLink = () => {
    if (user?.role === 'ADMIN') return '/admin';
    if (user?.role === 'SELLER') return '/satici';
    return '/panel';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-[1200px] px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="relative h-10 w-14">
              <Image src={siteSettings?.logoUrl || '/images/logo.png'} alt="Mezathane Logo" fill className="object-contain" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">
              <span className="gold-text">Mezathane</span>
              <span className="text-muted-foreground text-sm">.tr</span>
            </span>
          </Link>

          {/* Desktop Search Icon + Overlay */}
          <div ref={searchRef} className="hidden md:block relative">
            <button
              onClick={() => {
                setDesktopSearchOpen(true);
                setTimeout(() => desktopSearchInputRef.current?.focus(), 50);
              }}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Ara"
            >
              <Search className="h-5 w-5 text-muted-foreground" />
            </button>
            <AnimatePresence>
              {desktopSearchOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-2 w-[420px] z-50"
                >
                  <form onSubmit={handleSearch}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        ref={desktopSearchInputRef}
                        type="text"
                        placeholder="Lot, müzayede veya kategori ara..."
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        onFocus={() => { if (searchResults && searchQuery.length >= 2) setSearchOpen(true); }}
                        className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-10 text-sm placeholder:text-muted-foreground focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37] shadow-xl"
                      />
                      <button type="button" onClick={closeDesktopSearch} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted">
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </form>
                  <AnimatePresence>
                    {searchOpen && searchResults && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="mt-1 w-full rounded-xl border border-border bg-card shadow-xl overflow-hidden max-h-[420px] overflow-y-auto"
                      >
                        {searchResults.lots?.length > 0 && (
                          <div>
                            <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">Lotlar</p>
                            {searchResults.lots.map((lot: any) => (
                              <Link key={lot.id} href={`/lot/${lot.id}`} onClick={handleResultClick} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/80 transition-colors">
                                <div className="relative h-10 w-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                  {lot.images?.[0]?.imageUrl && <Image src={lot.images[0].imageUrl} alt={lot.title} fill className="object-cover" sizes="40px" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{lot.title}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{lot.auction?.title}</p>
                                </div>
                                <span className="text-xs font-mono font-bold text-[#d4af37] flex-shrink-0">{formatPrice(lot.currentPrice || lot.startingPrice)}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                        {searchResults.auctions?.length > 0 && (
                          <div>
                            <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">Müzayedeler</p>
                            {searchResults.auctions.map((a: any) => (
                              <Link key={a.id} href={`/muzayede/${a.id}`} onClick={handleResultClick} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/80 transition-colors">
                                <Calendar className="h-4 w-4 text-[#d4af37] flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{a.title}</p>
                                  <p className="text-[10px] text-muted-foreground">{a._count?.lots ?? 0} lot</p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                        {searchResults.categories?.length > 0 && (
                          <div>
                            <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">Kategoriler</p>
                            {searchResults.categories.map((c: any) => (
                              <Link key={c.id} href={`/muzayedeler?category=${c.slug}`} onClick={handleResultClick} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/80 transition-colors">
                                <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm">{c.name}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                        {!searchResults.lots?.length && !searchResults.auctions?.length && !searchResults.categories?.length && (
                          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                            "{searchQuery}" için sonuç bulunamadı
                          </div>
                        )}
                        {(searchResults.lots?.length > 0 || searchResults.auctions?.length > 0) && (
                          <div className="border-t border-border">
                            <button onClick={() => { handleSearch({ preventDefault: () => {} } as any); }} className="w-full px-3 py-2.5 text-xs font-medium text-[#d4af37] hover:bg-muted/50 transition-colors text-center">
                              Tüm sonuçları gör →
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/muzayedeler" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
              Müzayedeler
            </Link>
            <Link href="/takvim" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
              Takvim
            </Link>
            <Link href="/blog" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
              Blog
            </Link>
            <Link href="/hakkimizda" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
              Hakkımızda
            </Link>
            <Link href="/iletisim" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
              İletişim
            </Link>
            <Link href="/yardim" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted">
              Yardım
            </Link>
          </nav>

          {/* Mobile search button */}
          <button
            onClick={() => { setMobileSearchOpen(!mobileSearchOpen); setMobileOpen(false); }}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Ara"
          >
            <Search className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-2">
            {status === 'authenticated' && user ? (
              <>
                {pendingPayments > 0 && (
                  <Link href="/panel/siparislerim" className="flex items-center gap-1.5 rounded-lg bg-red-600/90 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors animate-pulse">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Ödeme Bekliyor</span>
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-red-600 text-[10px] font-bold">
                      {pendingPayments}
                    </span>
                  </Link>
                )}
                <Link href="/bildirimler" className="relative p-2 rounded-lg hover:bg-muted transition-colors">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#d4af37] text-[10px] font-bold text-black">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted transition-colors"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d4af37] text-black text-xs font-bold">
                      {user?.name?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <span className="hidden lg:block text-sm font-medium max-w-[100px] truncate">
                      {user?.name ?? 'Kullanıcı'}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-border bg-card shadow-lg overflow-hidden z-50"
                      >
                        <div className="p-3 border-b border-border">
                          <p className="text-sm font-medium truncate">{user?.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        </div>
                        <div className="p-1">
                          <Link href={getDashboardLink()} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors">
                            <LayoutDashboard className="h-4 w-4" /> Panel
                          </Link>
                          {user?.sellerProfileId && (
                            <Link href="/satici/profil" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors">
                              <UserCheck className="h-4 w-4" /> Satıcı Profilim
                            </Link>
                          )}
                          <Link href="/panel/tekliflerim" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors">
                            <Gavel className="h-4 w-4" /> Tekliflerim
                          </Link>
                          <Link href="/panel/siparislerim" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors">
                            <Package className="h-4 w-4" /> Siparişlerim
                          </Link>
                          <Link href="/panel/favorilerim" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors">
                            <Heart className="h-4 w-4" /> Favorilerim
                          </Link>
                          <Link href={user?.role === 'SELLER' ? '/satici/mesajlar' : '/panel/mesajlar'} onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors">
                            <MessageCircle className="h-4 w-4" /> Mesajlarım
                          </Link>
                          <Link href="/panel/ayarlar" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors">
                            <Settings className="h-4 w-4" /> Hesap Ayarları
                          </Link>
                          {user?.role === 'ADMIN' && (
                            <Link href="/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors text-[#d4af37]">
                              <Shield className="h-4 w-4" /> Admin Panel
                            </Link>
                          )}
                          {user?.role !== 'SELLER' && (user?.sellerStatus === 'APPROVED') && (
                            <Link href="/satici" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors text-[#d4af37]">
                              <Store className="h-4 w-4" /> Satıcı Paneli
                            </Link>
                          )}
                        </div>
                        <div className="p-1 border-t border-border">
                          <button
                            onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: '/' }); }}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                          >
                            <LogOut className="h-4 w-4" /> Çıkış Yap
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-1">
                <Link href="/satici-giris" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Satıcı Girişi
                </Link>
                <Link href="/giris" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Giriş Yap
                </Link>
                <Link href="/kayit" className="px-4 py-2 text-sm font-medium rounded-lg bg-[#d4af37] text-black hover:bg-[#c9a430] transition-colors">
                  Kayıt Ol
                </Link>
              </div>
            )}

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="hidden md:inline-flex relative p-2 rounded-lg hover:bg-muted transition-colors"
              title={theme === 'dark' ? 'Aydınlık mod' : 'Karanlık mod'}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute inset-0 m-auto h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>

            <button onClick={() => { setMobileOpen(!mobileOpen); setMobileSearchOpen(false); }} className="md:hidden p-2 rounded-lg hover:bg-muted" aria-label="Menüyü aç/kapat">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        <AnimatePresence>
          {mobileSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden border-t border-border"
            >
              <div className="py-3">
                <form onSubmit={(e) => { handleSearch(e); setMobileSearchOpen(false); }}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Lot, müzayede veya kategori ara..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full rounded-xl border border-border bg-muted/50 py-3 pl-10 pr-4 text-sm focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
                      autoFocus
                    />
                  </div>
                </form>
                {/* Mobile search results */}
                {searchOpen && searchResults && (
                  <div className="mt-2 rounded-xl border border-border bg-card shadow-lg overflow-hidden max-h-[300px] overflow-y-auto">
                    {searchResults.lots?.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">Lotlar</p>
                        {searchResults.lots.map((lot: any) => (
                          <Link key={lot.id} href={`/lot/${lot.id}`} onClick={() => { handleResultClick(); setMobileSearchOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/80 transition-colors">
                            <div className="relative h-10 w-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                              {lot.images?.[0]?.imageUrl && <Image src={lot.images[0].imageUrl} alt={lot.title} fill className="object-cover" sizes="40px" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{lot.title}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{lot.auction?.title}</p>
                            </div>
                            <span className="text-xs font-mono font-bold text-[#d4af37] flex-shrink-0">{formatPrice(lot.currentPrice || lot.startingPrice)}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                    {searchResults.auctions?.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">Müzayedeler</p>
                        {searchResults.auctions.map((a: any) => (
                          <Link key={a.id} href={`/muzayede/${a.id}`} onClick={() => { handleResultClick(); setMobileSearchOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/80 transition-colors">
                            <Calendar className="h-4 w-4 text-[#d4af37] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{a.title}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    {searchResults.categories?.length > 0 && (
                      <div>
                        <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">Kategoriler</p>
                        {searchResults.categories.map((c: any) => (
                          <Link key={c.id} href={`/muzayedeler?category=${c.slug}`} onClick={() => { handleResultClick(); setMobileSearchOpen(false); }} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/80 transition-colors">
                            <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm">{c.name}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden border-t border-border"
            >
              <div className="py-4 space-y-1">
                <Link href="/muzayedeler" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted">
                  <Gavel className="h-4 w-4 text-[#d4af37]" /> Müzayedeler
                </Link>
                <Link href="/takvim" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted">
                  <Calendar className="h-4 w-4 text-[#d4af37]" /> Takvim
                </Link>
                <Link href="/blog" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted">
                  <MessageCircle className="h-4 w-4 text-[#d4af37]" /> Blog
                </Link>
                <Link href="/hakkimizda" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" /> Hakkımızda
                </Link>
                <Link href="/iletisim" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted">
                  <Bell className="h-4 w-4 text-muted-foreground" /> İletişim
                </Link>
                <Link href="/yardim" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" /> Yardım
                </Link>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted w-full"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
                  {theme === 'dark' ? 'Aydınlık Mod' : 'Karanlık Mod'}
                </button>
                {status === 'authenticated' && user && (
                  <>
                    <div className="border-t border-border my-2" />
                    <Link href={getDashboardLink()} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted">
                      <LayoutDashboard className="h-4 w-4 text-[#d4af37]" /> Panelim
                    </Link>
                    {user?.sellerProfileId && (
                      <Link href="/satici/profil" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted">
                        <UserCheck className="h-4 w-4 text-muted-foreground" /> Satıcı Profilim
                      </Link>
                    )}
                    <Link href="/panel/tekliflerim" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted">
                      <Gavel className="h-4 w-4 text-muted-foreground" /> Tekliflerim
                    </Link>
                    <Link href="/panel/favorilerim" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted">
                      <Heart className="h-4 w-4 text-muted-foreground" /> Favorilerim
                    </Link>
                    <Link href={user?.role === 'SELLER' ? '/satici/mesajlar' : '/panel/mesajlar'} onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" /> Mesajlarım
                    </Link>
                    {pendingPayments > 0 && (
                      <Link href="/panel/siparislerim" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 font-medium">
                        <CreditCard className="h-4 w-4" /> Ödeme Bekliyor
                        <span className="ml-auto bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{pendingPayments}</span>
                      </Link>
                    )}
                    <Link href="/bildirimler" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted">
                      <Bell className="h-4 w-4 text-muted-foreground" /> Bildirimler
                      {unreadCount > 0 && <span className="ml-auto bg-[#d4af37] text-black text-[10px] font-bold rounded-full px-1.5 py-0.5">{unreadCount}</span>}
                    </Link>
                    <Link href="/panel/ayarlar" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted">
                      <Settings className="h-4 w-4 text-muted-foreground" /> Hesap Ayarları
                    </Link>
                    {user?.role === 'ADMIN' && (
                      <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted text-[#d4af37]">
                        <Shield className="h-4 w-4" /> Admin Panel
                      </Link>
                    )}
                    {user?.role !== 'SELLER' && (user?.sellerStatus === 'APPROVED') && (
                      <Link href="/satici" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted text-[#d4af37]">
                        <Store className="h-4 w-4" /> Satıcı Paneli
                      </Link>
                    )}
                    <div className="border-t border-border my-2" />
                    <button
                      onClick={() => { setMobileOpen(false); signOut({ callbackUrl: '/' }); }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-destructive rounded-lg hover:bg-muted"
                    >
                      <LogOut className="h-4 w-4" /> Çıkış Yap
                    </button>
                  </>
                )}
                {status !== 'authenticated' && (
                  <>
                    <div className="border-t border-border my-2" />
                    <Link href="/satici-giris" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted">
                      <Store className="h-4 w-4 text-muted-foreground" /> Satıcı Girişi
                    </Link>
                    <Link href="/giris" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg hover:bg-muted">
                      <User className="h-4 w-4 text-muted-foreground" /> Giriş Yap
                    </Link>
                    <Link href="/kayit" onClick={() => setMobileOpen(false)} className="flex items-center justify-center gap-2 mx-3 py-2.5 text-sm font-medium rounded-lg bg-[#d4af37] text-black hover:bg-[#c9a430]">
                      Kayıt Ol
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
