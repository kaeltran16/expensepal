import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/routine-stats - get user's XP and level stats
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_routine_stats')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found
    console.error('Error fetching routine stats:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return default stats if none exists
  const stats = data || {
    total_xp: 0,
    current_level: 1,
    lifetime_routines: 0,
    perfect_weeks: 0,
  }

  return NextResponse.json({ stats })
})

// POST /api/routine-stats - update stats (e.g., add XP, level up)
export const POST = withAuth(async (request, user) => {
  const supabase = createClient()
  const body = await request.json()

  // Get current stats first
  const { data: current } = await supabase
    .from('user_routine_stats')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const currentXP = current?.total_xp || 0
  const addXP = body.add_xp || 0
  const newTotalXP = currentXP + addXP

  // Upsert stats
  const { data, error } = await supabase
    .from('user_routine_stats')
    .upsert(
      {
        user_id: user.id,
        total_xp: body.total_xp ?? newTotalXP,
        current_level: body.current_level ?? current?.current_level ?? 1,
        lifetime_routines: body.lifetime_routines ?? current?.lifetime_routines ?? 0,
        perfect_weeks: body.perfect_weeks ?? current?.perfect_weeks ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('Error updating routine stats:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    stats: data,
    previousXP: currentXP,
  })
})
