import type { PreprocessedData } from './preprocess-expenses'
import { INSIGHT_THRESHOLDS } from './thresholds'

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
 * Uses preprocessed category totals for O(1) lookup
 *
 * @param data - Preprocessed expense data
 * @param formatCurrency - Currency formatting function
 * @returns Array of trend insights (increases/decreases > threshold)
 */
export function calculateMonthOverMonthTrends(
  data: PreprocessedData,
  formatCurrency: (amount: number, currency: string) => string
): TrendInsight[] {
  const results: TrendInsight[] = []
  const thisMonth = data.categoryTotals.thisMonth
  const lastMonth = data.categoryTotals.lastMonth

  // Find significant changes
  for (const category of Object.keys(thisMonth)) {
    const thisMonthAmount = thisMonth[category] || 0
    const lastMonthAmount = lastMonth[category] || 0

    if (lastMonthAmount > 0) {
      const change = ((thisMonthAmount - lastMonthAmount) / lastMonthAmount) * 100

      if (Math.abs(change) > INSIGHT_THRESHOLDS.SIGNIFICANT_MOM_CHANGE) {
        results.push({
          type: 'trend',
          category,
          title: `${category} ${change > 0 ? 'increased' : 'decreased'}`,
          description: `${Math.abs(change).toFixed(0)}% ${change > 0 ? 'more' : 'less'} than last month`,
          value: formatCurrency(thisMonthAmount, 'VND'),
          change,
        })
      }
    }
  }

  return results
}

/**
 * Detects new spending categories with significant amounts
 * Uses preprocessed category totals for O(1) lookup
 *
 * @param data - Preprocessed expense data
 * @param formatCurrency - Currency formatting function
 * @returns Array of alerts for new categories
 */
export function detectNewCategories(
  data: PreprocessedData,
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

  const thisMonth = data.categoryTotals.thisMonth
  const lastMonth = data.categoryTotals.lastMonth

  // Find new categories with significant spending
  for (const category of Object.keys(thisMonth)) {
    const thisMonthAmount = thisMonth[category] || 0
    const lastMonthAmount = lastMonth[category] || 0

    if (lastMonthAmount === 0 && thisMonthAmount > INSIGHT_THRESHOLDS.NEW_CATEGORY_MIN_AMOUNT) {
      results.push({
        type: 'alert',
        category,
        title: `New spending in ${category}`,
        description: 'This is a new category for you this month',
        value: formatCurrency(thisMonthAmount, 'VND'),
      })
    }
  }

  return results
}
