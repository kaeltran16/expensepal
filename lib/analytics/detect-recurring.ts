import type { Expense } from '@/lib/supabase'

export interface RecurringExpense {
  merchant: string
  category: string
  averageAmount: number
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  intervalDays: number
  lastDate: string
  nextExpected: string
  confidence: number // 0-100
  transactions: Expense[]
  totalSpentThisYear: number
  missedPayment?: boolean
}

interface MerchantGroup {
  merchant: string
  category: string
  expenses: Expense[]
  amounts: number[]
  dates: Date[]
}

/**
 * Detects recurring expenses from transaction history
 * Uses merchant name, amount similarity, and time intervals
 */
export function detectRecurringExpenses(expenses: Expense[]): RecurringExpense[] {
  if (!expenses || expenses.length < 2) return []

  // Group expenses by merchant
  const merchantGroups = groupByMerchant(expenses)

  // Analyze each group for recurring patterns
  const recurring: RecurringExpense[] = []

  for (const group of merchantGroups) {
    const pattern = analyzePattern(group)
    if (pattern && pattern.confidence >= 60) {
      recurring.push(pattern)
    }
  }

  // Sort by confidence and total spent
  return recurring.sort((a, b) => {
    if (Math.abs(a.confidence - b.confidence) > 10) {
      return b.confidence - a.confidence
    }
    return b.totalSpentThisYear - a.totalSpentThisYear
  })
}

/**
 * Group expenses by merchant name (case-insensitive, trimmed)
 */
function groupByMerchant(expenses: Expense[]): MerchantGroup[] {
  const groups = new Map<string, MerchantGroup>()

  for (const expense of expenses) {
    const merchantKey = expense.merchant.toLowerCase().trim()

    if (!groups.has(merchantKey)) {
      groups.set(merchantKey, {
        merchant: expense.merchant,
        category: expense.category || 'Other',
        expenses: [],
        amounts: [],
        dates: [],
      })
    }

    const group = groups.get(merchantKey)!
    group.expenses.push(expense)
    group.amounts.push(expense.amount)
    group.dates.push(new Date(expense.transaction_date))
  }

  // Only return merchants with 3+ transactions (minimum for pattern detection)
  return Array.from(groups.values()).filter(g => g.expenses.length >= 3)
}

/**
 * Analyze a merchant group for recurring patterns
 */
function analyzePattern(group: MerchantGroup): RecurringExpense | null {
  const { merchant, category, expenses, amounts, dates } = group

  // Sort by date ascending
  const sorted = dates
    .map((date, i) => ({ date, amount: amounts[i]!, expense: expenses[i]! }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  // Calculate intervals between transactions (in days)
  const intervals: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const days = Math.round(
      (sorted[i]!.date.getTime() - sorted[i - 1]!.date.getTime()) / (1000 * 60 * 60 * 24)
    )
    intervals.push(days)
  }

  if (intervals.length === 0) return null

  // Calculate average interval
  const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length

  // Calculate interval consistency (lower stddev = more consistent)
  const intervalStdDev = calculateStdDev(intervals)
  const intervalConsistency = Math.max(0, 100 - (intervalStdDev / avgInterval) * 100)

  // Calculate amount consistency
  const avgAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length
  const amountStdDev = calculateStdDev(amounts)
  const amountConsistency = Math.max(0, 100 - (amountStdDev / avgAmount) * 100)

  // Overall confidence (weighted: interval 60%, amount 40%)
  const confidence = Math.round(intervalConsistency * 0.6 + amountConsistency * 0.4)

  // Determine frequency category
  const frequency = categorizeFrequency(avgInterval)

  // Calculate next expected date
  const lastDate = sorted[sorted.length - 1]!.date
  const nextExpected = new Date(lastDate.getTime() + avgInterval * 24 * 60 * 60 * 1000)

  // Check if payment might be missed (7 days past expected)
  const today = new Date()
  const daysSinceExpected = Math.round(
    (today.getTime() - nextExpected.getTime()) / (1000 * 60 * 60 * 24)
  )
  const missedPayment = daysSinceExpected > 7

  // Calculate total spent this year
  const currentYear = new Date().getFullYear()
  const totalSpentThisYear = sorted
    .filter(s => s.date.getFullYear() === currentYear)
    .reduce((sum, s) => sum + (s.amount || 0), 0)

  return {
    merchant,
    category,
    averageAmount: Math.round(avgAmount),
    frequency,
    intervalDays: Math.round(avgInterval),
    lastDate: lastDate.toISOString(),
    nextExpected: nextExpected.toISOString(),
    confidence: Math.min(100, confidence),
    transactions: sorted.map(s => s.expense),
    totalSpentThisYear,
    missedPayment,
  }
}

/**
 * Categorize interval into frequency buckets
 */
function categorizeFrequency(days: number): RecurringExpense['frequency'] {
  if (days <= 9) return 'weekly' // 7 days ± 2
  if (days <= 16) return 'biweekly' // 14 days ± 2
  if (days <= 35) return 'monthly' // 30 days ± 5
  return 'quarterly' // 90 days ± range
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0

  const avg = values.reduce((sum, val) => sum + val, 0) / values.length
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2))
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length

  return Math.sqrt(variance)
}

/**
 * Get merchant-level spending insights
 */
export interface MerchantInsight {
  merchant: string
  category: string
  totalSpent: number
  transactionCount: number
  averageAmount: number
  firstTransaction: string
  lastTransaction: string
  monthlyAverage: number
  percentOfTotal: number
}

export function getMerchantInsights(
  expenses: Expense[],
  topN: number = 10
): MerchantInsight[] {
  if (!expenses || expenses.length === 0) return []

  // Group by merchant
  const merchantGroups = new Map<string, Expense[]>()

  for (const expense of expenses) {
    const key = expense.merchant.toLowerCase().trim()
    if (!merchantGroups.has(key)) {
      merchantGroups.set(key, [])
    }
    merchantGroups.get(key)!.push(expense)
  }

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)

  // Calculate insights for each merchant
  const insights: MerchantInsight[] = []

  for (const [_, merchantExpenses] of merchantGroups) {
    const sorted = merchantExpenses.sort(
      (a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    )

    const total = merchantExpenses.reduce((sum, e) => sum + e.amount, 0)
    const firstDate = new Date(sorted[0]!.transaction_date)
    const lastDate = new Date(sorted[sorted.length - 1]!.transaction_date)

    // Calculate months span
    const monthsSpan = Math.max(
      1,
      (lastDate.getFullYear() - firstDate.getFullYear()) * 12 +
        (lastDate.getMonth() - firstDate.getMonth()) + 1
    )

    insights.push({
      merchant: sorted[0]!.merchant,
      category: sorted[0]!.category || 'Other',
      totalSpent: total,
      transactionCount: merchantExpenses.length,
      averageAmount: total / merchantExpenses.length,
      firstTransaction: sorted[0]!.transaction_date,
      lastTransaction: sorted[sorted.length - 1]!.transaction_date,
      monthlyAverage: total / monthsSpan,
      percentOfTotal: (total / totalSpent) * 100,
    })
  }

  // Sort by total spent and return top N
  return insights.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, topN)
}
