import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import type { ExerciseLog } from '@/lib/types/common'
import { NextResponse } from 'next/server'

// GET /api/workouts - list user's workout sessions
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const startDate = searchParams.get('startDate')

  // RLS automatically filters by user_id
  let query = supabase
    .from('workouts')
    .select('*, workout_templates(*)')
    .order('workout_date', { ascending: false })
    .limit(limit)

  if (startDate) {
    query = query.gte('workout_date', startDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('error fetching workouts:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    workouts: data || [],
  })
})

// POST /api/workouts - create workout session
export const POST = withAuth(async (request, user) => {
  const supabase = createClient()
  const body = await request.json()

    // create workout record - RLS automatically sets user_id
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: user.id,
        template_id: body.template_id,
        workout_date: body.started_at || new Date().toISOString(),
        started_at: body.started_at,
        completed_at: body.completed_at,
        duration_minutes: body.duration_minutes,
        notes: body.notes,
      })
      .select()
      .single()

    if (workoutError) {
      console.error('error creating workout:', workoutError)
      return NextResponse.json({ error: workoutError.message }, { status: 500 })
    }

    // create workout exercises if provided
    if (body.exerciseLogs && body.exerciseLogs.length > 0) {
      const exercisesToInsert = body.exerciseLogs.map((log: ExerciseLog, index: number) => ({
        workout_id: workout.id,
        exercise_id: log.exercise_id,
        exercise_order: index,
        sets: log.sets,
        notes: log.notes,
      }))

      const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .insert(exercisesToInsert)

      if (exercisesError) {
        console.error('error creating workout exercises:', exercisesError)
        // note: workout is already created, just log the error
      }
    }

    return NextResponse.json({ workout })
})
