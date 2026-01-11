/**
 * Smart Budget Recommendations
 * Analyzes spending patterns and suggests optimal budgets
 * Enhanced with AI-powered insights for deeper analysis
 */

import type { Expense } from '../supabase'
import type { Tables } from '../supabase/database.types'
import { llmService } from '../llm-service'

type Budget = Tables<'budgets'>

export interface BudgetRecommendation {
  category: string
  suggestedAmount: number
  currentAmount?: number
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
  trend: 'increasing' | 'stable' | 'decreasing'
  percentChange?: number
}

export interface SpendingPattern {
  category: string
  monthlyAverage: number
  last3MonthsAverage: number
  currentMonthSpending: number
  isOverBudget: boolean
  percentOfIncome?: number
}

/**
 * Calculate spending by category for a given month
 */
function getMonthlySpending(
  expenses: Expense[],
  month: string
): Map<string, number> {
  const spending = new Map<string, number>()

  expenses.forEach((expense) => {
    const expenseMonth = expense.transaction_date.substring(0, 7) // YYYY-MM
    if (expenseMonth === month) {
      const category = expense.category || 'Other'
      spending.set(category, (spending.get(category) || 0) + expense.amount)
    }
  })

  return spending
}

/**
 * Calculate average monthly spending per category over last N months
 */
function getAverageMonthlySpending(
  expenses: Expense[],
  months: number = 3
): Map<string, number> {
  const categoryMonthlyTotals = new Map<string, number[]>()

  // Group expenses by category and month
  expenses.forEach((expense) => {
    const category = expense.category || 'Other'
    if (!categoryMonthlyTotals.has(category)) {
      categoryMonthlyTotals.set(category, [])
    }
    categoryMonthlyTotals.get(category)!.push(expense.amount)
  })

  // Calculate averages
  const averages = new Map<string, number>()
  categoryMonthlyTotals.forEach((amounts, category) => {
    const sum = amounts.reduce((acc, amt) => acc + amt, 0)
    averages.set(category, sum / months)
  })

  return averages
}

/**
 * Detect spending trend (increasing, stable, decreasing)
 */
function detectTrend(
  currentSpending: number,
  previousAverage: number
): { trend: 'increasing' | 'stable' | 'decreasing'; percentChange: number } {
  if (previousAverage === 0) {
    return { trend: 'stable', percentChange: 0 }
  }

  const percentChange = ((currentSpending - previousAverage) / previousAverage) * 100

  if (percentChange > 10) {
    return { trend: 'increasing', percentChange }
  } else if (percentChange < -10) {
    return { trend: 'decreasing', percentChange }
  }

  return { trend: 'stable', percentChange }
}

/**
 * Generate budget recommendations based on spending history
 */
export function generateBudgetRecommendations(
  expenses: Expense[],
  existingBudgets: Budget[] = []
): BudgetRecommendation[] {
  if (expenses.length === 0) {
    return []
  }

  const recommendations: BudgetRecommendation[] = []
  const now = new Date()
  const currentMonth = now.toISOString().substring(0, 7) // YYYY-MM

  // Get last 3 months of data
  const threeMonthsAgo = new Date(now)
  threeMonthsAgo.setMonth(now.getMonth() - 3)

  const recentExpenses = expenses.filter(
    (e) => new Date(e.transaction_date) >= threeMonthsAgo
  )

  if (recentExpenses.length === 0) {
    return []
  }

  // Calculate averages
  const monthlyAverages = getAverageMonthlySpending(recentExpenses, 3)
  const currentMonthSpending = getMonthlySpending(expenses, currentMonth)

  // Create recommendations for each category
  monthlyAverages.forEach((avgSpending, category) => {
    const existingBudget = existingBudgets.find(
      (b) => b.category === category && b.month === currentMonth
    )

    const currentSpending = currentMonthSpending.get(category) || 0
    const { trend, percentChange } = detectTrend(currentSpending, avgSpending)

    // Calculate suggested amount with adequate buffer for flexibility
    let suggestedAmount = Math.ceil(avgSpending * 1.15) // 15% buffer for stable

    // Adjust based on trend
    if (trend === 'increasing') {
      suggestedAmount = Math.ceil(avgSpending * 1.25) // 25% buffer
    } else if (trend === 'decreasing') {
      suggestedAmount = Math.ceil(avgSpending * 1.10) // 10% buffer
    }

    // Round up to nearest 50,000 VND for cleaner numbers
    suggestedAmount = Math.ceil(suggestedAmount / 50000) * 50000

    // Determine confidence based on data consistency
    let confidence: 'high' | 'medium' | 'low' = 'medium'
    if (recentExpenses.filter((e) => e.category === category).length >= 9) {
      // 3+ expenses per month
      confidence = 'high'
    } else if (
      recentExpenses.filter((e) => e.category === category).length < 3
    ) {
      confidence = 'low'
    }

    // Generate reasoning
    let reasoning = `Based on your last 3 months, you spend an average of ${avgSpending.toLocaleString('vi-VN')} VND on ${category}.`

    if (trend === 'increasing') {
      reasoning += ` Your spending is increasing by ${Math.abs(percentChange).toFixed(0)}%, so we recommend a higher budget.`
    } else if (trend === 'decreasing') {
      reasoning += ` Your spending is decreasing by ${Math.abs(percentChange).toFixed(0)}%, so a lower budget may work.`
    } else {
      reasoning += ` Your spending is stable, so this budget should work well.`
    }

    if (existingBudget && currentSpending > existingBudget.amount) {
      reasoning += ` You're currently ${((currentSpending / existingBudget.amount - 1) * 100).toFixed(0)}% over budget this month.`
    }

    recommendations.push({
      category,
      suggestedAmount,
      currentAmount: existingBudget?.amount,
      reasoning,
      confidence,
      trend,
      percentChange,
    })
  })

  // Sort by spending amount (highest first)
  return recommendations.sort((a, b) => b.suggestedAmount - a.suggestedAmount)
}

/**
 * Get spending patterns for all categories
 */
export function getSpendingPatterns(
  expenses: Expense[],
  budgets: Budget[] = []
): SpendingPattern[] {
  const now = new Date()
  const currentMonth = now.toISOString().substring(0, 7)

  const threeMonthsAgo = new Date(now)
  threeMonthsAgo.setMonth(now.getMonth() - 3)

  const recentExpenses = expenses.filter(
    (e) => new Date(e.transaction_date) >= threeMonthsAgo
  )

  const monthlyAverages = getAverageMonthlySpending(recentExpenses, 3)
  const last3MonthsAverages = getAverageMonthlySpending(expenses, 3)
  const currentMonthSpending = getMonthlySpending(expenses, currentMonth)

  const patterns: SpendingPattern[] = []

  monthlyAverages.forEach((avgSpending, category) => {
    const currentSpending = currentMonthSpending.get(category) || 0
    const last3Avg = last3MonthsAverages.get(category) || avgSpending
    const budget = budgets.find(
      (b) => b.category === category && b.month === currentMonth
    )

    patterns.push({
      category,
      monthlyAverage: avgSpending,
      last3MonthsAverage: last3Avg,
      currentMonthSpending: currentSpending,
      isOverBudget: budget ? currentSpending > budget.amount : false,
    })
  })

  return patterns.sort((a, b) => b.monthlyAverage - a.monthlyAverage)
}

/**
 * Check if user needs budget adjustments for current month
 */
export function needsBudgetAdjustment(
  expenses: Expense[],
  budgets: Budget[]
): {
  needsAdjustment: boolean
  categories: string[]
  reason: string
} {
  const now = new Date()
  const currentMonth = now.toISOString().substring(0, 7)
  const currentMonthSpending = getMonthlySpending(expenses, currentMonth)

  const overBudgetCategories: string[] = []

  currentMonthSpending.forEach((spending, category) => {
    const budget = budgets.find(
      (b) => b.category === category && b.month === currentMonth
    )

    if (budget && spending > budget.amount * 0.9) {
      // 90% threshold
      overBudgetCategories.push(category)
    }
  })

  if (overBudgetCategories.length > 0) {
    return {
      needsAdjustment: true,
      categories: overBudgetCategories,
      reason: `You're approaching or exceeding your budget in ${overBudgetCategories.length} ${overBudgetCategories.length === 1 ? 'category' : 'categories'}.`,
    }
  }

  return {
    needsAdjustment: false,
    categories: [],
    reason: 'Your spending is within budget limits.',
  }
}

// ============================================
// AI-POWERED BUDGET RECOMMENDATIONS
// ============================================

export interface AIBudgetRecommendation extends BudgetRecommendation {
  isAI: boolean
  seasonalFactors?: string
  lifestyleInsights?: string
  savingsOpportunity?: number
}

interface HistoricalSpendingData {
  category: string
  monthlyData: Array<{
    month: string
    spent: number
    transactionCount: number
  }>
  last6MonthsAverage: number
  last12MonthsAverage: number
  variance: number
  seasonality: string
  topMerchants: Array<{ name: string; total: number }>
}

/**
 * Prepare comprehensive historical data for AI analysis
 */
function prepareHistoricalData(expenses: Expense[], months: number = 12): HistoricalSpendingData[] {
  const now = new Date()
  const startDate = new Date(now)
  startDate.setMonth(now.getMonth() - months)

  const relevantExpenses = expenses.filter(
    (e) => new Date(e.transaction_date) >= startDate
  )

  // Group by category
  const categoryMap = new Map<string, Expense[]>()
  relevantExpenses.forEach((expense) => {
    const category = expense.category || 'Other'
    if (!categoryMap.has(category)) {
      categoryMap.set(category, [])
    }
    categoryMap.get(category)!.push(expense)
  })

  const historicalData: HistoricalSpendingData[] = []

  categoryMap.forEach((categoryExpenses, category) => {
    // Calculate monthly breakdown
    const monthlyMap = new Map<string, { spent: number; count: number }>()

    categoryExpenses.forEach((expense) => {
      const month = expense.transaction_date.substring(0, 7) // YYYY-MM
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { spent: 0, count: 0 })
      }
      const data = monthlyMap.get(month)!
      data.spent += expense.amount
      data.count += 1
    })

    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        spent: data.spent,
        transactionCount: data.count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Calculate averages
    const last6Months = monthlyData.slice(-6)
    const last12Months = monthlyData.slice(-12)

    const last6MonthsAverage = last6Months.length > 0
      ? last6Months.reduce((sum, m) => sum + m.spent, 0) / last6Months.length
      : 0

    const last12MonthsAverage = last12Months.length > 0
      ? last12Months.reduce((sum, m) => sum + m.spent, 0) / last12Months.length
      : 0

    // Calculate variance (measure of consistency)
    const mean = last6MonthsAverage
    const variance = last6Months.length > 0
      ? Math.sqrt(
          last6Months.reduce((sum, m) => sum + Math.pow(m.spent - mean, 2), 0) /
            last6Months.length
        )
      : 0

    // Detect seasonality
    let seasonality = 'stable'
    if (monthlyData.length >= 6) {
      const recentTrend = last6Months.slice(-3).reduce((sum, m) => sum + m.spent, 0) / 3
      const olderTrend = last6Months.slice(0, 3).reduce((sum, m) => sum + m.spent, 0) / 3

      if (recentTrend > olderTrend * 1.2) seasonality = 'increasing'
      else if (recentTrend < olderTrend * 0.8) seasonality = 'decreasing'
    }

    // Top merchants
    const merchantTotals = new Map<string, number>()
    categoryExpenses.forEach((expense) => {
      const merchant = expense.merchant || 'Unknown'
      merchantTotals.set(merchant, (merchantTotals.get(merchant) || 0) + expense.amount)
    })

    const topMerchants = Array.from(merchantTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({ name, total }))

    historicalData.push({
      category,
      monthlyData,
      last6MonthsAverage,
      last12MonthsAverage,
      variance,
      seasonality,
      topMerchants,
    })
  })

  return historicalData.sort((a, b) => b.last6MonthsAverage - a.last6MonthsAverage)
}

/**
 * Generate AI-powered budget recommendations
 * Uses LLM to analyze deep patterns and provide personalized advice
 */
export async function generateAIBudgetRecommendations(
  expenses: Expense[],
  existingBudgets: Budget[] = [],
  options?: {
    monthsOfHistory?: number
    includeBasicRecommendations?: boolean
  }
): Promise<AIBudgetRecommendation[]> {
  const monthsOfHistory = options?.monthsOfHistory || 12
  const includeBasic = options?.includeBasicRecommendations ?? true

  // Get basic algorithmic recommendations first
  const basicRecommendations = includeBasic
    ? generateBudgetRecommendations(expenses, existingBudgets)
    : []

  // Check if LLM is configured
  if (!llmService.isConfigured() || expenses.length < 10) {
    // Return basic recommendations without AI enhancement
    return basicRecommendations.map((rec) => ({
      ...rec,
      isAI: false,
    }))
  }

  // Prepare historical data
  const historicalData = prepareHistoricalData(expenses, monthsOfHistory)

  if (historicalData.length === 0) {
    return basicRecommendations.map((rec) => ({ ...rec, isAI: false }))
  }

  // Prepare data summary for LLM
  const dataSummary = historicalData.map((data) => ({
    category: data.category,
    last6MonthsAverage: Math.round(data.last6MonthsAverage),
    last12MonthsAverage: Math.round(data.last12MonthsAverage),
    trend: data.seasonality,
    consistency: data.variance < data.last6MonthsAverage * 0.3 ? 'consistent' : 'variable',
    topMerchants: data.topMerchants.slice(0, 3).map((m) => m.name),
    currentBudget: existingBudgets.find((b) => b.category === data.category)?.amount,
  }))

  const systemPrompt = `You are a financial advisor specializing in budget planning. Analyze spending patterns and provide personalized budget recommendations.`

  const userPrompt = `Based on the following historical spending data, provide smart budget recommendations for each category.

Historical Data (${monthsOfHistory} months):
${JSON.stringify(dataSummary, null, 2)}

For each category, recommend:
1. An optimal monthly budget amount (in VND)
2. Detailed reasoning including seasonal factors, lifestyle insights
3. Confidence level (high/medium/low)
4. Potential savings opportunities

CRITICAL - Budget Calculation Rules:
- Use the HIGHER of last6MonthsAverage or last12MonthsAverage as the baseline
- For STABLE spending: add 15-20% buffer above the baseline
- For INCREASING trends: add 25-30% buffer above the baseline
- For DECREASING trends: add 10-15% buffer above the baseline
- For VARIABLE (inconsistent) spending: add 25-35% buffer to handle fluctuations
- The suggestedAmount must NEVER be below the baseline average
- Round up to the nearest 50,000 VND for cleaner numbers

Also consider:
- Spending trends and seasonality
- Consistency vs. variability
- Common merchants (patterns)
- Budget best practices (50/30/20 rule for essential/lifestyle/savings)

Respond in JSON format:
{
  "recommendations": [
    {
      "category": "Category name",
      "suggestedAmount": 1000000,
      "reasoning": "Detailed explanation",
      "confidence": "high" | "medium" | "low",
      "trend": "increasing" | "stable" | "decreasing",
      "seasonalFactors": "Any seasonal considerations",
      "lifestyleInsights": "Lifestyle patterns observed",
      "savingsOpportunity": 50000
    }
  ]
}

Be specific with VND amounts and provide actionable advice.`

  try {
    const response = await llmService.completion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 1500,
    })

    if (!response) {
      return basicRecommendations.map((rec) => ({ ...rec, isAI: false }))
    }

    const parsed = llmService.parseJSON<{
      recommendations: Array<{
        category: string
        suggestedAmount: number
        reasoning: string
        confidence: 'high' | 'medium' | 'low'
        trend: 'increasing' | 'stable' | 'decreasing'
        seasonalFactors?: string
        lifestyleInsights?: string
        savingsOpportunity?: number
      }>
    }>(response.content)

    if (!parsed || !parsed.recommendations) {
      return basicRecommendations.map((rec) => ({ ...rec, isAI: false }))
    }

    // Merge AI recommendations with historical data and validate minimum buffers
    const aiRecommendations: AIBudgetRecommendation[] = parsed.recommendations.map((rec) => {
      const existingBudget = existingBudgets.find((b) => b.category === rec.category)
      const histData = historicalData.find((h) => h.category === rec.category)

      // Use the higher of 6-month or 12-month average as baseline
      const baseline = histData
        ? Math.max(histData.last6MonthsAverage, histData.last12MonthsAverage)
        : 0

      // Determine minimum buffer based on trend and consistency
      let minBufferPercent = 0.15 // Default 15% for stable
      if (rec.trend === 'increasing') {
        minBufferPercent = 0.25
      } else if (rec.trend === 'decreasing') {
        minBufferPercent = 0.10
      }
      // Add extra buffer for variable spending
      if (histData && histData.variance > histData.last6MonthsAverage * 0.3) {
        minBufferPercent += 0.10
      }

      // Calculate minimum acceptable budget
      const minBudget = Math.ceil((baseline * (1 + minBufferPercent)) / 50000) * 50000

      // Use the higher of LLM suggestion or minimum budget
      const suggestedAmount = Math.max(rec.suggestedAmount, minBudget)

      const percentChange = baseline > 0
        ? ((suggestedAmount - baseline) / baseline) * 100
        : 0

      return {
        category: rec.category,
        suggestedAmount,
        currentAmount: existingBudget?.amount,
        reasoning: rec.reasoning,
        confidence: rec.confidence,
        trend: rec.trend,
        percentChange,
        isAI: true,
        seasonalFactors: rec.seasonalFactors,
        lifestyleInsights: rec.lifestyleInsights,
        savingsOpportunity: rec.savingsOpportunity,
      }
    })

    return aiRecommendations.sort((a, b) => b.suggestedAmount - a.suggestedAmount)
  } catch (error) {
    console.error('Error generating AI budget recommendations:', error)
    // Fallback to basic recommendations
    return basicRecommendations.map((rec) => ({ ...rec, isAI: false }))
  }
}
