import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMealTimeFromDate } from '@/lib/meal-utils'
import { calorieEstimator } from '@/lib/calorie-estimator'
import { withAuth, withAuthParamsAndValidation, withAuthParams } from '@/lib/api/middleware'
import { UpdateExpenseSchema } from '@/lib/api/schemas'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (_req, user) => {
    const { id } = await context.params
    const supabase = createClient()

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Failed to fetch expense:', error)
      return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 404 })
    }

    return NextResponse.json({ expense: data })
  })(request)
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParamsAndValidation(
    UpdateExpenseSchema,
    async (req, user, params: { id: string }, validatedData) => {
      const supabase = createClient()
      const id = params.id

      const { data: oldExpense } = await supabase
        .from('expenses')
        .select('category')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      const { data, error } = await supabase
        .from('expenses')
        .update({
          amount: validatedData.amount,
          currency: validatedData.currency || 'VND',
          transaction_date: validatedData.transaction_date,
          merchant: validatedData.merchant,
          category: validatedData.category || 'Other',
          notes: validatedData.notes,
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()

      if (error) {
        console.error('Failed to update expense:', error)
        throw new Error('Failed to update expense')
      }

      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
      }

      const updatedExpense = data[0]

      const wasFood = oldExpense?.category === 'Food'
      const isNowFood = validatedData.category === 'Food'

      if (wasFood && !isNowFood) {
        try {
          await supabase
            .from('meals')
            .delete()
            .eq('expense_id', id)
            .eq('user_id', user.id)
        } catch (err) {
          console.error('Error deleting meal:', err)
        }
      } else if (isNowFood && validatedData.merchant && validatedData.transaction_date) {
        const merchant = validatedData.merchant
        const transactionDate = validatedData.transaction_date
        try {
          const mealTime = getMealTimeFromDate(transactionDate)
          const estimation = await calorieEstimator.estimate(supabase, merchant, {
            mealTime,
            additionalInfo: validatedData.notes,
          })

          if (!wasFood) {
            await supabase
              .from('meals')
              .insert({
                user_id: user.id,
                name: merchant,
                calories: estimation.calories,
                protein: estimation.protein,
                carbs: estimation.carbs,
                fat: estimation.fat,
                meal_time: mealTime,
                meal_date: transactionDate,
                source: estimation.source,
                confidence: estimation.confidence,
                expense_id: id,
                notes: validatedData.notes,
                llm_reasoning: estimation.reasoning,
              })
          } else {
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
                  name: merchant,
                  calories: estimation.calories,
                  protein: estimation.protein,
                  carbs: estimation.carbs,
                  fat: estimation.fat,
                  meal_time: mealTime,
                  meal_date: transactionDate,
                  notes: validatedData.notes,
                  llm_reasoning: estimation.reasoning,
                })
                .eq('id', existingMeal.id)
            }
          }
        } catch (err) {
          console.error('Error syncing meal:', err)
        }
      }

      return NextResponse.json({ expense: updatedExpense })
    }
  )(request, context)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuthParams(async (_req, user, params: { id: string }) => {
    const supabase = createClient()
    const id = params.id

    try {
      await supabase
        .from('meals')
        .delete()
        .eq('expense_id', id)
        .eq('user_id', user.id)
    } catch (err) {
      console.error('Error deleting associated meals:', err)
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to delete expense:', error)
      throw new Error('Failed to delete expense')
    }

    return NextResponse.json({ message: 'Expense deleted' })
  })(request, context)
}
