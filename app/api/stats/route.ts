import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/api/middleware'
import { createExpenseQuery } from '@/lib/api/query-builder'
import { createSuccessResponse } from '@/lib/api/types'
import type { ExpenseStats, GetExpenseStatsResponse } from '@/lib/api/types'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined

  // Build base query with date filters
  const baseQuery = createExpenseQuery(supabase, user.id).withFilters({
    startDate,
    endDate,
  })

  // Get all expenses for aggregation
  const { data: expenses, error } = await baseQuery.execute()

  if (error) {
    throw new Error(error.message)
  }

  const expenseList = expenses || []

  // Calculate total and average
  const total = expenseList.reduce((sum: number, e) => sum + e.amount, 0)
  const count = expenseList.length
  const average = count > 0 ? total / count : 0

  // Aggregate by category
  const categoryTotals = expenseList.reduce((acc: Record<string, number>, expense: typeof expenseList[0]) => {
    const cat = expense.category || 'Uncategorized'
    acc[cat] = (acc[cat] || 0) + expense.amount
    return acc
  }, {})

  // Convert to array and calculate percentages
  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([category, categoryTotal]) => ({
      category,
      total: categoryTotal,
      percentage: total > 0 ? (categoryTotal / total) * 100 : 0,
    }))

  // Aggregate by merchant
  const merchantTotals = expenseList.reduce((acc: Record<string, number>, expense) => {
    acc[expense.merchant] = (acc[expense.merchant] || 0) + expense.amount
    return acc
  }, {})

  // Sort and get top 5 merchants
  const topMerchants = Object.entries(merchantTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([merchant, amount]) => ({ merchant, amount }))

  // Build typed response
  const stats: ExpenseStats = {
    totalSpent: total,
    averageTransaction: average,
    transactionCount: count,
    topCategories,
    monthlyTrend: [], // TODO: Implement monthly trend calculation
  }

  const response: GetExpenseStatsResponse = createSuccessResponse(stats)

  return NextResponse.json({
    total,
    count,
    byCategory: categoryTotals,
    topMerchants,
    ...response,
  })
})
