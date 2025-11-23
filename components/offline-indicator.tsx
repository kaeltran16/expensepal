'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi, RefreshCw, AlertCircle } from 'lucide-react'
import { useOfflineQueue } from '@/lib/hooks/use-offline-queue'
import { Button } from './ui/button'

export function OfflineIndicator() {
  const { isOnline, queueLength, isProcessing, retryQueue } = useOfflineQueue()

  // Don't show anything if online and queue is empty
  if (isOnline && queueLength === 0) {
    return null
  }

  return (
    <AnimatePresence>
      {(!isOnline || queueLength > 0) && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-50 px-4 pt-safe"
        >
          <div className="max-w-2xl mx-auto">
            {!isOnline ? (
              // Offline banner
              <div className="ios-card bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 flex items-center gap-3">
                <WifiOff className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-red-900 dark:text-red-100">
                    You're offline
                  </h4>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Changes will sync when you're back online
                    {queueLength > 0 &&
                      ` (${queueLength} ${queueLength === 1 ? 'change' : 'changes'} pending)`}
                  </p>
                </div>
              </div>
            ) : (
              // Syncing banner (when online but queue has items)
              <div className="ios-card bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 flex items-center gap-3">
                {isProcessing ? (
                  <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                    {isProcessing ? 'Syncing...' : 'Pending changes'}
                  </h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {isProcessing
                      ? `Syncing ${queueLength} ${queueLength === 1 ? 'change' : 'changes'}...`
                      : `${queueLength} ${queueLength === 1 ? 'change' : 'changes'} waiting to sync`}
                  </p>
                </div>
                {!isProcessing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={retryQueue}
                    className="flex-shrink-0"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Now
                  </Button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Compact status indicator for navbar
 */
export function OfflineStatus() {
  const { isOnline, queueLength } = useOfflineQueue()

  if (isOnline && queueLength === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
        <Wifi className="h-4 w-4" />
        <span className="text-xs sr-only">Online</span>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="flex items-center gap-2"
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-xs text-red-600 dark:text-red-400">Offline</span>
        </>
      ) : (
        <>
          <div className="relative">
            <Wifi className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
          </div>
          <span className="text-xs text-blue-600 dark:text-blue-400">
            {queueLength} pending
          </span>
        </>
      )}
    </motion.div>
  )
}
