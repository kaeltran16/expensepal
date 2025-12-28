import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import {
  calculateBudgetPredictions,
  generateBudgetAlerts,
  calculateSavingsOpportunities,
} from '@/lib/analytics/budget-predictions'

export const dynamic = 'force-dynamic'

// GET budget predictions and alerts for current month
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7)

    // Fetch budgets for the month
    const { data: budgets, error: budgetError } = await supabaseAdmin
      .from('budgets')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', month)

    if (budgetError) {
      return NextResponse.json({ error: budgetError.message }, { status: 500 })
    }

    // Fetch expenses for last 3 months (for better predictions)
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const { data: expenses, error: expenseError } = await supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .gte('transaction_date', threeMonthsAgo.toISOString())
      .order('transaction_date', { ascending: false })

    if (expenseError) {
      return NextResponse.json({ error: expenseError.message }, { status: 500 })
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
  } catch (error) {
    console.error('Error calculating budget predictions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
