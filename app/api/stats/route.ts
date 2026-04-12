import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/api/middleware'
import { createExpenseQuery } from '@/lib/api/query-builder'
import { createSuccessResponse } from '@/lib/api/types'
import type { ExpenseStats, GetExpenseStatsResponse } from '@/lib/api/types'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate') || undefined
  const endDate = searchParams.get('endDate') || undefined

  const baseQuery = createExpenseQuery(supabase, user.id).withFilters({
    startDate,
    endDate,
  })

  const { data: expenses, error } = await baseQuery.execute()

  if (error) {
    console.error('Failed to fetch expense stats:', error)
    throw new Error('Failed to fetch expense stats')
  }

  const expenseList = expenses || []

  const total = expenseList.reduce((sum: number, e) => sum + e.amount, 0)
  const count = expenseList.length
  const average = count > 0 ? total / count : 0

  const categoryTotals = expenseList.reduce((acc: Record<string, number>, expense: typeof expenseList[0]) => {
    const cat = expense.category || 'Uncategorized'
    acc[cat] = (acc[cat] || 0) + expense.amount
    return acc
  }, {})

  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([category, categoryTotal]) => ({
      category,
      total: categoryTotal,
      percentage: total > 0 ? (categoryTotal / total) * 100 : 0,
    }))

  const merchantTotals = expenseList.reduce((acc: Record<string, number>, expense) => {
    acc[expense.merchant] = (acc[expense.merchant] || 0) + expense.amount
    return acc
  }, {})

  const topMerchants = Object.entries(merchantTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([merchant, amount]) => ({ merchant, amount }))

  const stats: ExpenseStats = {
    totalSpent: total,
    averageTransaction: average,
    transactionCount: count,
    topCategories,
    monthlyTrend: [],
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
