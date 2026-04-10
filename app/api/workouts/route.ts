import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateWorkoutSchema } from '@/lib/api/schemas'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const startDate = searchParams.get('startDate')

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
    console.error('Failed to fetch workouts:', error)
    return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 })
  }

  return NextResponse.json({
    workouts: data || [],
  })
})

export const POST = withAuthAndValidation(CreateWorkoutSchema, async (request, user, validatedData) => {
  const supabase = createClient()

  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .insert({
      user_id: user.id,
      template_id: validatedData.template_id,
      workout_date: validatedData.date,
      duration_minutes: validatedData.duration_minutes,
      notes: validatedData.notes,
    })
    .select()
    .single()

  if (workoutError) {
    console.error('Failed to create workout:', workoutError)
    return NextResponse.json({ error: 'Failed to create workout' }, { status: 500 })
  }

  if (validatedData.exercises_completed && validatedData.exercises_completed.length > 0) {
    const exercisesToInsert = validatedData.exercises_completed.map((log, index) => ({
      workout_id: workout.id,
      exercise_id: log.exercise_id,
      exercise_order: index,
      sets: log.sets,
      notes: log.notes,
    }))
    const { error: exercisesError } = await supabase.from('workout_exercises').insert(exercisesToInsert)
    if (exercisesError) {
      console.error('Failed to insert exercises, cleaning up workout:', exercisesError)
      await supabase.from('workouts').delete().eq('id', workout.id)
      throw new Error('Failed to save workout exercises')
    }
  }

  return NextResponse.json({ workout })
})
