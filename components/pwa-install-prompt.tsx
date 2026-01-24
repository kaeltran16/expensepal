'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, Download, Share, Zap, Wifi, Bell, Smartphone } from 'lucide-react'
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

    // Don't show if standalone or recently dismissed (30 days cooldown)
    if (standalone || daysSinceDismissed < 30) {
      return
    }

    // For iOS, show after user has had time to explore the app
    if (ios) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 15000)  // 15 seconds instead of 3
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

  const benefits = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Instant loading',
    },
    {
      icon: Wifi,
      title: 'Works Offline',
      description: 'No internet needed',
    },
    {
      icon: Bell,
      title: 'Smart Alerts',
      description: 'Budget warnings',
    },
    {
      icon: Smartphone,
      title: 'Native Feel',
      description: 'App experience',
    },
  ]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-md"
      >
        <Card className="relative overflow-hidden shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950 dark:via-purple-950 dark:to-pink-950">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors z-10"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg"
              >
                <Download className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <h3 className="font-bold text-lg">Install ExpensePal</h3>
                <p className="text-sm text-muted-foreground">
                  Get the full app experience
                </p>
              </div>
            </div>

            {!isIOS && (
              <>
                {/* Benefits */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {benefits.map((benefit, index) => (
                    <motion.div
                      key={benefit.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex flex-col items-start gap-1.5 p-2.5 rounded-lg bg-white/50 dark:bg-black/20 backdrop-blur-sm"
                    >
                      <benefit.icon className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-xs font-semibold">{benefit.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {benefit.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {isIOS ? (
              <div className="space-y-2 mt-3 pt-3 border-t">
                <p className="text-xs font-medium flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-primary/10 text-primary">1</span>
                  Tap the <Share className="inline h-4 w-4 mx-1" /> share button
                </p>
                <p className="text-xs font-medium flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-primary/10 text-primary">2</span>
                  Select "Add to Home Screen"
                </p>
                <Button
                  size="sm"
                  onClick={handleDismiss}
                  className="w-full mt-3"
                >
                  Got it
                </Button>
              </div>
            ) : (
              <>
                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleInstall}
                    className="flex-1 gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
                    size="sm"
                  >
                    <Download className="h-4 w-4" />
                    Install App
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    variant="outline"
                    size="sm"
                  >
                    Later
                  </Button>
                </div>

                {/* Info text */}
                <p className="text-xs text-center text-muted-foreground mt-3">
                  Free, takes 2 seconds. Works on all devices.
                </p>
              </>
            )}
          </div>

          {/* Decorative gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}
