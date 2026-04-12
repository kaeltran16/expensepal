import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateCalorieGoalSchema, UpdateCalorieGoalSchema } from '@/lib/api/schemas'

export const runtime = 'edge'

export const GET = withAuth(async (_request, user) => {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('calorie_goals')
    .select('*')
    .lte('start_date', today)
    .or(`end_date.gte.${today},end_date.is.null`)
    .order('start_date', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to fetch calorie goal:', error)
    return NextResponse.json({ error: 'Failed to fetch calorie goal' }, { status: 500 })
  }

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

export const POST = withAuthAndValidation(
  CreateCalorieGoalSchema,
  async (_request, user, validatedData) => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    await supabase
      .from('calorie_goals')
      .update({ end_date: today })
      .is('end_date', null)

    const { data, error } = await supabase
      .from('calorie_goals')
      .insert({
        user_id: user.id,
        ...validatedData,
        start_date: validatedData.start_date || today,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create calorie goal:', error)
      return NextResponse.json({ error: 'Failed to create calorie goal' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  }
)

export const PUT = withAuthAndValidation(
  UpdateCalorieGoalSchema,
  async (_request, user, validatedData) => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const { data: currentGoal } = await supabase
      .from('calorie_goals')
      .select('*')
      .lte('start_date', today)
      .or(`end_date.gte.${today},end_date.is.null`)
      .order('start_date', { ascending: false })
      .limit(1)
      .single()

    if (currentGoal) {
      const { data, error } = await supabase
        .from('calorie_goals')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentGoal.id)
        .select()
        .single()

      if (error) {
        console.error('Failed to update calorie goal:', error)
        return NextResponse.json({ error: 'Failed to update calorie goal' }, { status: 500 })
      }

      return NextResponse.json(data)
    }

    const { data, error } = await supabase
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
      console.error('Failed to create calorie goal:', error)
      return NextResponse.json({ error: 'Failed to create calorie goal' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  }
)
