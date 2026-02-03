import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/routine-journal/[id] - get a single journal entry
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const { id } = await context.params
    const supabase = createClient()

    const { data, error } = await supabase
      .from('routine_journal_entries')
      .select('*, routine_completions(*)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching journal entry:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    return NextResponse.json({ entry: data })
  })(request)
}

// PUT /api/routine-journal/[id] - update a journal entry
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const { id } = await context.params
    const supabase = createClient()
    const body = await req.json()

    const { data, error } = await supabase
      .from('routine_journal_entries')
      .update({
        mood: body.mood,
        energy_level: body.energy_level,
        notes: body.notes,
        tags: body.tags,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating journal entry:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ entry: data })
  })(request)
}

// DELETE /api/routine-journal/[id] - delete a journal entry
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const { id } = await context.params
    const supabase = createClient()

    const { error } = await supabase
      .from('routine_journal_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting journal entry:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  })(request)
}
