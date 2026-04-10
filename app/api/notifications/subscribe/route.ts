import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthAndValidation } from '@/lib/api/middleware'
import { PushSubscriptionSchema } from '@/lib/api/schemas'

export const POST = withAuthAndValidation(
  PushSubscriptionSchema,
  async (request, user, subscription) => {
    const supabase = createClient()

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: request.headers.get('user-agent'),
      created_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Failed to store subscription:', error)
      throw new Error('Failed to store subscription')
    }

    return NextResponse.json({ success: true })
  }
)
