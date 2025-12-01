import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'

// GET /api/workouts - list user's workout sessions
export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const startDate = searchParams.get('startDate')

    let query = supabaseAdmin
      .from('workouts')
      .select('*, workout_templates(*)')
      .eq('user_id', user.id)
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
  } catch (error) {
    console.error('error in GET /api/workouts:', error)
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/workouts - create workout session
export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // create workout record
    const { data: workout, error: workoutError } = await supabaseAdmin
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
      const exercisesToInsert = body.exerciseLogs.map((log: any, index: number) => ({
        workout_id: workout.id,
        exercise_id: log.exercise_id,
        exercise_order: index,
        sets: log.sets,
        notes: log.notes,
      }))

      const { error: exercisesError } = await supabaseAdmin
        .from('workout_exercises')
        .insert(exercisesToInsert)

      if (exercisesError) {
        console.error('error creating workout exercises:', exercisesError)
        // note: workout is already created, just log the error
      }
    }

    return NextResponse.json({ workout })
  } catch (error) {
    console.error('error in POST /api/workouts:', error)
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    )
  }
}
