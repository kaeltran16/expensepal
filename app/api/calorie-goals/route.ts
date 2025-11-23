import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'

// GET /api/calorie-goals - Get active calorie goal
export async function GET(request: Request) {
  try {
    // Get authenticated user from session
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to view calorie goals.' },
        { status: 401 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabaseAdmin
      .from('calorie_goals')
      .select('*')
      .eq('user_id', user.id)
      .lte('start_date', today)
      .or(`end_date.gte.${today},end_date.is.null`)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching calorie goal:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If no goal found, return default
    if (!data) {
      return NextResponse.json({
        daily_calories: 2000,
        protein_target: 100,
        carbs_target: 250,
        fat_target: 65,
        goal_type: 'maintenance',
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/calorie-goals:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/calorie-goals - Create new calorie goal
export async function POST(request: Request) {
  try {
    // Get authenticated user from session
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to create calorie goals.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      daily_calories,
      protein_target,
      carbs_target,
      fat_target,
      goal_type,
      notes,
      start_date,
    } = body

    if (!daily_calories) {
      return NextResponse.json(
        { error: 'Missing required field: daily_calories' },
        { status: 400 }
      )
    }

    // End previous goals for this user
    const today = new Date().toISOString().split('T')[0]
    await supabaseAdmin
      .from('calorie_goals')
      .update({ end_date: today })
      .eq('user_id', user.id)
      .is('end_date', null)

    // Create new goal
    const { data, error } = await supabaseAdmin
      .from('calorie_goals')
      .insert({
        user_id: user.id,
        daily_calories,
        protein_target,
        carbs_target,
        fat_target,
        goal_type: goal_type || 'maintenance',
        notes,
        start_date: start_date || today,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating calorie goal:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/calorie-goals:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/calorie-goals - Update current calorie goal
export async function PUT(request: Request) {
  try {
    // Get authenticated user from session
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to update calorie goals.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      daily_calories,
      protein_target,
      carbs_target,
      fat_target,
    } = body

    if (!daily_calories) {
      return NextResponse.json(
        { error: 'Missing required field: daily_calories' },
        { status: 400 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    // Get the current active goal
    const { data: currentGoal } = await supabaseAdmin
      .from('calorie_goals')
      .select('*')
      .eq('user_id', user.id)
      .lte('start_date', today)
      .or(`end_date.gte.${today},end_date.is.null`)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    // If goal exists, update it
    if (currentGoal) {
      const { data, error } = await supabaseAdmin
        .from('calorie_goals')
        .update({
          daily_calories,
          protein_target,
          carbs_target,
          fat_target,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentGoal.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating calorie goal:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      // If no goal exists, create a new one
      const { data, error } = await supabaseAdmin
        .from('calorie_goals')
        .insert({
          user_id: user.id,
          daily_calories,
          protein_target,
          carbs_target,
          fat_target,
          goal_type: 'maintenance',
          start_date: today,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating calorie goal:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data, { status: 201 })
    }
  } catch (error) {
    console.error('Error in PUT /api/calorie-goals:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
