import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMealTimeFromDate } from '@/lib/meal-utils'
import { calorieEstimator } from '@/lib/calorie-estimator'
import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { CreateExpenseSchema } from '@/lib/api/schemas'
import { createExpenseQuery } from '@/lib/api/query-builder'
import { createListResponse } from '@/lib/api/types'
import { sendPushNotification } from '@/lib/push-notifications'
import type { GetExpensesResponse } from '@/lib/api/types'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)

  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined
  const merchant = searchParams.get('merchant') || undefined
  const category = searchParams.get('category') || undefined

  const { data, error } = await createExpenseQuery(supabase, user.id)
    .withFilters({
      startDate,
      endDate,
      merchant,
      category,
    })
    .limit(limit)
    .offset(offset)
    .execute()

  if (error) {
    console.error('Failed to fetch expenses:', error)
    throw new Error('Failed to fetch expenses')
  }

  const response: GetExpensesResponse = createListResponse(data || [], data?.length)
  return NextResponse.json({ expenses: response.data })
})

export const POST = withAuthAndValidation(CreateExpenseSchema, async (request, user, validatedData) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('expenses')
    .insert([
      {
        user_id: user.id,
        transaction_type: 'Expense',
        amount: validatedData.amount,
        currency: validatedData.currency,
        transaction_date: validatedData.transaction_date,
        merchant: validatedData.merchant,
        category: validatedData.category,
        notes: validatedData.notes,
        source: validatedData.source,
      },
    ])
    .select()

  if (error) {
    console.error('Failed to create expense:', error)
    throw new Error('Failed to create expense')
  }

  const createdExpense = data[0]

  if (validatedData.category === 'Food') {
    try {
      const mealTime = getMealTimeFromDate(validatedData.transaction_date)
      const mealName = validatedData.merchant

      const estimation = await calorieEstimator.estimate(supabase, mealName, {
        mealTime,
        additionalInfo: validatedData.notes,
      })

      const { error: mealError } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          name: mealName,
          calories: estimation.calories,
          protein: estimation.protein,
          carbs: estimation.carbs,
          fat: estimation.fat,
          meal_time: mealTime,
          meal_date: validatedData.transaction_date,
          source: estimation.source,
          confidence: estimation.confidence,
          expense_id: createdExpense.id,
          notes: validatedData.notes,
          llm_reasoning: estimation.reasoning,
        })
        .select()
        .single()

      if (mealError) {
        console.error('Error creating meal entry:', mealError)
      }
    } catch (mealCreationError) {
      console.error('Error in meal auto-creation:', mealCreationError)
    }
  }

  try {
    const expenseCategory = validatedData.category
    const currentMonth = validatedData.transaction_date.slice(0, 7)

    const { data: budget } = await supabase
      .from('budgets')
      .select('amount')
      .eq('user_id', user.id)
      .eq('category', expenseCategory)
      .eq('month', currentMonth)
      .single()

    if (budget) {
      const { data: monthExpenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id)
        .eq('category', expenseCategory)
        .gte('transaction_date', `${currentMonth}-01`)
        .lt('transaction_date', `${currentMonth}-32`)

      const totalSpent = (monthExpenses || []).reduce((sum, e) => sum + e.amount, 0)
      const percentUsed = (totalSpent / budget.amount) * 100

      if (percentUsed >= 100) {
        const overagePercent = Math.round(percentUsed - 100)
        sendPushNotification(user.id, {
          title: 'Budget Exceeded!',
          body: `You've exceeded your ${expenseCategory} budget by ${overagePercent}%`,
          tag: `budget-alert-${expenseCategory}`,
          url: '/',
        }).catch(() => {})
      } else if (percentUsed >= 80) {
        sendPushNotification(user.id, {
          title: 'Budget Warning',
          body: `You've used ${Math.round(percentUsed)}% of your ${expenseCategory} budget`,
          tag: `budget-warning-${expenseCategory}`,
          url: '/',
        }).catch(() => {})
      }
    }
  } catch (budgetCheckError) {
    console.error('Error in budget threshold check:', budgetCheckError)
  }

  return NextResponse.json({ expense: createdExpense }, { status: 201 })
})
