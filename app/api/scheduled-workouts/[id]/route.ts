import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/scheduled-workouts/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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

    const updates: any = {}
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
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/scheduled-workouts/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
