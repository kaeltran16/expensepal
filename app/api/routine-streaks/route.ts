import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { UpdateRoutineStreakSchema } from '@/lib/api/schemas'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_routine_streaks')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching routine streak:', error)
    return NextResponse.json({ error: 'Failed to fetch routine streak' }, { status: 500 })
  }

  const streak = data || {
    current_streak: 0,
    longest_streak: 0,
    last_routine_date: null,
    total_completions: 0,
  }

  return NextResponse.json({ streak })
})

export const POST = withAuthAndValidation(UpdateRoutineStreakSchema, async (request, user, validatedData) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_routine_streaks')
    .upsert(
      {
        user_id: user.id,
        current_streak: validatedData.current_streak ?? 0,
        longest_streak: validatedData.longest_streak ?? 0,
        last_routine_date: validatedData.last_routine_date,
        total_completions: validatedData.total_completions ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error updating routine streak:', error)
    return NextResponse.json({ error: 'Failed to update routine streak' }, { status: 500 })
  }

  return NextResponse.json({ streak: data })
})
