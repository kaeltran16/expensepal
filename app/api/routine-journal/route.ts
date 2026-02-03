import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/routine-journal - list journal entries
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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    entries: data || [],
  })
})

// POST /api/routine-journal - create a journal entry
export const POST = withAuth(async (request, user) => {
  const supabase = createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('routine_journal_entries')
    .insert({
      user_id: user.id,
      routine_completion_id: body.routine_completion_id,
      entry_date: body.entry_date || new Date().toISOString().split('T')[0],
      mood: body.mood,
      energy_level: body.energy_level,
      notes: body.notes,
      tags: body.tags,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating journal entry:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entry: data }, { status: 201 })
})
