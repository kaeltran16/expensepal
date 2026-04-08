import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getPlanId(params: Promise<{ id: string }>) {
  const { id } = await params
  return id
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const supabase = createClient()
    const id = await getPlanId(context.params)
    const body = await req.json()

    const updates: Record<string, unknown> = {}
    if (body.status !== undefined) updates.status = body.status
    if (body.current_week !== undefined) updates.current_week = body.current_week
    if (body.current_session !== undefined) updates.current_session = body.current_session

    const { data, error } = await supabase
      .from('cardio_plans')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('error updating cardio plan:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ plan: data })
  })(request)
}
