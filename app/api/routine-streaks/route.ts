import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/routine-streaks - get user's streak data
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_routine_streaks')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found
    console.error('Error fetching routine streak:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return default streak data if none exists
  const streak = data || {
    current_streak: 0,
    longest_streak: 0,
    last_routine_date: null,
    total_completions: 0,
  }

  return NextResponse.json({ streak })
})

// POST /api/routine-streaks - initialize or update streak
export const POST = withAuth(async (request, user) => {
  const supabase = createClient()
  const body = await request.json()

  // Upsert streak data
  const { data, error } = await supabase
    .from('user_routine_streaks')
    .upsert(
      {
        user_id: user.id,
        current_streak: body.current_streak ?? 0,
        longest_streak: body.longest_streak ?? 0,
        last_routine_date: body.last_routine_date,
        total_completions: body.total_completions ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error updating routine streak:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ streak: data })
})
