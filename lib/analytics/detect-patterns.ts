import type { PreprocessedData } from './preprocess-expenses'
import { INSIGHT_THRESHOLDS } from './thresholds'

export interface PatternInsight {
  type: 'pattern'
  category: string
  title: string
  description: string
  value: string
}

/**
 * Analyzes weekend vs weekday spending patterns by category
 * Uses preprocessed weekend/weekday aggregations
 *
 * @param data - Preprocessed expense data
 * @param formatCurrency - Currency formatting function
 * @returns Array of pattern insights for categories with significant differences
 */
export function detectWeekendWeekdayPatterns(
  data: PreprocessedData,
  formatCurrency: (amount: number, currency: string) => string
): PatternInsight[] {
  const results: PatternInsight[] = []

  // Get all categories that have either weekend or weekday expenses
  const allCategories = new Set([
    ...Object.keys(data.weekendByCategory),
    ...Object.keys(data.weekdayByCategory),
  ])

  for (const category of allCategories) {
    const weekend = data.weekendByCategory[category]
    const weekday = data.weekdayByCategory[category]

    // Only compare if we have data for both
    if (weekend?.count > 0 && weekday?.count > 0) {
      const weekendAvg = weekend.total / weekend.count
      const weekdayAvg = weekday.total / weekday.count
      const diff = ((weekendAvg - weekdayAvg) / weekdayAvg) * 100

      if (diff > INSIGHT_THRESHOLDS.WEEKEND_WEEKDAY_DIFF) {
        results.push({
          type: 'pattern',
          category,
          title: `You spend more on ${category} on weekends`,
          description: `${diff.toFixed(0)}% higher average per day`,
          value: formatCurrency(weekendAvg, 'VND') + ' avg',
        })
      } else if (diff < -INSIGHT_THRESHOLDS.WEEKEND_WEEKDAY_DIFF) {
        results.push({
          type: 'pattern',
          category,
          title: `You spend more on ${category} on weekdays`,
          description: `${Math.abs(diff).toFixed(0)}% higher average per day`,
          value: formatCurrency(weekdayAvg, 'VND') + ' avg',
        })
      }
    }
  }

  return results
}

/**
 * Identifies the top spending category and calculates its percentage of total spending
 * Uses preprocessed category totals
 *
 * @param data - Preprocessed expense data
 * @returns Top category info or null if no data
 */
export function findTopSpendingCategory(data: PreprocessedData): {
  category: string
  amount: number
  percentage: number
} | null {
  const categoryTotals = data.categoryTotals.last30Days
  const total = data.totals.last30Days

  if (total === 0) return null

  const topEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]

  if (!topEntry) return null

  const [category, amount] = topEntry
  const percentage = (amount / total) * 100

  return { category, amount, percentage }
}
