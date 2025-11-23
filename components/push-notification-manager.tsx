'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Bell, BellOff, X } from 'lucide-react'
import { toast } from 'sonner'
import { hapticFeedback } from '@/lib/utils'

export function PushNotificationManager() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)

      // Check if we should show prompt
      const dismissed = localStorage.getItem('notification-prompt-dismissed')
      const visitCount = parseInt(localStorage.getItem('visit-count') || '0')
      localStorage.setItem('visit-count', (visitCount + 1).toString())

      // Show after 3 visits if not dismissed and permission not decided
      if (!dismissed && visitCount >= 2 && Notification.permission === 'default') {
        setTimeout(() => setShowPrompt(true), 5000)
      }
    }
  }, [])

  const requestNotificationPermission = async () => {
    hapticFeedback('medium')

    if (!('Notification' in window)) {
      toast.error('Notifications are not supported on this device')
      return
    }

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)

      if (permission === 'granted') {
        setShowPrompt(false)
        toast.success('Notifications enabled!')

        // Subscribe to push notifications
        await subscribeToPushNotifications()

        // Send a test notification
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready
          registration.showNotification('Expense Tracker', {
            body: 'You will now receive spending alerts and reminders',
            icon: '/icon-192x192.png',
            badge: '/icon-96x96.png',
            tag: 'welcome',
          })
        }
      } else {
        toast.error('Notification permission denied')
        setShowPrompt(false)
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      toast.error('Failed to enable notifications')
    }
  }

  const subscribeToPushNotifications = async () => {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription()

        if (!subscription) {
          // Create new subscription
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
              process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
            ),
          })

          // Send subscription to backend
          await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription),
          })
        }
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
    }
  }

  const handleDismiss = () => {
    hapticFeedback('light')
    localStorage.setItem('notification-prompt-dismissed', 'true')
    setShowPrompt(false)
  }

  // Only show the prompt for first-time users
  if (!showPrompt || notificationPermission !== 'default') {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:bottom-20 sm:max-w-sm"
      >
        <Card className="p-4 shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Stay on top of spending</h3>
              <p className="text-xs text-muted-foreground">
                Get notified about budget alerts, spending patterns, and savings goals
              </p>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={requestNotificationPermission}
              className="flex-1 gap-2"
            >
              <Bell className="h-4 w-4" />
              Enable Notifications
            </Button>
            <Button
              size="sm"
              onClick={handleDismiss}
              variant="outline"
            >
              Later
            </Button>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray as Uint8Array<ArrayBuffer>
}
