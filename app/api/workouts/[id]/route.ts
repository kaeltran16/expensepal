import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'

// GET /api/workouts/[id] - get single workout with exercises
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized' },
        { status: 401 }
      )
    }

    const { data: workout, error } = await supabaseAdmin
      .from('workouts')
      .select(`
        *,
        workout_exercises (
          *,
          exercises (*)
        )
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('error fetching workout:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!workout) {
      return NextResponse.json({ error: 'workout not found' }, { status: 404 })
    }

    return NextResponse.json({ workout })
  } catch (error) {
    console.error('error in GET /api/workouts/[id]:', error)
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/workouts/[id] - update workout
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const { data: workout, error } = await supabaseAdmin
      .from('workouts')
      .update({
        notes: body.notes,
        status: body.status,
        completed_at: body.completed_at,
        duration_minutes: body.duration_minutes,
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('error updating workout:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ workout })
  } catch (error) {
    console.error('error in PUT /api/workouts/[id]:', error)
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/workouts/[id] - delete workout
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'unauthorized' },
        { status: 401 }
      )
    }

    const { error } = await supabaseAdmin
      .from('workouts')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('error deleting workout:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('error in DELETE /api/workouts/[id]:', error)
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    )
  }
}
