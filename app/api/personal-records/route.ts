import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { withAuth } from '@/lib/api/middleware'

// GET /api/personal-records - list user's personal records
export const GET = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url)
  const exerciseId = searchParams.get('exerciseId')

  let query = supabaseAdmin
    .from('personal_records')
    .select('*, exercises(*)')
    .eq('user_id', user.id)
    .order('achieved_at', { ascending: false })

  if (exerciseId) {
    query = query.eq('exercise_id', exerciseId)
  }

  const { data, error } = await query

  if (error) {
    console.error('error fetching personal records:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ personalRecords: data || [] })
})

// POST /api/personal-records - create or update personal record
export const POST = withAuth(async (request, user) => {
  const body = await request.json()

  // upsert (insert or update if exists)
  const { data, error } = await supabaseAdmin
    .from('personal_records')
    .upsert({
      user_id: user.id,
      exercise_id: body.exercise_id,
      record_type: body.record_type,
      value: body.value,
      unit: body.unit,
      achieved_at: body.achieved_at || new Date().toISOString(),
      workout_exercise_id: body.workout_exercise_id,
      notes: body.notes,
    }, {
      onConflict: 'user_id,exercise_id,record_type',
    })
    .select()
    .single()

  if (error) {
    console.error('error creating personal record:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ personalRecord: data })
})
