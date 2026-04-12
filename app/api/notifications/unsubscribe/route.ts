import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthAndValidation } from '@/lib/api/middleware'
import { UnsubscribeSchema } from '@/lib/api/schemas'

export const runtime = 'edge'

export const POST = withAuthAndValidation(
  UnsubscribeSchema,
  async (request, user, validatedData) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', validatedData.endpoint)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error removing subscription:', error)
      return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  }
)
