import type { Expense } from '@/lib/supabase'

// Type for detected recurring patterns from transaction analysis
export interface DetectedRecurringExpense {
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

// Legacy alias for backwards compatibility
export type RecurringExpense = DetectedRecurringExpense

// Frequency type shared between detection and storage
export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'

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
 * Improvements: Better merchant grouping, minimum 4 transactions, recency weighting
 */
export function detectRecurringExpenses(expenses: Expense[]): RecurringExpense[] {
  if (!expenses || expenses.length < 2) return []

  // Group expenses by merchant using fuzzy matching
  const merchantGroups = groupByMerchantFuzzy(expenses)

  // Analyze each group for recurring patterns
  const recurring: RecurringExpense[] = []

  for (const group of merchantGroups) {
    const pattern = analyzePattern(group)
    // Increased threshold and minimum transaction count
    if (pattern && pattern.confidence >= 65 && group.expenses.length >= 4) {
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
 * Calculate Levenshtein distance between two strings (edit distance)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0))

  for (let i = 0; i <= len1; i++) matrix[i]![0] = i
  for (let j = 0; j <= len2; j++) matrix[0]![j] = j

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,      // deletion
        matrix[i]![j - 1]! + 1,      // insertion
        matrix[i - 1]![j - 1]! + cost // substitution
      )
    }
  }

  return matrix[len1]![len2]!
}

/**
 * Calculate similarity ratio between two strings (0-1, where 1 is identical)
 */
function similarityRatio(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) return 1.0
  const distance = levenshteinDistance(str1, str2)
  return 1.0 - distance / maxLen
}

/**
 * Normalize merchant name for better matching
 */
function normalizeMerchant(merchant: string): string {
  return merchant
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')     // Normalize whitespace
}

/**
 * Group expenses by merchant using fuzzy matching
 * Merchants with >80% similarity are grouped together
 */
function groupByMerchantFuzzy(expenses: Expense[]): MerchantGroup[] {
  const groups: MerchantGroup[] = []

  for (const expense of expenses) {
    const normalizedMerchant = normalizeMerchant(expense.merchant)

    // Find existing group with similar merchant name
    let matchedGroup: MerchantGroup | null = null
    for (const group of groups) {
      const groupMerchant = normalizeMerchant(group.merchant)
      const similarity = similarityRatio(normalizedMerchant, groupMerchant)

      // 80% similarity threshold
      if (similarity >= 0.8) {
        matchedGroup = group
        break
      }
    }

    if (matchedGroup) {
      // Add to existing group
      matchedGroup.expenses.push(expense)
      matchedGroup.amounts.push(expense.amount)
      matchedGroup.dates.push(new Date(expense.transaction_date))
    } else {
      // Create new group
      groups.push({
        merchant: expense.merchant,
        category: expense.category || 'Other',
        expenses: [expense],
        amounts: [expense.amount],
        dates: [new Date(expense.transaction_date)],
      })
    }
  }

  // Only return merchants with 4+ transactions (minimum for reliable pattern detection)
  return groups.filter(g => g.expenses.length >= 4)
}

/**
 * Group expenses by merchant name (case-insensitive, trimmed)
 * Legacy function - kept for backwards compatibility
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

  // Only return merchants with 4+ transactions (minimum for pattern detection)
  return Array.from(groups.values()).filter(g => g.expenses.length >= 4)
}

/**
 * Analyze a merchant group for recurring patterns
 * Improvements: Recency weighting, better missed payment detection, improved confidence scoring
 */
function analyzePattern(group: MerchantGroup): RecurringExpense | null {
  const { merchant, category, expenses, amounts, dates } = group

  // Sort by date ascending
  const sorted = dates
    .map((date, i) => ({ date, amount: amounts[i]!, expense: expenses[i]! }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  // Calculate intervals between transactions (in days)
  const intervals: number[] = []
  const intervalDates: Date[] = []
  for (let i = 1; i < sorted.length; i++) {
    const days = Math.round(
      (sorted[i]!.date.getTime() - sorted[i - 1]!.date.getTime()) / (1000 * 60 * 60 * 24)
    )
    intervals.push(days)
    intervalDates.push(sorted[i]!.date)
  }

  if (intervals.length === 0) return null

  // Weight recent intervals more heavily (last 3 intervals get 60% weight, rest 40%)
  const recentCount = Math.min(3, intervals.length)
  const recentIntervals = intervals.slice(-recentCount)
  const olderIntervals = intervals.slice(0, -recentCount)

  const recentAvg = recentIntervals.reduce((sum, val) => sum + val, 0) / recentIntervals.length
  const olderAvg = olderIntervals.length > 0
    ? olderIntervals.reduce((sum, val) => sum + val, 0) / olderIntervals.length
    : recentAvg

  const avgInterval = recentAvg * 0.6 + olderAvg * 0.4

  // Calculate interval consistency (lower stddev = more consistent)
  const intervalStdDev = calculateStdDev(intervals)
  const intervalConsistency = Math.max(0, 100 - (intervalStdDev / avgInterval) * 100)

  // Calculate amount consistency
  const avgAmount = amounts.reduce((sum, val) => sum + val, 0) / amounts.length
  const amountStdDev = calculateStdDev(amounts)
  const amountConsistency = Math.max(0, 100 - (amountStdDev / avgAmount) * 100)

  // Check recency - lower confidence if last transaction is very old
  const lastDate = sorted[sorted.length - 1]!.date
  const daysSinceLastTransaction = Math.round(
    (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Recency factor: full confidence if within 2x average interval, decreases after that
  const expectedGap = avgInterval * 2
  const recencyFactor = daysSinceLastTransaction <= expectedGap
    ? 100
    : Math.max(20, 100 - ((daysSinceLastTransaction - expectedGap) / avgInterval) * 20)

  // Overall confidence (weighted: interval 50%, amount 30%, recency 20%)
  const confidence = Math.round(
    intervalConsistency * 0.5 + amountConsistency * 0.3 + recencyFactor * 0.2
  )

  // Determine frequency category
  const frequency = categorizeFrequency(avgInterval)

  // Calculate next expected date using frequency-based calculation for better accuracy
  const nextExpected = calculateNextExpectedDate(lastDate, frequency, avgInterval)

  // Improved missed payment detection
  const today = new Date()
  const daysSinceExpected = Math.round(
    (today.getTime() - nextExpected.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Grace period varies by frequency (weekly: 3 days, biweekly: 5 days, monthly+: 7 days)
  const gracePeriod = frequency === 'weekly' ? 3 : frequency === 'biweekly' ? 5 : 7
  const missedPayment = daysSinceExpected > gracePeriod

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
 * Calculate next expected date based on frequency for more accurate predictions
 */
function calculateNextExpectedDate(
  lastDate: Date,
  frequency: RecurringExpense['frequency'],
  avgInterval: number
): Date {
  const next = new Date(lastDate)

  switch (frequency) {
    case 'weekly':
      // Add 7 days
      next.setDate(next.getDate() + 7)
      break
    case 'biweekly':
      // Add 14 days
      next.setDate(next.getDate() + 14)
      break
    case 'monthly':
      // Add 1 month (preserves day of month)
      next.setMonth(next.getMonth() + 1)
      break
    case 'quarterly':
      // Add 3 months (preserves day of month)
      next.setMonth(next.getMonth() + 3)
      break
    default:
      // Fallback to average interval
      next.setDate(next.getDate() + Math.round(avgInterval))
  }

  return next
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
