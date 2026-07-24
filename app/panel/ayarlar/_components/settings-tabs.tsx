'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Bell, ShieldCheck, ArrowLeft } from 'lucide-react';
import { ProfileSettings } from './profile-settings';
import NotificationSettings from './notification-settings';
import { SecuritySettings } from './security-settings';

export default function SettingsTabs() {
  const router = useRouter();
  const [tab, setTab] = useState<'profile' | 'notifications' | 'security'>('profile');

  return (
    <main className="flex-1 py-8">
      <div className="max-w-[800px] mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="rounded-lg border border-border p-2 hover:bg-muted transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="font-display text-2xl font-bold">Hesap Ayarları</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 rounded-lg bg-muted/30 p-1 border border-border">
          <button
            onClick={() => setTab('profile')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors ${
              tab === 'profile' ? 'bg-[#d4af37] text-black' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="h-4 w-4" /> Profil Bilgileri
          </button>
          <button
            onClick={() => setTab('notifications')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors ${
              tab === 'notifications' ? 'bg-[#d4af37] text-black' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bell className="h-4 w-4" /> Bildirim Ayarları
          </button>
          <button
            onClick={() => setTab('security')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors ${
              tab === 'security' ? 'bg-[#d4af37] text-black' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShieldCheck className="h-4 w-4" /> Güvenlik
          </button>
        </div>

        {tab === 'profile' && <ProfileSettings />}
        {tab === 'notifications' && <NotificationSettings embedded />}
        {tab === 'security' && <SecuritySettings />}
      </div>
    </main>
  );
}
