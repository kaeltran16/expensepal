'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

/**
 * Push notification subscription data
 */
export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * Subscribe to push notifications mutation
 */
async function subscribePushNotifications(subscription: PushSubscription): Promise<void> {
  const response = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to subscribe to notifications')
  }
}

/**
 * Hook to subscribe to push notifications
 *
 * @example
 * const { mutate: subscribe, isPending } = useSubscribePushNotifications()
 *
 * subscribe({
 *   endpoint: 'https://...',
 *   keys: { p256dh: '...', auth: '...' }
 * })
 */
export function useSubscribePushNotifications() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: subscribePushNotifications,
    onSuccess: () => {
      toast.success('Subscribed to push notifications')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to subscribe to notifications')
    },
  })
}

/**
 * Unsubscribe from push notifications mutation
 */
async function unsubscribePushNotifications(endpoint: string): Promise<void> {
  const response = await fetch('/api/notifications/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to unsubscribe from notifications')
  }
}

/**
 * Hook to unsubscribe from push notifications
 *
 * @example
 * const { mutate: unsubscribe, isPending } = useUnsubscribePushNotifications()
 *
 * unsubscribe('https://...')
 */
export function useUnsubscribePushNotifications() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: unsubscribePushNotifications,
    onSuccess: () => {
      toast.success('Unsubscribed from push notifications')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to unsubscribe from notifications')
    },
  })
}
