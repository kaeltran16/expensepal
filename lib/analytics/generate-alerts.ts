import type { Expense } from '@/lib/supabase'

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
 * @param expenses - Expenses from last 30 days
 * @param formatCurrency - Currency formatting function
 * @returns Alert if a spike is detected (>2.5x daily average)
 */
export function detectSpendingSpikes(
  expenses: Expense[],
  formatCurrency: (amount: number, currency: string) => string
): AlertInsight | null {
  const now = new Date()
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const last30DaysExpenses = expenses.filter(
    (e) => new Date(e.transaction_date) >= last30Days
  )

  // Group by day
  const dailyTotals: Record<string, number> = {}
  last30DaysExpenses.forEach((e) => {
    const dateStr = new Date(e.transaction_date).toDateString()
    dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + e.amount
  })

  const dailyAmounts = Object.values(dailyTotals)

  // Need at least a week of data
  if (dailyAmounts.length < 7) {
    return null
  }

  const avgDaily = dailyAmounts.reduce((sum, val) => sum + val, 0) / dailyAmounts.length
  const maxDaily = Math.max(...dailyAmounts)

  // Spike threshold: 2.5x average
  if (maxDaily > avgDaily * 2.5) {
    return {
      type: 'alert',
      title: 'Unusual spending spike detected',
      description: `One day was ${((maxDaily / avgDaily - 1) * 100).toFixed(
        0
      )}% above your daily average`,
      value: formatCurrency(maxDaily, 'VND'),
    }
  }

  return null
}

/**
 * Calculates spending velocity (last 7 days vs previous 7 days)
 * @param expenses - All expenses
 * @param formatCurrency - Currency formatting function
 * @returns Alert or tip if velocity change is significant (>30%)
 */
export function detectSpendingVelocity(
  expenses: Expense[],
  formatCurrency: (amount: number, currency: string) => string
): AlertInsight | null {
  const now = new Date()

  const last7Days = expenses.filter((e) => {
    const date = new Date(e.transaction_date)
    return date >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  })

  const prev7Days = expenses.filter((e) => {
    const date = new Date(e.transaction_date)
    return (
      date >= new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) &&
      date < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    )
  })

  const last7DaysTotal = last7Days.reduce((sum, e) => sum + e.amount, 0)
  const prev7DaysTotal = prev7Days.reduce((sum, e) => sum + e.amount, 0)

  if (prev7DaysTotal === 0) {
    return null
  }

  const velocityChange = ((last7DaysTotal - prev7DaysTotal) / prev7DaysTotal) * 100

  // Only report significant changes (>30%)
  if (Math.abs(velocityChange) > 30) {
    return {
      type: velocityChange > 0 ? 'alert' : 'tip',
      title: `Spending is ${velocityChange > 0 ? 'accelerating' : 'slowing down'}`,
      description: `${Math.abs(velocityChange).toFixed(0)}% ${
        velocityChange > 0 ? 'more' : 'less'
      } than last week`,
      value: formatCurrency(last7DaysTotal, 'VND'),
      change: velocityChange,
    }
  }

  return null
}
