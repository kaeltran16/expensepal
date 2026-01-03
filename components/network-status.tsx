'use client'

import { AnimatePresence, motion } from 'framer-motion';
import { Clock, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

interface NetworkStatusProps {
  syncing?: boolean;
  lastSynced?: Date | null;
}

export function NetworkStatus({
  syncing = false,
  lastSynced = null,
}: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [showOffline, setShowOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOffline(true);
    };

    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const formatLastSynced = () => {
    if (!lastSynced) return 'Never synced';

    const now = new Date();
    const diff = now.getTime() - lastSynced.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    return lastSynced.toLocaleDateString();
  };

  return (
    <>
      {/* Offline banner */}
      <AnimatePresence>
        {showOffline && !isOnline && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 bg-destructive text-destructive-foreground py-2 px-4 z-50 shadow-lg"
          >
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <WifiOff className="h-4 w-4" />
              <span>You're offline - Some features may be limited</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Last synced indicator (subtle) */}
      {!syncing && lastSynced && isOnline && (
        <div className="fixed bottom-20 left-4 text-xs text-muted-foreground flex items-center gap-1 z-30 sm:bottom-4">
          <Clock className="h-3 w-3" />
          <span>Synced {formatLastSynced()}</span>
        </div>
      )}
    </>
  );
}
