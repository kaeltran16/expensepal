import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getMealTimeFromDate } from '@/lib/meal-utils'
import { calorieEstimator } from '@/lib/calorie-estimator'

// GET single expense
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ expense: data })
  } catch (error) {
    console.error('Error fetching expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT update expense
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Get the old expense to check if category changed
    const { data: oldExpense } = await supabase
      .from('expenses')
      .select('category')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    const { data, error } = await supabase
      .from('expenses')
      .update({
        transaction_type: body.transactionType || 'Expense',
        amount: body.amount,
        currency: body.currency || 'VND',
        transaction_date: body.transactionDate,
        merchant: body.merchant,
        category: body.category || 'Other',
        notes: body.notes,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const updatedExpense = data[0]

    // Handle meal sync when category changes
    const wasFood = oldExpense?.category === 'Food'
    const isNowFood = body.category === 'Food'

    if (wasFood && !isNowFood) {
      // Category changed FROM Food to something else - delete associated meal
      try {
        console.log(`🗑️ Category changed from Food, deleting associated meal for expense ${id}`)
        await supabaseAdmin
          .from('meals')
          .delete()
          .eq('expense_id', id)
          .eq('user_id', user.id)
      } catch (err) {
        console.error('Error deleting meal:', err)
      }
    } else if (!wasFood && isNowFood) {
      // Category changed TO Food - create new meal
      try {
        console.log(`🍔 Category changed to Food, creating meal entry for "${body.merchant}"`)

        const mealTime = getMealTimeFromDate(body.transactionDate)
        const estimation = await calorieEstimator.estimate(body.merchant, {
          mealTime,
          additionalInfo: body.notes,
        })

        await supabaseAdmin
          .from('meals')
          .insert({
            user_id: user.id,
            name: body.merchant,
            calories: estimation.calories,
            protein: estimation.protein,
            carbs: estimation.carbs,
            fat: estimation.fat,
            meal_time: mealTime,
            meal_date: body.transactionDate,
            source: estimation.source,
            confidence: estimation.confidence,
            expense_id: id,
            notes: body.notes,
            llm_reasoning: estimation.reasoning,
          })
      } catch (err) {
        console.error('Error creating meal:', err)
      }
    } else if (isNowFood) {
      // Still Food category - update existing meal if it exists
      try {
        console.log(`🔄 Updating associated meal for expense ${id}`)

        const mealTime = getMealTimeFromDate(body.transactionDate)
        const estimation = await calorieEstimator.estimate(body.merchant, {
          mealTime,
          additionalInfo: body.notes,
        })

        // Try to update existing meal
        const { data: existingMeal } = await supabaseAdmin
          .from('meals')
          .select('id')
          .eq('expense_id', id)
          .eq('user_id', user.id)
          .single()

        if (existingMeal) {
          await supabaseAdmin
            .from('meals')
            .update({
              name: body.merchant,
              calories: estimation.calories,
              protein: estimation.protein,
              carbs: estimation.carbs,
              fat: estimation.fat,
              meal_time: mealTime,
              meal_date: body.transactionDate,
              notes: body.notes,
              llm_reasoning: estimation.reasoning,
            })
            .eq('id', existingMeal.id)
        }
      } catch (err) {
        console.error('Error updating meal:', err)
      }
    }

    return NextResponse.json({ expense: updatedExpense })
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE expense
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete associated meals first (if any)
    try {
      console.log(`🗑️ Deleting associated meals for expense ${id}`)
      await supabaseAdmin
        .from('meals')
        .delete()
        .eq('expense_id', id)
        .eq('user_id', user.id)
    } catch (err) {
      console.error('Error deleting associated meals:', err)
      // Continue with expense deletion even if meal deletion fails
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Expense deleted' })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
