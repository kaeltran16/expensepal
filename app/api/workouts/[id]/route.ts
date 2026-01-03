import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/api/middleware'

// GET /api/workouts/[id] - get single workout with exercises
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
      return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 })
    }

    if (!workout) {
      return NextResponse.json({ error: 'workout not found' }, { status: 404 })
    }

    return NextResponse.json({ workout })
  })(request)
}

// PUT /api/workouts/[id] - update workout
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return withAuth(async (req, user) => {
    const { id } = context.params
    const supabase = createClient()
    const body = await req.json()

    const { data: workout, error } = await supabase
      .from('workouts')
      .update({
        notes: body.notes,
        status: body.status,
        completed_at: body.completed_at,
        duration_minutes: body.duration_minutes,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ workout })
  })(request)
}

// DELETE /api/workouts/[id] - delete workout
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return withAuth(async (req, user) => {
    const { id } = context.params
    const supabase = createClient()

    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true })
  })(request)
}
