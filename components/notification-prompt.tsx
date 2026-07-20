'use client';

import { Bell, X } from 'lucide-react';
import { useBrowserNotifications } from '@/hooks/use-browser-notifications';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

export function NotificationPrompt() {
  const { data: session } = useSession() || {};
  const { showBanner, requestPermission, dismissBanner, isSupported } =
    useBrowserNotifications();

  // Only show for logged-in users, on supported browsers
  if (!session?.user || !isSupported || !showBanner) return null;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-24 z-50 max-w-sm"
        >
          <div className="bg-card border border-border rounded-xl shadow-2xl p-4 relative">
            <button
              onClick={dismissBanner}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 bg-amber-500/10 p-2.5 rounded-lg">
                <Bell className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground">
                  Bildirimleri Açın
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Teklifiniz geçildiğinde, müzayede kazandığınızda veya ödeme
                  zamanı geldiğinde anında haberdar olun.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={requestPermission}
                    className="px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                  >
                    İzin Ver
                  </button>
                  <button
                    onClick={dismissBanner}
                    className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Şimdi Değil
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
