import type { PreprocessedData } from './preprocess-expenses'
import { INSIGHT_THRESHOLDS } from './thresholds'

export interface AlertInsight {
  type: 'alert' | 'tip'
  category?: string
  title: string
  description: string
  value: string
  change?: number
}

/**
 * Detects unusual daily spending spikes
 * Uses preprocessed daily totals
 *
 * @param data - Preprocessed expense data
 * @param formatCurrency - Currency formatting function
 * @returns Alert if a spike is detected (> threshold x daily average)
 */
export function detectSpendingSpikes(
  data: PreprocessedData,
  formatCurrency: (amount: number, currency: string) => string
): AlertInsight | null {
  const dailyAmounts = Object.values(data.dailyTotals)

  // Need at least a week of data
  if (dailyAmounts.length < INSIGHT_THRESHOLDS.MIN_DAYS_FOR_SPIKE) {
    return null
  }

  const avgDaily = dailyAmounts.reduce((sum, val) => sum + val, 0) / dailyAmounts.length
  const maxDaily = Math.max(...dailyAmounts)

  // Spike threshold
  if (maxDaily > avgDaily * INSIGHT_THRESHOLDS.SPENDING_SPIKE_MULTIPLIER) {
    return {
      type: 'alert',
      title: 'Unusual spending spike detected',
      description: `One day was ${((maxDaily / avgDaily - 1) * 100).toFixed(0)}% above your daily average`,
      value: formatCurrency(maxDaily, 'VND'),
    }
  }

  return null
}

/**
 * Calculates spending velocity (last 7 days vs previous 7 days)
 * Uses preprocessed period totals
 *
 * @param data - Preprocessed expense data
 * @param formatCurrency - Currency formatting function
 * @returns Alert or tip if velocity change is significant (> threshold)
 */
export function detectSpendingVelocity(
  data: PreprocessedData,
  formatCurrency: (amount: number, currency: string) => string
): AlertInsight | null {
  const last7DaysTotal = data.totals.last7Days
  const prev7DaysTotal = data.totals.prev7Days

  if (prev7DaysTotal === 0) {
    return null
  }

  const velocityChange = ((last7DaysTotal - prev7DaysTotal) / prev7DaysTotal) * 100

  // Only report significant changes
  if (Math.abs(velocityChange) > INSIGHT_THRESHOLDS.VELOCITY_CHANGE_THRESHOLD) {
    return {
      type: velocityChange > 0 ? 'alert' : 'tip',
      title: `Spending is ${velocityChange > 0 ? 'accelerating' : 'slowing down'}`,
      description: `${Math.abs(velocityChange).toFixed(0)}% ${velocityChange > 0 ? 'more' : 'less'} than last week`,
      value: formatCurrency(last7DaysTotal, 'VND'),
      change: velocityChange,
    }
  }

  return null
}
