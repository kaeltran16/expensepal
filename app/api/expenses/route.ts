import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMealTimeFromDate } from '@/lib/meal-utils'
import { calorieEstimator } from '@/lib/calorie-estimator'
import { withAuth, safeParseJSON } from '@/lib/api/middleware'
import { createExpenseQuery } from '@/lib/api/query-builder'
import { createListResponse } from '@/lib/api/types'
import { sendPushNotification } from '@/lib/push-notifications'
import type { GetExpensesResponse } from '@/lib/api/types'

export const dynamic = 'force-dynamic'

// GET all expenses
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)

  // Parse query parameters
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined
  const merchant = searchParams.get('merchant') || undefined
  const category = searchParams.get('category') || undefined

  // Build query using query builder
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
    throw new Error(error.message)
  }

  // Return typed response
  const response: GetExpensesResponse = createListResponse(data || [], data?.length)
  return NextResponse.json({ expenses: response.data })
})

// POST create new expense
export const POST = withAuth(async (request, user) => {
  const supabase = createClient()
  const body = await safeParseJSON(request)

  if (!body.amount || !body.merchant) {
    return NextResponse.json(
      { error: 'Missing required fields: amount and merchant' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert([
      {
        user_id: user.id,
        transaction_type: body.transaction_type || 'Expense',
        amount: body.amount,
        currency: body.currency || 'VND',
        transaction_date: body.transaction_date,
        merchant: body.merchant,
        category: body.category || 'Other',
        notes: body.notes,
        source: body.source || 'manual',
        email_subject: body.email_subject,
      },
    ])
    .select()

  if (error) {
    throw new Error(error.message)
  }

  const createdExpense = data[0]

  // Auto-create meal entry if category is Food
  if (body.category === 'Food') {
    try {
      console.log(`🍔 Food expense detected, auto-creating meal entry for "${body.merchant}"...`)

      // Determine meal time based on transaction date
      const mealTime = getMealTimeFromDate(body.transaction_date)
      console.log(`⏰ Determined meal time: ${mealTime}`)

      // Use merchant name as meal name
      const mealName = body.merchant

      // Estimate calories using the calorie estimator
      console.log(`🤖 Estimating calories for "${mealName}"...`)
      const estimation = await calorieEstimator.estimate(supabase, mealName, {
        mealTime,
        additionalInfo: body.notes,
      })

      // Create meal entry
      const { data: mealData, error: mealError } = await supabase
        .from('meals')
        .insert({
          user_id: user.id,
          name: mealName,
          calories: estimation.calories,
          protein: estimation.protein,
          carbs: estimation.carbs,
          fat: estimation.fat,
          meal_time: mealTime,
          meal_date: body.transaction_date,
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

  // Budget threshold check - send push notification if nearing/exceeding budget
  try {
    const expenseCategory = body.category || 'Other'
    const currentMonth = (body.transaction_date || new Date().toISOString()).slice(0, 7)

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
