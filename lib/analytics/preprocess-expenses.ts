import type { Expense } from '@/lib/supabase'

/**
 * Time boundaries for expense filtering
 */
export interface TimeBoundaries {
  now: Date
  startOfThisMonth: Date
  startOfLastMonth: Date
  endOfLastMonth: Date
  last30Days: Date
  last7Days: Date
  last14Days: Date
}

/**
 * Category aggregation data
 */
export interface CategoryAggregation {
  total: number
  count: number
}

/**
 * Merchant aggregation data
 */
export interface MerchantAggregation {
  merchant: string // Original merchant name
  category: string
  total: number
  count: number
  expenses: Expense[]
  firstDate: Date
  lastDate: Date
}

/**
 * Preprocessed expense data for efficient insight generation
 * All aggregations computed in a single pass
 */
export interface PreprocessedData {
  // Time boundaries (pre-computed once)
  boundaries: TimeBoundaries

  // Expenses by time period (pre-filtered)
  byPeriod: {
    thisMonth: Expense[]
    lastMonth: Expense[]
    last30Days: Expense[]
    last7Days: Expense[]
    prev7Days: Expense[] // 7-14 days ago
    all: Expense[]
  }

  // Category totals by period
  categoryTotals: {
    thisMonth: Record<string, number>
    lastMonth: Record<string, number>
    last30Days: Record<string, number>
  }

  // Daily totals (dateString -> total)
  dailyTotals: Record<string, number>

  // Day of week aggregations [Sun=0, Mon=1, ..., Sat=6]
  dayOfWeek: {
    totals: number[]
    counts: number[]
  }

  // Weekend/weekday by category (last 30 days)
  weekendByCategory: Record<string, CategoryAggregation>
  weekdayByCategory: Record<string, CategoryAggregation>

  // Merchant data (normalized key -> data)
  merchantMap: Map<string, MerchantAggregation>

  // Totals
  totals: {
    all: number
    thisMonth: number
    lastMonth: number
    last30Days: number
    last7Days: number
    prev7Days: number
  }

  // Metadata for cache key generation
  meta: {
    expenseCount: number
    latestDate: string | null
    earliestDate: string | null
  }
}

/**
 * Normalize merchant name for consistent grouping
 */
function normalizeMerchantKey(merchant: string): string {
  return merchant
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Create time boundaries for filtering
 */
function createBoundaries(): TimeBoundaries {
  const now = new Date()
  return {
    now,
    startOfThisMonth: new Date(now.getFullYear(), now.getMonth(), 1),
    startOfLastMonth: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    endOfLastMonth: new Date(now.getFullYear(), now.getMonth(), 0),
    last30Days: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    last7Days: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    last14Days: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
  }
}

/**
 * Preprocess expenses into aggregated data structures
 * Single-pass algorithm for O(n) complexity
 */
export function preprocessExpenses(expenses: Expense[]): PreprocessedData {
  const boundaries = createBoundaries()

  // Initialize data structures
  const byPeriod = {
    thisMonth: [] as Expense[],
    lastMonth: [] as Expense[],
    last30Days: [] as Expense[],
    last7Days: [] as Expense[],
    prev7Days: [] as Expense[],
    all: expenses,
  }

  const categoryTotals = {
    thisMonth: {} as Record<string, number>,
    lastMonth: {} as Record<string, number>,
    last30Days: {} as Record<string, number>,
  }

  const dailyTotals: Record<string, number> = {}

  const dayOfWeek = {
    totals: [0, 0, 0, 0, 0, 0, 0],
    counts: [0, 0, 0, 0, 0, 0, 0],
  }

  const weekendByCategory: Record<string, CategoryAggregation> = {}
  const weekdayByCategory: Record<string, CategoryAggregation> = {}
  const merchantMap = new Map<string, MerchantAggregation>()

  const totals = {
    all: 0,
    thisMonth: 0,
    lastMonth: 0,
    last30Days: 0,
    last7Days: 0,
    prev7Days: 0,
  }

  let latestDate: string | null = null
  let earliestDate: string | null = null

  // Single pass through all expenses
  for (const expense of expenses) {
    const date = new Date(expense.transaction_date)
    const dateStr = date.toDateString()
    const dayOfWeekNum = date.getDay()
    const isWeekend = dayOfWeekNum === 0 || dayOfWeekNum === 6
    const category = expense.category || 'Other'
    const amount = expense.amount
    const merchantKey = normalizeMerchantKey(expense.merchant)

    // Track date range
    if (!latestDate || expense.transaction_date > latestDate) {
      latestDate = expense.transaction_date
    }
    if (!earliestDate || expense.transaction_date < earliestDate) {
      earliestDate = expense.transaction_date
    }

    // Total
    totals.all += amount

    // This month
    if (date >= boundaries.startOfThisMonth) {
      byPeriod.thisMonth.push(expense)
      totals.thisMonth += amount
      categoryTotals.thisMonth[category] = (categoryTotals.thisMonth[category] || 0) + amount
    }

    // Last month
    if (date >= boundaries.startOfLastMonth && date <= boundaries.endOfLastMonth) {
      byPeriod.lastMonth.push(expense)
      totals.lastMonth += amount
      categoryTotals.lastMonth[category] = (categoryTotals.lastMonth[category] || 0) + amount
    }

    // Last 30 days
    if (date >= boundaries.last30Days) {
      byPeriod.last30Days.push(expense)
      totals.last30Days += amount
      categoryTotals.last30Days[category] = (categoryTotals.last30Days[category] || 0) + amount

      // Daily totals (only for last 30 days)
      dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + amount

      // Day of week (only for last 30 days)
      dayOfWeek.totals[dayOfWeekNum] += amount
      dayOfWeek.counts[dayOfWeekNum]++

      // Weekend/weekday by category (only for last 30 days)
      if (isWeekend) {
        if (!weekendByCategory[category]) {
          weekendByCategory[category] = { total: 0, count: 0 }
        }
        weekendByCategory[category].total += amount
        weekendByCategory[category].count++
      } else {
        if (!weekdayByCategory[category]) {
          weekdayByCategory[category] = { total: 0, count: 0 }
        }
        weekdayByCategory[category].total += amount
        weekdayByCategory[category].count++
      }
    }

    // Last 7 days
    if (date >= boundaries.last7Days) {
      byPeriod.last7Days.push(expense)
      totals.last7Days += amount
    }

    // Previous 7 days (7-14 days ago)
    if (date >= boundaries.last14Days && date < boundaries.last7Days) {
      byPeriod.prev7Days.push(expense)
      totals.prev7Days += amount
    }

    // Merchant aggregation
    if (!merchantMap.has(merchantKey)) {
      merchantMap.set(merchantKey, {
        merchant: expense.merchant,
        category,
        total: 0,
        count: 0,
        expenses: [],
        firstDate: date,
        lastDate: date,
      })
    }
    const merchantData = merchantMap.get(merchantKey)!
    merchantData.total += amount
    merchantData.count++
    merchantData.expenses.push(expense)
    if (date < merchantData.firstDate) merchantData.firstDate = date
    if (date > merchantData.lastDate) merchantData.lastDate = date
  }

  return {
    boundaries,
    byPeriod,
    categoryTotals,
    dailyTotals,
    dayOfWeek,
    weekendByCategory,
    weekdayByCategory,
    merchantMap,
    totals,
    meta: {
      expenseCount: expenses.length,
      latestDate,
      earliestDate,
    },
  }
}

/**
 * Generate a stable cache key from preprocessed data metadata
 */
export function generateCacheKey(expenses: Expense[]): string {
  if (expenses.length === 0) return 'empty'

  // Sort to find latest and earliest dates
  const dates = expenses.map((e) => e.transaction_date).sort()
  const earliest = dates[0] || ''
  const latest = dates[dates.length - 1] || ''

  return `${expenses.length}-${latest}-${earliest}`
}
