import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'
import { calorieEstimator } from '@/lib/calorie-estimator'

// GET /api/meals - List meals with filters
export async function GET(request: Request) {
  try {
    // Get authenticated user from session
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to view meals.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const mealTime = searchParams.get('mealTime')

    let query = supabaseAdmin
      .from('meals')
      .select('*, expenses(*)', { count: 'exact' })
      .eq('user_id', user.id)
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
  } catch (error) {
    console.error('Error in GET /api/meals:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/meals - Create new meal (with optional LLM estimation)
export async function POST(request: Request) {
  try {
    // Get authenticated user from session
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to create meals.' },
        { status: 401 }
      )
    }

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

    let mealData: any = {
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
      const estimation = await calorieEstimator.estimate(name, {
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

    const { data, error } = await supabaseAdmin
      .from('meals')
      .insert(mealData)
      .select()
      .single()

    if (error) {
      console.error('Error creating meal:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/meals:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
