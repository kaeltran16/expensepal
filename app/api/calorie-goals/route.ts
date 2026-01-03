import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateCalorieGoalSchema, UpdateCalorieGoalSchema } from '@/lib/api/schemas'

// GET /api/calorie-goals - Get active calorie goal
export const GET = withAuth(async (_request, user) => {
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
})

// POST /api/calorie-goals - Create new calorie goal
export const POST = withAuthAndValidation(
  CreateCalorieGoalSchema,
  async (_request, user, validatedData) => {
    const today = new Date().toISOString().split('T')[0]

    // End previous goals for this user
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
        ...validatedData,
        start_date: validatedData.start_date || today,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating calorie goal:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  }
)

// PUT /api/calorie-goals - Update current calorie goal
export const PUT = withAuthAndValidation(
  UpdateCalorieGoalSchema,
  async (_request, user, validatedData) => {
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
          ...validatedData,
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
          ...validatedData,
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
  }
)
