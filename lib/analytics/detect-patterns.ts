import type { Expense } from '@/lib/supabase'

export interface PatternInsight {
  type: 'pattern'
  category: string
  title: string
  description: string
  value: string
}

/**
 * Analyzes weekend vs weekday spending patterns by category
 * @param expenses - Expenses from last 30 days
 * @param formatCurrency - Currency formatting function
 * @returns Array of pattern insights for categories with significant differences
 */
export function detectWeekendWeekdayPatterns(
  expenses: Expense[],
  formatCurrency: (amount: number, currency: string) => string
): PatternInsight[] {
  const results: PatternInsight[] = []
  const now = new Date()
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Filter to last 30 days
  const last30DaysExpenses = expenses.filter(
    (e) => new Date(e.transaction_date) >= last30Days
  )

  // Aggregate by category and day type
  const weekdayByCategory: Record<string, number> = {}
  const weekendByCategory: Record<string, number> = {}
  const weekdayCount: Record<string, number> = {}
  const weekendCount: Record<string, number> = {}

  last30DaysExpenses.forEach((e) => {
    const date = new Date(e.transaction_date)
    const day = date.getDay()
    const isWeekend = day === 0 || day === 6
    const cat = e.category || 'Other'

    if (isWeekend) {
      weekendByCategory[cat] = (weekendByCategory[cat] || 0) + e.amount
      weekendCount[cat] = (weekendCount[cat] || 0) + 1
    } else {
      weekdayByCategory[cat] = (weekdayByCategory[cat] || 0) + e.amount
      weekdayCount[cat] = (weekdayCount[cat] || 0) + 1
    }
  })

  // Find significant weekend/weekday differences (>30%)
  Object.keys(weekendByCategory).forEach((category) => {
    const weekendTotal = weekendByCategory[category]
    const weekdayTotal = weekdayByCategory[category] || 0

    if (weekdayTotal > 0) {
      const weekendAvg = weekendTotal / (weekendCount[category] || 1)
      const weekdayAvg = weekdayTotal / (weekdayCount[category] || 1)
      const diff = ((weekendAvg - weekdayAvg) / weekdayAvg) * 100

      if (diff > 30) {
        results.push({
          type: 'pattern',
          category,
          title: `You spend more on ${category} on weekends`,
          description: `${diff.toFixed(0)}% higher average per day`,
          value: formatCurrency(weekendAvg, 'VND') + ' avg',
        })
      } else if (diff < -30) {
        results.push({
          type: 'pattern',
          category,
          title: `You spend more on ${category} on weekdays`,
          description: `${Math.abs(diff).toFixed(0)}% higher average per day`,
          value: formatCurrency(weekdayAvg, 'VND') + ' avg',
        })
      }
    }
  })

  return results
}

/**
 * Identifies the top spending category and calculates its percentage of total spending
 * @param expenses - Expenses from last 30 days
 * @returns Top category info or null if no data
 */
export function findTopSpendingCategory(
  expenses: Expense[]
): {
  category: string
  amount: number
  percentage: number
} | null {
  const now = new Date()
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const last30DaysExpenses = expenses.filter(
    (e) => new Date(e.transaction_date) >= last30Days
  )

  const categoryTotals: Record<string, number> = {}
  last30DaysExpenses.forEach((e) => {
    const cat = e.category || 'Other'
    categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount
  })

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]

  if (!topCategory) {
    return null
  }

  const [category, amount] = topCategory
  const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0)
  const percentage = (amount / total) * 100

  return { category, amount, percentage }
}
