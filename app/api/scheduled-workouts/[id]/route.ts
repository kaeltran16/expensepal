import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type ScheduledWorkoutUpdate = Partial<Database['public']['Tables']['scheduled_workouts']['Update']>

// Helper function to wrap route handlers with params
function withAuthParams<TParams>(
  handler: (request: NextRequest, user: User, params: TParams) => Promise<Response>
) {
  return (request: NextRequest, context: { params: TParams }) => {
    return withAuth((req, user) => handler(req, user, context.params))(request)
  }
}

// PUT /api/scheduled-workouts/[id]
export const PUT = withAuthParams<{ id: string }>(async (request, user, params) => {
  const supabase = createClient()
  const body = await request.json()
  const { template_id, scheduled_date, status, notes, completed_workout_id } = body

  // Verify ownership
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

  const updates: ScheduledWorkoutUpdate = {}
  if (template_id !== undefined) updates.template_id = template_id
  if (scheduled_date !== undefined) updates.scheduled_date = scheduled_date
  if (status !== undefined) updates.status = status
  if (notes !== undefined) updates.notes = notes
  if (completed_workout_id !== undefined) updates.completed_workout_id = completed_workout_id

  const { data: scheduledWorkout, error } = await supabase
    .from('scheduled_workouts')
    .update(updates)
    .eq('id', params.id)
    .select(`
      *,
      template:workout_templates(*)
    `)
    .single()

  if (error) {
    console.error('Error updating scheduled workout:', error)
    return NextResponse.json(
      { error: 'Failed to update scheduled workout' },
      { status: 500 }
    )
  }

  return NextResponse.json({ scheduledWorkout })
})

// DELETE /api/scheduled-workouts/[id]
export const DELETE = withAuthParams<{ id: string }>(async (request, user, params) => {
  const supabase = createClient()

  // Verify ownership
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
    console.error('Error deleting scheduled workout:', error)
    return NextResponse.json(
      { error: 'Failed to delete scheduled workout' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
})
