import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateJournalEntrySchema } from '@/lib/api/schemas'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '30')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  let query = supabase
    .from('routine_journal_entries')
    .select('*, routine_completions(*)')
    .eq('user_id', user.id)
    .order('entry_date', { ascending: false })
    .limit(limit)

  if (startDate) {
    query = query.gte('entry_date', startDate)
  }
  if (endDate) {
    query = query.lte('entry_date', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching journal entries:', error)
    return NextResponse.json({ error: 'Failed to fetch journal entries' }, { status: 500 })
  }

  return NextResponse.json({
    entries: data || [],
  })
})

export const POST = withAuthAndValidation(CreateJournalEntrySchema, async (request, user, validatedData) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('routine_journal_entries')
    .insert({
      user_id: user.id,
      routine_completion_id: validatedData.routine_completion_id,
      entry_date: validatedData.entry_date || new Date().toISOString().split('T')[0],
      mood: validatedData.mood,
      energy_level: validatedData.energy_level,
      notes: validatedData.notes,
      tags: validatedData.tags,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating journal entry:', error)
    return NextResponse.json({ error: 'Failed to create journal entry' }, { status: 500 })
  }

  return NextResponse.json({ entry: data }, { status: 201 })
})
