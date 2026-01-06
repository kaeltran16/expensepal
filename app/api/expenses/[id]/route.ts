import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMealTimeFromDate } from '@/lib/meal-utils'
import { calorieEstimator } from '@/lib/calorie-estimator'
import { withAuth } from '@/lib/api/middleware'

export const dynamic = 'force-dynamic'

// Helper to extract route params
async function getExpenseId(params: Promise<{ id: string }>) {
  const { id } = await params
  return id
}

// GET single expense
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (_req, user) => {
    const id = await getExpenseId(context.params)
    const supabase = createClient()

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
  })(request)
}

// PUT update expense
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const id = await getExpenseId(context.params)
    const supabase = createClient()
    const body = await req.json()

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
        transaction_type: body.transaction_type || 'Expense',
        amount: body.amount,
        currency: body.currency || 'VND',
        transaction_date: body.transaction_date,
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
        await supabase
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

        const mealTime = getMealTimeFromDate(body.transaction_date)
        const estimation = await calorieEstimator.estimate(supabase, body.merchant, {
          mealTime,
          additionalInfo: body.notes,
        })

        await supabase
          .from('meals')
          .insert({
            user_id: user.id,
            name: body.merchant,
            calories: estimation.calories,
            protein: estimation.protein,
            carbs: estimation.carbs,
            fat: estimation.fat,
            meal_time: mealTime,
            meal_date: body.transaction_date,
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

        const mealTime = getMealTimeFromDate(body.transaction_date)
        const estimation = await calorieEstimator.estimate(supabase, body.merchant, {
          mealTime,
          additionalInfo: body.notes,
        })

        // Try to update existing meal
        const { data: existingMeal } = await supabase
          .from('meals')
          .select('id')
          .eq('expense_id', id)
          .eq('user_id', user.id)
          .single()

        if (existingMeal) {
          await supabase
            .from('meals')
            .update({
              name: body.merchant,
              calories: estimation.calories,
              protein: estimation.protein,
              carbs: estimation.carbs,
              fat: estimation.fat,
              meal_time: mealTime,
              meal_date: body.transaction_date,
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
  })(request)
}

// DELETE expense
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (_req, user) => {
    const id = await getExpenseId(context.params)
    const supabase = createClient()

    // Delete associated meals first (if any)
    try {
      console.log(`🗑️ Deleting associated meals for expense ${id}`)
      await supabase
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
      throw new Error(error.message)
    }

    return NextResponse.json({ message: 'Expense deleted' })
  })(request)
}
