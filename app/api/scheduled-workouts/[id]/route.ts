import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { withAuthParamsAndValidation, withAuthParams } from '@/lib/api/middleware'
import { UpdateScheduledWorkoutSchema } from '@/lib/api/schemas'

export const runtime = 'edge'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParamsAndValidation(
    UpdateScheduledWorkoutSchema,
    async (req, user, params: { id: string }, validatedData) => {
      const supabase = createClient()

      const { data: existing, error: fetchError } = await supabase
        .from('scheduled_workouts')
        .select('user_id')
        .eq('id', params.id)
        .single()

      if (fetchError || !existing) {
        return NextResponse.json(
          { error: 'Scheduled workout not found' },
          { status: 404 }
        )
      }

      if (existing.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      const { data: scheduledWorkout, error } = await supabase
        .from('scheduled_workouts')
        .update(validatedData)
        .eq('id', params.id)
        .select(`
          *,
          template:workout_templates(*)
        `)
        .single()

      if (error) {
        console.error('Failed to update scheduled workout:', error)
        throw new Error('Failed to update scheduled workout')
      }

      return NextResponse.json({ scheduledWorkout })
    }
  )(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParams(async (req, user, params: { id: string }) => {
    const supabase = createClient()

    const { data: existing, error: fetchError } = await supabase
      .from('scheduled_workouts')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Scheduled workout not found' },
        { status: 404 }
      )
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('scheduled_workouts')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Failed to delete scheduled workout:', error)
      throw new Error('Failed to delete scheduled workout')
    }

    return NextResponse.json({ success: true })
  })(request, context)
}
