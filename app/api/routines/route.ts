import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/routines - list completed routines (history)
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  let query = supabase
    .from('routine_completions')
    .select('*, routine_templates(*)')
    .eq('user_id', user.id)
    .order('routine_date', { ascending: false })
    .order('completed_at', { ascending: false })
    .limit(limit)

  if (startDate) {
    query = query.gte('routine_date', startDate)
  }
  if (endDate) {
    query = query.lte('routine_date', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching routine completions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    completions: data || [],
  })
})

// POST /api/routines - record a completed routine
export const POST = withAuth(async (request, user) => {
  const supabase = createClient()
  const body = await request.json()

  const { data, error } = await supabase
    .from('routine_completions')
    .insert({
      user_id: user.id,
      template_id: body.template_id,
      routine_date: body.routine_date || new Date().toISOString().split('T')[0],
      time_of_day: body.time_of_day,
      started_at: body.started_at,
      completed_at: body.completed_at,
      duration_minutes: body.duration_minutes,
      steps_completed: body.steps_completed,
      xp_earned: body.xp_earned || 0,
      bonus_xp: body.bonus_xp || 0,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating routine completion:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Streaks and stats are updated automatically via database triggers

  return NextResponse.json({ completion: data }, { status: 201 })
})
