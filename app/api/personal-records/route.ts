import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'

// GET /api/personal-records - list user's personal records
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
    const exerciseId = searchParams.get('exerciseId')

    let query = supabaseAdmin
      .from('personal_records')
      .select('*, exercises(*)')
      .eq('user_id', user.id)
      .order('achieved_at', { ascending: false })

    if (exerciseId) {
      query = query.eq('exercise_id', exerciseId)
    }

    const { data, error } = await query

    if (error) {
      console.error('error fetching personal records:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ personalRecords: data || [] })
  } catch (error) {
    console.error('error in GET /api/personal-records:', error)
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/personal-records - create or update personal record
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

    // upsert (insert or update if exists)
    const { data, error } = await supabaseAdmin
      .from('personal_records')
      .upsert({
        user_id: user.id,
        exercise_id: body.exercise_id,
        record_type: body.record_type,
        value: body.value,
        unit: body.unit,
        achieved_at: body.achieved_at || new Date().toISOString(),
        workout_exercise_id: body.workout_exercise_id,
        notes: body.notes,
      }, {
        onConflict: 'user_id,exercise_id,record_type',
      })
      .select()
      .single()

    if (error) {
      console.error('error creating personal record:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ personalRecord: data })
  } catch (error) {
    console.error('error in POST /api/personal-records:', error)
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    )
  }
}
