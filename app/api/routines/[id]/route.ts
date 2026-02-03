import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/routines/[id] - get a single completion
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const { id } = await context.params
    const supabase = createClient()

    const { data, error } = await supabase
      .from('routine_completions')
      .select('*, routine_templates(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching routine completion:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Completion not found' }, { status: 404 })
    }

    return NextResponse.json({ completion: data })
  })(request)
}

// DELETE /api/routines/[id] - delete a completion
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const { id } = await context.params
    const supabase = createClient()

    const { error } = await supabase
      .from('routine_completions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting routine completion:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  })(request)
}
