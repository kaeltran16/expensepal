// @ts-expect-error -- web-push has no type declarations
import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/supabase/admin'

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  url?: string
  id?: string
}

// Configure VAPID keys at module level
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT

if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

export async function sendPushNotification(
  userId: string,
  payload: NotificationPayload
): Promise<{ sent: number; failed: number; cleaned: number }> {
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    console.warn('VAPID keys not configured, skipping push notification')
    return { sent: 0, failed: 0, cleaned: 0 }
  }

  // Check if user has notifications enabled
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('notification_enabled')
    .eq('user_id', userId)
    .single()

  if (!profile?.notification_enabled) {
    return { sent: 0, failed: 0, cleaned: 0 }
  }

  // Fetch all push subscriptions for the user
  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0, cleaned: 0 }
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icon-192x192.png',
    badge: payload.badge || '/icon-96x96.png',
    tag: payload.tag,
    url: payload.url || '/',
    id: payload.id,
  })

  let sent = 0
  let failed = 0
  let cleaned = 0

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        notificationPayload
      )
      sent++
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        // Subscription expired or invalid - clean up
        await supabaseAdmin
          .from('push_subscriptions')
          .delete()
          .eq('id', sub.id)
        cleaned++
      } else {
        console.error(`Push notification failed for subscription ${sub.id}:`, error.message)
        failed++
      }
    }
  }

  return { sent, failed, cleaned }
}
