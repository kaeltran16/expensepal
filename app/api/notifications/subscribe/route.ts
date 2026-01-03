import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/api/middleware'

export const POST = withAuth(async (request, user) => {
  const supabase = createClient()
  const subscription = await request.json()

  // Store subscription in database with user_id
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: request.headers.get('user-agent'),
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('Error storing subscription:', error)
    return NextResponse.json({ error: 'Failed to store subscription' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})
