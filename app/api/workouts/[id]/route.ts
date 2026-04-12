import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withAuthParamsAndValidation, withAuthParams } from '@/lib/api/middleware'
import { UpdateWorkoutSchema } from '@/lib/api/schemas'

export const runtime = 'edge'

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return withAuth(async (req, user) => {
    const { id } = context.params
    const supabase = createClient()

    const { data: workout, error } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_exercises (
          *,
          exercises (*)
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Failed to fetch workout:', error)
      return NextResponse.json({ error: 'Failed to fetch workout' }, { status: error.code === 'PGRST116' ? 404 : 500 })
    }

    if (!workout) {
      return NextResponse.json({ error: 'workout not found' }, { status: 404 })
    }

    return NextResponse.json({ workout })
  })(request)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParamsAndValidation(
    UpdateWorkoutSchema,
    async (req, user, params: { id: string }, validatedData) => {
      const supabase = createClient()

      const { data: workout, error } = await supabase
        .from('workouts')
        .update({
          notes: validatedData.notes,
          status: validatedData.status,
          completed_at: validatedData.completed_at,
        })
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update workout:', error)
        throw new Error('Failed to update workout')
      }

      return NextResponse.json({ workout })
    }
  )(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParams(async (req, user, params: { id: string }) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to delete workout:', error)
      throw new Error('Failed to delete workout')
    }

    return NextResponse.json({ success: true })
  })(request, context)
}
