'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, Download, Share } from 'lucide-react'
import { hapticFeedback } from '@/lib/utils'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Check if running as standalone app
    const standalone = window.matchMedia('(display-mode: standalone)').matches
    setIsStandalone(standalone)

    // Check if iOS
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
    setIsIOS(ios)

    // Check if already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    const dismissedTime = dismissed ? parseInt(dismissed) : 0
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)

    // Don't show if standalone or recently dismissed
    if (standalone || daysSinceDismissed < 7) {
      return
    }

    // For iOS, show after a delay
    if (ios) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
      return () => clearTimeout(timer)
    }

    // For other platforms, listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const event = e as BeforeInstallPromptEvent
      setDeferredPrompt(event)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    hapticFeedback('medium')

    if (deferredPrompt) {
      // Chrome/Android
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        setShowPrompt(false)
      }

      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    hapticFeedback('light')
    localStorage.setItem('pwa-install-dismissed', Date.now().toString())
    setShowPrompt(false)
  }

  if (!showPrompt || isStandalone) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm"
      >
        <Card className="p-4 shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Install Expense Tracker</h3>
              <p className="text-xs text-muted-foreground">
                {isIOS
                  ? 'Add to your home screen for a better experience'
                  : 'Install the app for quick access and offline support'}
              </p>
            </div>
          </div>

          {isIOS ? (
            <div className="space-y-2 mt-3 pt-3 border-t">
              <p className="text-xs font-medium flex items-center gap-2">
                <span className="inline-block w-5 h-5 text-center">1</span>
                Tap the <Share className="inline h-4 w-4 mx-1" /> share button
              </p>
              <p className="text-xs font-medium flex items-center gap-2">
                <span className="inline-block w-5 h-5 text-center">2</span>
                Select "Add to Home Screen"
              </p>
              <Button
                size="sm"
                onClick={handleDismiss}
                className="w-full mt-2"
                variant="outline"
              >
                Got it
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleInstall}
                className="flex-1 gap-2"
              >
                <Download className="h-4 w-4" />
                Install
              </Button>
              <Button
                size="sm"
                onClick={handleDismiss}
                variant="outline"
              >
                Later
              </Button>
            </div>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}
