'use client'

import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User, Settings, Mail, CircleUserRound, RefreshCw, Bell, BellOff } from 'lucide-react'
import { toast } from 'sonner'
import { hapticFeedback } from '@/lib/utils'
import { useState, useEffect } from 'react'

interface UserMenuProps {
  onSyncEmails?: () => void
  isSyncing?: boolean
}

export function UserMenu({ onSyncEmails, isSyncing = false }: UserMenuProps = {}) {
  const { user, signOut } = useAuth()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)

  // Check notification status on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted')
    }
  }, [])

  const handleSignOut = async () => {
    hapticFeedback('medium')
    try {
      await signOut()
      toast.success('Signed out successfully')
    } catch (error) {
      console.error('Error signing out:', error)
      toast.error('Failed to sign out')
    }
  }

  const toggleNotifications = async () => {
    hapticFeedback('medium')

    if (!('Notification' in window)) {
      toast.error('Notifications are not supported on this device')
      return
    }

    if (notificationsEnabled) {
      // Disable notifications
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready
          const subscription = await registration.pushManager.getSubscription()

          if (subscription) {
            await subscription.unsubscribe()
            await fetch('/api/notifications/unsubscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: subscription.endpoint }),
            })
          }
        }

        setNotificationsEnabled(false)
        toast.info('Notifications disabled')
      } catch (error) {
        console.error('Error disabling notifications:', error)
        toast.error('Failed to disable notifications')
      }
    } else {
      // Request notification permission
      try {
        const permission = await Notification.requestPermission()

        if (permission === 'granted') {
          setNotificationsEnabled(true)
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
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error)
        toast.error('Failed to enable notifications')
      }
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

  if (!user) return null

  // Get display name
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-muted transition-colors">
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt={displayName}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/10"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
              {initials}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex items-center gap-3">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={displayName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-semibold">
                {initials}
              </div>
            )}
            <div className="flex flex-col space-y-1 flex-1 min-w-0">
              <p className="text-sm font-medium leading-none truncate">
                {displayName}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            hapticFeedback('light')
            toast.info('Profile settings coming soon!')
          }}
          className="cursor-pointer"
        >
          <CircleUserRound className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            hapticFeedback('light')
            toast.info('Settings coming soon!')
          }}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={toggleNotifications}
          className="cursor-pointer"
        >
          {notificationsEnabled ? (
            <Bell className="mr-2 h-4 w-4 text-primary" />
          ) : (
            <BellOff className="mr-2 h-4 w-4" />
          )}
          <span>Notifications</span>
          <Badge
            variant={notificationsEnabled ? 'default' : 'secondary'}
            className="ml-auto text-xs"
          >
            {notificationsEnabled ? 'On' : 'Off'}
          </Badge>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            hapticFeedback('light')
            if (onSyncEmails) {
              onSyncEmails()
            } else {
              toast.info('Email sync not configured')
            }
          }}
          disabled={isSyncing}
          className="cursor-pointer"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Emails'}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-red-600 dark:text-red-400 cursor-pointer focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
