import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withAuthParamsAndValidation, withAuthParams } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { UpdateJournalEntrySchema } from '@/lib/api/schemas'

export const dynamic = 'force-dynamic'

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
      console.error('Failed to fetch journal entry:', error)
      return NextResponse.json({ error: 'Failed to fetch journal entry' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    return NextResponse.json({ entry: data })
  })(request)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParamsAndValidation(
    UpdateJournalEntrySchema,
    async (req, user, params: { id: string }, validatedData) => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('routine_journal_entries')
        .update(validatedData)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update journal entry:', error)
        throw new Error('Failed to update journal entry')
      }

      return NextResponse.json({ entry: data })
    }
  )(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParams(async (req, user, params: { id: string }) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('routine_journal_entries')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to delete journal entry:', error)
      throw new Error('Failed to delete journal entry')
    }

    return NextResponse.json({ success: true })
  })(request, context)
}
