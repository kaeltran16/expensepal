import type { PreprocessedData } from './preprocess-expenses'
import type { IconType } from '@/lib/types'
import { INSIGHT_THRESHOLDS } from './thresholds'
import { calculateMonthOverMonthTrends, detectNewCategories } from './calculate-trends'
import { detectWeekendWeekdayPatterns, findTopSpendingCategory } from './detect-patterns'
import { detectSpendingSpikes, detectSpendingVelocity } from './generate-alerts'

export interface Insight {
  type: 'trend' | 'pattern' | 'alert' | 'tip'
  category?: string
  title: string
  description: string
  value?: string
  change?: number
  icon: IconType
}

// Category-specific spending tips
const CATEGORY_TIPS: Record<string, string> = {
  Food: 'Try meal prepping to reduce dining out costs',
  Transport: 'Consider carpooling or public transit alternatives',
  Shopping: 'Create a wishlist and wait 48 hours before purchasing',
  Entertainment: 'Look for free events or use subscription services more',
  Bills: 'Review recurring subscriptions and cancel unused ones',
  Health: 'Check if your insurance covers more services',
  Other: 'Categorize expenses better to track spending patterns',
}

/**
 * Generates all insights from preprocessed expense data
 * This is the main orchestrator that combines all analysis functions
 *
 * @param data - Preprocessed expense data (from usePreprocessedExpenses)
 * @param formatCurrency - Currency formatting function
 * @param icons - Icon components (TrendingUp, TrendingDown, AlertCircle, Lightbulb, Calendar)
 * @returns Array of all insights sorted by priority
 */
export function generateInsights(
  data: PreprocessedData,
  formatCurrency: (amount: number, currency: string) => string,
  icons: {
    TrendingUp: IconType
    TrendingDown: IconType
    AlertCircle: IconType
    Lightbulb: IconType
    Calendar: IconType
  }
): Insight[] {
  const results: Insight[] = []

  // 1. Month-over-month category trends
  const trendInsights = calculateMonthOverMonthTrends(data, formatCurrency)
  trendInsights.forEach((trend) => {
    results.push({
      ...trend,
      icon: trend.change > 0 ? icons.TrendingUp : icons.TrendingDown,
    })
  })

  // 2. New categories
  const newCategoryInsights = detectNewCategories(data, formatCurrency)
  newCategoryInsights.forEach((alert) => {
    results.push({
      ...alert,
      icon: icons.AlertCircle,
    })
  })

  // 3. Weekend vs weekday patterns
  const patternInsights = detectWeekendWeekdayPatterns(data, formatCurrency)
  patternInsights.forEach((pattern) => {
    results.push({
      ...pattern,
      icon: icons.Calendar,
    })
  })

  // 4. Top spending category with personalized tip
  const topCategory = findTopSpendingCategory(data)
  if (topCategory && topCategory.percentage > INSIGHT_THRESHOLDS.TOP_CATEGORY_CONCENTRATION) {
    results.push({
      type: 'tip',
      category: topCategory.category,
      title: `${topCategory.category} is ${topCategory.percentage.toFixed(0)}% of spending`,
      description:
        CATEGORY_TIPS[topCategory.category] || 'Consider setting a budget for this category',
      value: formatCurrency(topCategory.amount, 'VND'),
      icon: icons.Lightbulb,
    })
  }

  // 5. Unusual spending spikes
  const spikeAlert = detectSpendingSpikes(data, formatCurrency)
  if (spikeAlert) {
    results.push({
      ...spikeAlert,
      icon: icons.AlertCircle,
    })
  }

  // 6. Spending velocity (acceleration/deceleration)
  const velocityInsight = detectSpendingVelocity(data, formatCurrency)
  if (velocityInsight) {
    results.push({
      ...velocityInsight,
      icon:
        velocityInsight.change && velocityInsight.change > 0
          ? icons.TrendingUp
          : icons.TrendingDown,
    })
  }

  return results
}
