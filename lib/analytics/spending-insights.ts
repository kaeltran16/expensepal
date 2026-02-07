import type { PreprocessedData } from './preprocess-expenses'
import { INSIGHT_THRESHOLDS } from './thresholds'

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
 * Uses preprocessed day-of-week aggregations
 */
export function analyzeDayOfWeekPatterns(data: PreprocessedData): SpendingPattern[] {
  const { totals, counts } = data.dayOfWeek
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Calculate averages
  const averages = totals.map((total, i) => (counts[i] > 0 ? total / counts[i] : 0))

  const nonZeroAverages = averages.filter((a) => a > 0)
  if (nonZeroAverages.length === 0) return []

  const maxAvg = Math.max(...averages)
  const minAvg = Math.min(...nonZeroAverages)
  const maxDay = dayNames[averages.indexOf(maxAvg)]
  const minDay = dayNames[averages.indexOf(minAvg)]

  const patterns: SpendingPattern[] = []

  // High spending day pattern
  if (maxAvg > minAvg * INSIGHT_THRESHOLDS.DAY_MULTIPLIER_THRESHOLD) {
    const multiplier = (maxAvg / minAvg).toFixed(1)
    patterns.push({
      type: 'day_of_week',
      title: `${maxDay} is your biggest spending day`,
      description: `You spend ${multiplier}x more on ${maxDay}s than ${minDay}s`,
      impact: 'neutral',
      data: { dayTotals: totals, dayNames, averages },
    })
  }

  return patterns
}

/**
 * Analyze category spending trends (month-over-month)
 * Uses preprocessed category totals
 */
export function analyzeCategoryTrends(data: PreprocessedData): CategoryTrend[] {
  const thisMonth = data.categoryTotals.thisMonth
  const lastMonth = data.categoryTotals.lastMonth

  // Get all categories from both months
  const allCategories = new Set([...Object.keys(thisMonth), ...Object.keys(lastMonth)])

  const trends: CategoryTrend[] = []

  for (const category of allCategories) {
    const current = thisMonth[category] || 0
    const previous = lastMonth[category] || 0

    if (current === 0 && previous === 0) continue

    const changePercent = previous > 0 ? ((current - previous) / previous) * 100 : 0

    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (Math.abs(changePercent) > INSIGHT_THRESHOLDS.STABLE_THRESHOLD) {
      trend = changePercent > 0 ? 'up' : 'down'
    }

    trends.push({
      category,
      currentMonth: current,
      previousMonth: previous,
      changePercent,
      trend,
    })
  }

  return trends.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
}

/**
 * Detect actual no-spend streaks (consecutive days with zero expenses)
 * Counts backwards from today to find the current streak
 */
export function detectSpendingStreaks(data: PreprocessedData): SpendingPattern[] {
  // Build a set of dates (YYYY-MM-DD) that have any expense
  const datesWithSpending = new Set<string>()
  for (const expense of data.byPeriod.last30Days) {
    const date = new Date(expense.transaction_date)
    datesWithSpending.add(date.toISOString().split('T')[0])
  }

  // Count consecutive no-spend days backwards from yesterday
  // (today is excluded since it's still in progress)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streakDays = 0

  for (let i = 1; i <= 30; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    const dateStr = checkDate.toISOString().split('T')[0]

    if (datesWithSpending.has(dateStr)) break
    streakDays++
  }

  if (streakDays < INSIGHT_THRESHOLDS.MIN_STREAK_DAYS) return []

  return [
    {
      type: 'streak',
      title: `${streakDays}-day no-spend streak!`,
      description: `You haven't spent anything in the last ${streakDays} days. Keep it up!`,
      impact: 'positive',
      data: { daysSince: streakDays },
    },
  ]
}

/**
 * Find unusual merchant spending (one-time large purchases)
 * Uses preprocessed period expenses
 */
export function findUnusualSpending(data: PreprocessedData): SpendingPattern[] {
  const expenses = data.byPeriod.last30Days

  if (expenses.length === 0) return []

  // Calculate overall average
  const avgExpense = data.totals.last30Days / expenses.length

  // Find expenses significantly above average
  const unusual = expenses
    .filter((e) => e.amount > avgExpense * INSIGHT_THRESHOLDS.UNUSUAL_SPENDING_MULTIPLIER)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)

  return unusual.map((expense) => ({
    type: 'category_trend' as const,
    title: `Large ${expense.category || 'expense'} at ${expense.merchant}`,
    description: `${(expense.amount / avgExpense).toFixed(1)}x your average expense`,
    impact: 'neutral' as const,
    data: expense as unknown as Record<string, unknown>,
  }))
}

/**
 * Get comprehensive spending insights
 * Combines all pattern analysis functions
 */
export function getComprehensiveInsights(data: PreprocessedData): SpendingPattern[] {
  const insights: SpendingPattern[] = []

  // Add day-of-week patterns
  insights.push(...analyzeDayOfWeekPatterns(data))

  // Add spending streaks
  insights.push(...detectSpendingStreaks(data))

  // Add unusual spending
  insights.push(...findUnusualSpending(data))

  return insights.slice(0, 10) // Return top 10 insights
}
