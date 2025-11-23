import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from session
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to unsubscribe from notifications.' },
        { status: 401 }
      )
    }

    const { endpoint } = await request.json()

    // Only allow users to unsubscribe their own subscriptions
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error removing subscription:', error)
      return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing unsubscribe:', error)
    return NextResponse.json({ error: 'Failed to process unsubscribe' }, { status: 500 })
  }
}
