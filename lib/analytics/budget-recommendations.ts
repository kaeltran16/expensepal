/**
 * Smart Budget Recommendations
 * Analyzes spending patterns and suggests optimal budgets
 */

import type { Expense } from '../supabase'
import type { Tables } from '../supabase/database.types'

type Budget = Tables<'budgets'>

export interface BudgetRecommendation {
  category: string
  suggestedAmount: number
  currentAmount?: number
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
  trend: 'increasing' | 'stable' | 'decreasing'
  percentChange?: number
}

export interface SpendingPattern {
  category: string
  monthlyAverage: number
  last3MonthsAverage: number
  currentMonthSpending: number
  isOverBudget: boolean
  percentOfIncome?: number
}

/**
 * Calculate spending by category for a given month
 */
function getMonthlySpending(
  expenses: Expense[],
  month: string
): Map<string, number> {
  const spending = new Map<string, number>()

  expenses.forEach((expense) => {
    const expenseMonth = expense.transaction_date.substring(0, 7) // YYYY-MM
    if (expenseMonth === month) {
      const category = expense.category || 'Other'
      spending.set(category, (spending.get(category) || 0) + expense.amount)
    }
  })

  return spending
}

/**
 * Calculate average monthly spending per category over last N months
 */
function getAverageMonthlySpending(
  expenses: Expense[],
  months: number = 3
): Map<string, number> {
  const categoryMonthlyTotals = new Map<string, number[]>()

  // Group expenses by category and month
  expenses.forEach((expense) => {
    const category = expense.category || 'Other'
    if (!categoryMonthlyTotals.has(category)) {
      categoryMonthlyTotals.set(category, [])
    }
    categoryMonthlyTotals.get(category)!.push(expense.amount)
  })

  // Calculate averages
  const averages = new Map<string, number>()
  categoryMonthlyTotals.forEach((amounts, category) => {
    const sum = amounts.reduce((acc, amt) => acc + amt, 0)
    averages.set(category, sum / months)
  })

  return averages
}

/**
 * Detect spending trend (increasing, stable, decreasing)
 */
function detectTrend(
  currentSpending: number,
  previousAverage: number
): { trend: 'increasing' | 'stable' | 'decreasing'; percentChange: number } {
  if (previousAverage === 0) {
    return { trend: 'stable', percentChange: 0 }
  }

  const percentChange = ((currentSpending - previousAverage) / previousAverage) * 100

  if (percentChange > 10) {
    return { trend: 'increasing', percentChange }
  } else if (percentChange < -10) {
    return { trend: 'decreasing', percentChange }
  }

  return { trend: 'stable', percentChange }
}

/**
 * Generate budget recommendations based on spending history
 */
export function generateBudgetRecommendations(
  expenses: Expense[],
  existingBudgets: Budget[] = []
): BudgetRecommendation[] {
  if (expenses.length === 0) {
    return []
  }

  const recommendations: BudgetRecommendation[] = []
  const now = new Date()
  const currentMonth = now.toISOString().substring(0, 7) // YYYY-MM

  // Get last 3 months of data
  const threeMonthsAgo = new Date(now)
  threeMonthsAgo.setMonth(now.getMonth() - 3)

  const recentExpenses = expenses.filter(
    (e) => new Date(e.transaction_date) >= threeMonthsAgo
  )

  if (recentExpenses.length === 0) {
    return []
  }

  // Calculate averages
  const monthlyAverages = getAverageMonthlySpending(recentExpenses, 3)
  const currentMonthSpending = getMonthlySpending(expenses, currentMonth)

  // Create recommendations for each category
  monthlyAverages.forEach((avgSpending, category) => {
    const existingBudget = existingBudgets.find(
      (b) => b.category === category && b.month === currentMonth
    )

    const currentSpending = currentMonthSpending.get(category) || 0
    const { trend, percentChange } = detectTrend(currentSpending, avgSpending)

    // Calculate suggested amount with 10% buffer for flexibility
    let suggestedAmount = Math.ceil(avgSpending * 1.1)

    // Adjust based on trend
    if (trend === 'increasing') {
      suggestedAmount = Math.ceil(avgSpending * 1.2) // 20% buffer
    } else if (trend === 'decreasing') {
      suggestedAmount = Math.ceil(avgSpending * 1.05) // 5% buffer
    }

    // Determine confidence based on data consistency
    let confidence: 'high' | 'medium' | 'low' = 'medium'
    if (recentExpenses.filter((e) => e.category === category).length >= 9) {
      // 3+ expenses per month
      confidence = 'high'
    } else if (
      recentExpenses.filter((e) => e.category === category).length < 3
    ) {
      confidence = 'low'
    }

    // Generate reasoning
    let reasoning = `Based on your last 3 months, you spend an average of ${avgSpending.toLocaleString('vi-VN')} VND on ${category}.`

    if (trend === 'increasing') {
      reasoning += ` Your spending is increasing by ${Math.abs(percentChange).toFixed(0)}%, so we recommend a higher budget.`
    } else if (trend === 'decreasing') {
      reasoning += ` Your spending is decreasing by ${Math.abs(percentChange).toFixed(0)}%, so a lower budget may work.`
    } else {
      reasoning += ` Your spending is stable, so this budget should work well.`
    }

    if (existingBudget && currentSpending > existingBudget.amount) {
      reasoning += ` You're currently ${((currentSpending / existingBudget.amount - 1) * 100).toFixed(0)}% over budget this month.`
    }

    recommendations.push({
      category,
      suggestedAmount,
      currentAmount: existingBudget?.amount,
      reasoning,
      confidence,
      trend,
      percentChange,
    })
  })

  // Sort by spending amount (highest first)
  return recommendations.sort((a, b) => b.suggestedAmount - a.suggestedAmount)
}

/**
 * Get spending patterns for all categories
 */
export function getSpendingPatterns(
  expenses: Expense[],
  budgets: Budget[] = []
): SpendingPattern[] {
  const now = new Date()
  const currentMonth = now.toISOString().substring(0, 7)

  const threeMonthsAgo = new Date(now)
  threeMonthsAgo.setMonth(now.getMonth() - 3)

  const recentExpenses = expenses.filter(
    (e) => new Date(e.transaction_date) >= threeMonthsAgo
  )

  const monthlyAverages = getAverageMonthlySpending(recentExpenses, 3)
  const last3MonthsAverages = getAverageMonthlySpending(expenses, 3)
  const currentMonthSpending = getMonthlySpending(expenses, currentMonth)

  const patterns: SpendingPattern[] = []

  monthlyAverages.forEach((avgSpending, category) => {
    const currentSpending = currentMonthSpending.get(category) || 0
    const last3Avg = last3MonthsAverages.get(category) || avgSpending
    const budget = budgets.find(
      (b) => b.category === category && b.month === currentMonth
    )

    patterns.push({
      category,
      monthlyAverage: avgSpending,
      last3MonthsAverage: last3Avg,
      currentMonthSpending: currentSpending,
      isOverBudget: budget ? currentSpending > budget.amount : false,
    })
  })

  return patterns.sort((a, b) => b.monthlyAverage - a.monthlyAverage)
}

/**
 * Check if user needs budget adjustments for current month
 */
export function needsBudgetAdjustment(
  expenses: Expense[],
  budgets: Budget[]
): {
  needsAdjustment: boolean
  categories: string[]
  reason: string
} {
  const now = new Date()
  const currentMonth = now.toISOString().substring(0, 7)
  const currentMonthSpending = getMonthlySpending(expenses, currentMonth)

  const overBudgetCategories: string[] = []

  currentMonthSpending.forEach((spending, category) => {
    const budget = budgets.find(
      (b) => b.category === category && b.month === currentMonth
    )

    if (budget && spending > budget.amount * 0.9) {
      // 90% threshold
      overBudgetCategories.push(category)
    }
  })

  if (overBudgetCategories.length > 0) {
    return {
      needsAdjustment: true,
      categories: overBudgetCategories,
      reason: `You're approaching or exceeding your budget in ${overBudgetCategories.length} ${overBudgetCategories.length === 1 ? 'category' : 'categories'}.`,
    }
  }

  return {
    needsAdjustment: false,
    categories: [],
    reason: 'Your spending is within budget limits.',
  }
}
