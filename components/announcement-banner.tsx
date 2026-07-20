'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Megaphone } from 'lucide-react';

export function AnnouncementBanner() {
  const [settings, setSettings] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/site-settings')
      .then(r => r.json())
      .then(d => setSettings(d?.settings))
      .catch(() => {});
  }, []);

  if (!settings?.announcementActive || !settings?.announcementText || dismissed) return null;

  const content = (
    <div className="bg-[#d4af37] text-black">
      <div className="mx-auto max-w-[1200px] px-4 py-2 flex items-center justify-center gap-2 relative">
        <Megaphone className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm font-medium text-center">{settings.announcementText}</span>
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDismissed(true); }} className="absolute right-4 p-1 rounded hover:bg-black/10 transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  if (settings.announcementLink) {
    return <Link href={settings.announcementLink}>{content}</Link>;
  }

  return content;
}
