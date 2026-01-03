import type { Expense } from '@/lib/supabase'

export interface TrendInsight {
  type: 'trend'
  category: string
  title: string
  description: string
  value: string
  change: number
}

/**
 * Calculates month-over-month spending trends by category
 * @param expenses - All expenses to analyze
 * @param formatCurrency - Currency formatting function
 * @returns Array of trend insights (increases/decreases >25%)
 */
export function calculateMonthOverMonthTrends(
  expenses: Expense[],
  formatCurrency: (amount: number, currency: string) => string
): TrendInsight[] {
  const results: TrendInsight[] = []
  const now = new Date()

  // Date ranges
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  // Filter expenses by month
  const thisMonthExpenses = expenses.filter(
    (e) => new Date(e.transaction_date) >= startOfThisMonth
  )
  const lastMonthExpenses = expenses.filter(
    (e) =>
      new Date(e.transaction_date) >= startOfLastMonth &&
      new Date(e.transaction_date) <= endOfLastMonth
  )

  // Aggregate by category
  const thisMonthByCategory: Record<string, number> = {}
  const lastMonthByCategory: Record<string, number> = {}

  thisMonthExpenses.forEach((e) => {
    const cat = e.category || 'Other'
    thisMonthByCategory[cat] = (thisMonthByCategory[cat] || 0) + e.amount
  })

  lastMonthExpenses.forEach((e) => {
    const cat = e.category || 'Other'
    lastMonthByCategory[cat] = (lastMonthByCategory[cat] || 0) + e.amount
  })

  // Find significant changes (>25%)
  Object.keys(thisMonthByCategory).forEach((category) => {
    const thisMonth = thisMonthByCategory[category] || 0
    const lastMonth = lastMonthByCategory[category] || 0

    if (lastMonth > 0) {
      const change = ((thisMonth - lastMonth) / lastMonth) * 100

      if (Math.abs(change) > 25) {
        results.push({
          type: 'trend',
          category,
          title: `${category} ${change > 0 ? 'increased' : 'decreased'}`,
          description: `${Math.abs(change).toFixed(0)}% ${
            change > 0 ? 'more' : 'less'
          } than last month`,
          value: formatCurrency(thisMonth, 'VND'),
          change,
        })
      }
    }
  })

  return results
}

/**
 * Detects new spending categories with significant amounts
 * @param expenses - All expenses to analyze
 * @param formatCurrency - Currency formatting function
 * @returns Array of alerts for new categories
 */
export function detectNewCategories(
  expenses: Expense[],
  formatCurrency: (amount: number, currency: string) => string
): Array<{
  type: 'alert'
  category: string
  title: string
  description: string
  value: string
}> {
  const results: Array<{
    type: 'alert'
    category: string
    title: string
    description: string
    value: string
  }> = []
  const now = new Date()

  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const thisMonthExpenses = expenses.filter(
    (e) => new Date(e.transaction_date) >= startOfThisMonth
  )
  const lastMonthExpenses = expenses.filter(
    (e) =>
      new Date(e.transaction_date) >= startOfLastMonth &&
      new Date(e.transaction_date) <= endOfLastMonth
  )

  const thisMonthByCategory: Record<string, number> = {}
  const lastMonthByCategory: Record<string, number> = {}

  thisMonthExpenses.forEach((e) => {
    const cat = e.category || 'Other'
    thisMonthByCategory[cat] = (thisMonthByCategory[cat] || 0) + e.amount
  })

  lastMonthExpenses.forEach((e) => {
    const cat = e.category || 'Other'
    lastMonthByCategory[cat] = (lastMonthByCategory[cat] || 0) + e.amount
  })

  // Find new categories with significant spending
  Object.keys(thisMonthByCategory).forEach((category) => {
    const thisMonth = thisMonthByCategory[category] || 0
    const lastMonth = lastMonthByCategory[category] || 0

    if (lastMonth === 0 && thisMonth > 100000) {
      results.push({
        type: 'alert',
        category,
        title: `New spending in ${category}`,
        description: 'This is a new category for you this month',
        value: formatCurrency(thisMonth, 'VND'),
      })
    }
  })

  return results
}
