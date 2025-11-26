import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getMealTimeFromDate } from '@/lib/meal-utils'
import { calorieEstimator } from '@/lib/calorie-estimator'

// GET all expenses
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '100'
    const offset = searchParams.get('offset') || '0'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const merchant = searchParams.get('merchant')
    const category = searchParams.get('category')

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    if (startDate) {
      query = query.gte('transaction_date', startDate)
    }

    if (endDate) {
      query = query.lte('transaction_date', endDate)
    }

    if (merchant) {
      query = query.ilike('merchant', `%${merchant}%`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ expenses: data })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new expense
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const { data, error } = await supabase
      .from('expenses')
      .insert([
        {
          user_id: user.id,
          transaction_type: body.transactionType || 'Expense',
          amount: body.amount,
          currency: body.currency || 'VND',
          transaction_date: body.transactionDate,
          merchant: body.merchant,
          category: body.category || 'Other',
          notes: body.notes,
          source: body.source || 'manual',
          email_subject: body.emailSubject,
        },
      ])
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const createdExpense = data[0]

    // Auto-create meal entry if category is Food
    if (body.category === 'Food') {
      try {
        console.log(`🍔 Food expense detected, auto-creating meal entry for "${body.merchant}"...`)

        // Determine meal time based on transaction date
        const mealTime = getMealTimeFromDate(body.transactionDate)
        console.log(`⏰ Determined meal time: ${mealTime}`)

        // Use merchant name as meal name
        const mealName = body.merchant

        // Estimate calories using the calorie estimator
        console.log(`🤖 Estimating calories for "${mealName}"...`)
        const estimation = await calorieEstimator.estimate(mealName, {
          mealTime,
          additionalInfo: body.notes,
        })

        // Create meal entry
        const { data: mealData, error: mealError } = await supabaseAdmin
          .from('meals')
          .insert({
            user_id: user.id,
            name: mealName,
            calories: estimation.calories,
            protein: estimation.protein,
            carbs: estimation.carbs,
            fat: estimation.fat,
            meal_time: mealTime,
            meal_date: body.transactionDate,
            source: estimation.source,
            confidence: estimation.confidence,
            expense_id: createdExpense.id,
            notes: body.notes,
            llm_reasoning: estimation.reasoning,
          })
          .select()
          .single()

        if (mealError) {
          console.error('❌ Error creating meal entry:', mealError)
          // Don't fail the expense creation if meal creation fails
        } else {
          console.log(`✅ Meal entry created successfully:`, {
            name: mealData.name,
            calories: mealData.calories,
            mealTime: mealData.meal_time,
          })
        }
      } catch (mealCreationError) {
        console.error('❌ Error in meal auto-creation:', mealCreationError)
        // Don't fail the expense creation if meal creation fails
      }
    }

    return NextResponse.json({ expense: createdExpense }, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
