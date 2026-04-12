import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { UpdateRoutineStatsSchema } from '@/lib/api/schemas'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_routine_stats')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching routine stats:', error)
    return NextResponse.json({ error: 'Failed to fetch routine stats' }, { status: 500 })
  }

  const stats = data || {
    total_xp: 0,
    current_level: 1,
    lifetime_routines: 0,
    perfect_weeks: 0,
  }

  return NextResponse.json({ stats })
})

export const POST = withAuthAndValidation(UpdateRoutineStatsSchema, async (request, user, validatedData) => {
  const supabase = createClient()

  const { data: current } = await supabase
    .from('user_routine_stats')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const currentXP = current?.total_xp || 0
  const addXP = validatedData.add_xp || 0
  const newTotalXP = currentXP + addXP

  const { data, error } = await supabase
    .from('user_routine_stats')
    .upsert(
      {
        user_id: user.id,
        total_xp: validatedData.total_xp ?? newTotalXP,
        current_level: validatedData.current_level ?? current?.current_level ?? 1,
        lifetime_routines: validatedData.lifetime_routines ?? current?.lifetime_routines ?? 0,
        perfect_weeks: validatedData.perfect_weeks ?? current?.perfect_weeks ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error updating routine stats:', error)
    return NextResponse.json({ error: 'Failed to update routine stats' }, { status: 500 })
  }

  return NextResponse.json({
    stats: data,
    previousXP: currentXP,
  })
})
