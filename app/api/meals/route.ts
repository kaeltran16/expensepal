import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calorieEstimator } from '@/lib/calorie-estimator'
import { withAuth } from '@/lib/api/middleware'
import type { Database } from '@/lib/supabase/database.types'

type MealInsert = Database['public']['Tables']['meals']['Insert']

// GET /api/meals - List meals with filters
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const mealTime = searchParams.get('mealTime')

  // RLS automatically filters by user_id
  let query = supabase
    .from('meals')
    .select('*, expenses(*)', { count: 'exact' })
    .order('meal_date', { ascending: false })
    .range(offset, offset + limit - 1)

  // Apply filters
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
    console.error('Error fetching meals:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    meals: data || [],
    total: count || 0,
  })
})

// POST /api/meals - Create new meal (with optional LLM estimation)
export const POST = withAuth(async (request, user) => {
  const supabase = createClient()
  const body = await request.json()
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
      estimate, // If true, use LLM to estimate calories
      portionSize,
    } = body

    // Validation
    if (!name || !meal_date) {
      return NextResponse.json(
        { error: 'Missing required fields: name, meal_date' },
        { status: 400 }
      )
    }

    let mealData: Partial<MealInsert> = {
      user_id: user.id,
      name,
      meal_time: meal_time || 'other',
      meal_date,
      expense_id,
      notes,
    }

    // If estimate=true, use LLM to get calories
    if (estimate && !calories) {
      console.log(`Estimating calories for "${name}"...`)
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
      // Manual entry
      mealData = {
        ...mealData,
        calories: calories || 0,
        protein: protein || 0,
        carbs: carbs || 0,
        fat: fat || 0,
        source: 'manual',
      }
    }

    // RLS automatically sets user_id
    const { data, error } = await supabase
      .from('meals')
      .insert(mealData as MealInsert)
      .select()
      .single()

    if (error) {
      console.error('Error creating meal:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
})
