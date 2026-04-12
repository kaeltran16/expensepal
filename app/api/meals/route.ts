import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calorieEstimator } from '@/lib/calorie-estimator'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateMealInputSchema } from '@/lib/api/schemas'
import type { Database } from '@/lib/supabase/database.types'

export const runtime = 'edge'

type MealInsert = Database['public']['Tables']['meals']['Insert']

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const mealTime = searchParams.get('mealTime')

  let query = supabase
    .from('meals')
    .select('*, expenses(*)', { count: 'exact' })
    .order('meal_date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (startDate) {
    query = query.gte('meal_date', startDate)
  }
  if (endDate) {
    query = query.lte('meal_date', endDate)
  }
  if (mealTime && mealTime !== 'all') {
    query = query.eq('meal_time', mealTime)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('Failed to fetch meals:', error)
    return NextResponse.json({ error: 'Failed to fetch meals' }, { status: 500 })
  }

  return NextResponse.json({
    meals: data || [],
    total: count || 0,
  })
})

export const POST = withAuthAndValidation(CreateMealInputSchema, async (request, user, validatedData) => {
  const supabase = createClient()

  const {
    name,
    calories,
    protein,
    carbs,
    fat,
    meal_time,
    meal_date,
    expense_id,
    notes,
    estimate,
    portionSize,
  } = validatedData

  let mealData: Partial<MealInsert> = {
    user_id: user.id,
    name,
    meal_time: meal_time || 'other',
    meal_date,
    expense_id,
    notes,
  }

  if (estimate && !calories) {
    const estimation = await calorieEstimator.estimate(supabase, name, {
      portionSize,
      mealTime: meal_time,
      additionalInfo: notes,
    })

    mealData = {
      ...mealData,
      calories: estimation.calories,
      protein: estimation.protein,
      carbs: estimation.carbs,
      fat: estimation.fat,
      source: estimation.source,
      confidence: estimation.confidence,
      llm_reasoning: estimation.reasoning,
    }
  } else {
    mealData = {
      ...mealData,
      calories: calories || 0,
      protein: protein || 0,
      carbs: carbs || 0,
      fat: fat || 0,
      source: 'manual',
    }
  }

  const { data, error } = await supabase
    .from('meals')
    .insert(mealData as MealInsert)
    .select()
    .single()

  if (error) {
    console.error('Failed to create meal:', error)
    return NextResponse.json({ error: 'Failed to create meal' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
})
