import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to subscribe to notifications.' },
        { status: 401 }
      )
    }

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
  } catch (error) {
    console.error('Error processing subscription:', error)
    return NextResponse.json({ error: 'Failed to process subscription' }, { status: 500 })
  }
}
