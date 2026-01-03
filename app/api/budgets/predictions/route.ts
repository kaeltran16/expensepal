import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/api/middleware'
import { createBudgetQuery, createExpenseQuery } from '@/lib/api/query-builder'
import {
  calculateBudgetPredictions,
  generateBudgetAlerts,
  calculateSavingsOpportunities,
} from '@/lib/analytics/budget-predictions'

export const dynamic = 'force-dynamic'

// GET budget predictions and alerts for current month
export const GET = withAuth(async (request: NextRequest, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

  // Fetch budgets for the month using query builder
  const { data: budgets, error: budgetError } = await createBudgetQuery(supabase, user.id)
    .byMonth(month)
    .execute()

  if (budgetError) {
    throw new Error(budgetError.message)
  }

  // Fetch expenses for last 3 months using query builder
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const { data: expenses, error: expenseError } = await createExpenseQuery(supabase, user.id)
    .withFilters({
      startDate: threeMonthsAgo.toISOString(),
    })
    .orderByDate(false) // descending
    .execute()

  if (expenseError) {
    throw new Error(expenseError.message)
  }

  // Calculate predictions
  const predictions = calculateBudgetPredictions(expenses || [], budgets || [], month)

  // Generate alerts
  const alerts = generateBudgetAlerts(expenses || [], budgets || [], predictions)

  // Calculate savings opportunities
  const savingsOpportunities = calculateSavingsOpportunities(
    expenses || [],
    budgets || []
  )

  return NextResponse.json({
    predictions,
    alerts,
    savingsOpportunities,
    month,
  })
})
