import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/scheduled-workouts?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('scheduled_workouts')
      .select(`
        *,
        template:workout_templates(*)
      `)
      .eq('user_id', user.id)
      .order('scheduled_date', { ascending: true })

    if (startDate) {
      query = query.gte('scheduled_date', startDate)
    }

    if (endDate) {
      query = query.lte('scheduled_date', endDate)
    }

    const { data: scheduledWorkouts, error } = await query

    if (error) {
      console.error('Error fetching scheduled workouts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch scheduled workouts' },
        { status: 500 }
      )
    }

    return NextResponse.json({ scheduledWorkouts })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/scheduled-workouts
export async function POST(request: NextRequest) {
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
    const { template_id, scheduled_date, notes } = body

    if (!scheduled_date) {
      return NextResponse.json(
        { error: 'scheduled_date is required' },
        { status: 400 }
      )
    }

    // Check if a workout is already scheduled for this date
    const { data: existing } = await supabase
      .from('scheduled_workouts')
      .select('id')
      .eq('user_id', user.id)
      .eq('scheduled_date', scheduled_date)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'A workout is already scheduled for this date' },
        { status: 409 }
      )
    }

    const { data: scheduledWorkout, error } = await supabase
      .from('scheduled_workouts')
      .insert({
        user_id: user.id,
        template_id,
        scheduled_date,
        notes,
        status: 'scheduled'
      })
      .select(`
        *,
        template:workout_templates(*)
      `)
      .single()

    if (error) {
      console.error('Error creating scheduled workout:', error)
      return NextResponse.json(
        { error: 'Failed to create scheduled workout' },
        { status: 500 }
      )
    }

    return NextResponse.json({ scheduledWorkout }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
