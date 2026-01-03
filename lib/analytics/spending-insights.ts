import type { Expense } from '@/lib/supabase'

export interface SpendingPattern {
  type: 'day_of_week' | 'time_of_day' | 'category_trend' | 'streak'
  title: string
  description: string
  impact: 'positive' | 'negative' | 'neutral'
  data?: Record<string, unknown>
}

export interface CategoryTrend {
  category: string
  currentMonth: number
  previousMonth: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
}

/**
 * Analyze day-of-week spending patterns
 */
export function analyzeDayOfWeekPatterns(expenses: Expense[]): SpendingPattern[] {
  if (!expenses || expenses.length === 0) return []

  const dayTotals = new Array(7).fill(0)
  const dayCounts = new Array(7).fill(0)

  for (const expense of expenses) {
    const day = new Date(expense.transaction_date).getDay()
    dayTotals[day] += expense.amount
    dayCounts[day]++
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const averages = dayTotals.map((total, i) => (dayCounts[i] > 0 ? total / dayCounts[i] : 0))

  const maxAvg = Math.max(...averages)
  const minAvg = Math.min(...averages.filter(a => a > 0))
  const maxDay = dayNames[averages.indexOf(maxAvg)]
  const minDay = dayNames[averages.indexOf(minAvg)]

  const patterns: SpendingPattern[] = []

  // High spending day pattern
  if (maxAvg > minAvg * 1.5) {
    const multiplier = (maxAvg / minAvg).toFixed(1)
    patterns.push({
      type: 'day_of_week',
      title: `${maxDay} is your biggest spending day`,
      description: `You spend ${multiplier}x more on ${maxDay}s than ${minDay}s`,
      impact: 'neutral',
      data: { dayTotals, dayNames, averages },
    })
  }

  return patterns
}

/**
 * Analyze category spending trends (month-over-month)
 */
export function analyzeCategoryTrends(expenses: Expense[]): CategoryTrend[] {
  if (!expenses || expenses.length === 0) return []

  const now = new Date()
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

  // Group by category and month
  const categoryData = new Map<string, { current: number; previous: number }>()

  for (const expense of expenses) {
    const expenseDate = new Date(expense.transaction_date)
    const category = expense.category || 'Other'

    if (!categoryData.has(category)) {
      categoryData.set(category, { current: 0, previous: 0 })
    }

    const data = categoryData.get(category)!

    if (expenseDate >= currentMonth) {
      data.current += expense.amount
    } else if (expenseDate >= previousMonth && expenseDate < currentMonth) {
      data.previous += expense.amount
    }
  }

  // Calculate trends
  const trends: CategoryTrend[] = []

  for (const [category, data] of categoryData) {
    if (data.current === 0 && data.previous === 0) continue

    const changePercent =
      data.previous > 0 ? ((data.current - data.previous) / data.previous) * 100 : 0

    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (Math.abs(changePercent) > 10) {
      trend = changePercent > 0 ? 'up' : 'down'
    }

    trends.push({
      category,
      currentMonth: data.current,
      previousMonth: data.previous,
      changePercent,
      trend,
    })
  }

  return trends.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
}

/**
 * Detect spending streaks (no spending in a category)
 */
export function detectSpendingStreaks(expenses: Expense[]): SpendingPattern[] {
  if (!expenses || expenses.length === 0) return []

  const categories = ['Shopping', 'Entertainment', 'Food', 'Transport']
  const patterns: SpendingPattern[] = []

  for (const category of categories) {
    const categoryExpenses = expenses
      .filter(e => e.category === category)
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())

    if (categoryExpenses.length === 0) continue

    const lastExpense = new Date(categoryExpenses[0].transaction_date)
    const daysSince = Math.floor((Date.now() - lastExpense.getTime()) / (1000 * 60 * 60 * 24))

    if (daysSince >= 7) {
      patterns.push({
        type: 'streak',
        title: `${daysSince} days without ${category} expenses`,
        description: `Great job! You haven't spent on ${category.toLowerCase()} since ${lastExpense.toLocaleDateString()}`,
        impact: 'positive',
        data: { category, daysSince, lastExpense },
      })
    }
  }

  return patterns.sort((a, b) => (b.data?.daysSince || 0) - (a.data?.daysSince || 0))
}

/**
 * Find unusual merchant spending (one-time large purchases)
 */
export function findUnusualSpending(expenses: Expense[], threshold: number = 2): SpendingPattern[] {
  if (!expenses || expenses.length === 0) return []

  // Calculate overall average
  const avgExpense = expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length

  // Find expenses significantly above average
  const unusual = expenses
    .filter(e => e.amount > avgExpense * threshold)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)

  return unusual.map(expense => ({
    type: 'category_trend' as const,
    title: `Large ${expense.category || 'expense'} at ${expense.merchant}`,
    description: `${(expense.amount / avgExpense).toFixed(1)}x your average expense`,
    impact: 'neutral' as const,
    data: expense,
  }))
}

/**
 * Get comprehensive spending insights
 */
export function getComprehensiveInsights(expenses: Expense[]): SpendingPattern[] {
  const insights: SpendingPattern[] = []

  // Add day-of-week patterns
  insights.push(...analyzeDayOfWeekPatterns(expenses))

  // Add spending streaks
  insights.push(...detectSpendingStreaks(expenses))

  // Add unusual spending
  insights.push(...findUnusualSpending(expenses))

  return insights.slice(0, 10) // Return top 10 insights
}
