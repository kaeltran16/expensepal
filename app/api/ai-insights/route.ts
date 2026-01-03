import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api/middleware'
import { llmService } from '@/lib/llm-service'

// Type definitions
interface Expense {
  transaction_date: string
  amount: number
  category: string
  merchant: string
}

interface Budget {
  category: string
  amount: number
}

interface MerchantData {
  merchant: string
  count: number
  total: number
}

interface BudgetComparison {
  category: string
  budget: number
  spent: number
  percentUsed: number
}

interface DataSummary {
  timeframe: string
  totalSpent: number
  lastMonthTotal: number
  percentChange: number
  transactionCount: number
  categoryBreakdown: Record<string, number>
  topMerchants: MerchantData[]
  budgetComparison: BudgetComparison[]
  avgTransactionSize: number
}

interface AIInsight {
  id: string
  type: 'savings' | 'warning' | 'opportunity' | 'pattern'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  action: string
  isAI: boolean
}

interface LLMInsightResponse {
  insights: Array<{
    title: string
    description: string
    type?: 'savings' | 'warning' | 'opportunity' | 'pattern'
    impact?: 'high' | 'medium' | 'low'
    action: string
  }>
}

export const POST = withAuth(async (request, _user) => {
  const { expenses, budgets } = await request.json()

  if (!expenses || expenses.length === 0) {
    return NextResponse.json({
      insights: [],
      message: 'Not enough data for AI insights'
    })
  }

  // Prepare data summary for LLM (don't send raw transactions for privacy)
  const dataSummary = prepareDataSummary(expenses, budgets)

  // Call LLM API
  const aiInsights = await generateAIInsights(dataSummary)

  return NextResponse.json({
    insights: aiInsights,
    generatedAt: new Date().toISOString()
  })
})

/**
 * Prepare anonymized data summary for LLM
 * Don't send raw transactions - just aggregated stats
 */
function prepareDataSummary(expenses: Expense[], budgets: Budget[]): DataSummary {
  const now = new Date()
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  // Current month data
  const currentMonthExpenses = expenses.filter(e =>
    new Date(e.transaction_date) >= currentMonth
  )
  const lastMonthExpenses = expenses.filter(e => {
    const date = new Date(e.transaction_date)
    return date >= lastMonth && date <= lastMonthEnd
  })

  // Category breakdown
  const categoryTotals: Record<string, number> = {}
  currentMonthExpenses.forEach(e => {
    const cat = e.category || 'Other'
    categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount
  })

  // Merchant analysis (top 5)
  const merchantTotals: Record<string, { count: number; total: number }> = {}
  currentMonthExpenses.forEach(e => {
    const merchant = e.merchant
    if (!merchantTotals[merchant]) {
      merchantTotals[merchant] = { count: 0, total: 0 }
    }
    merchantTotals[merchant].count++
    merchantTotals[merchant].total += e.amount
  })
  const topMerchants = Object.entries(merchantTotals)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([merchant, data]) => ({ merchant, ...data }))

  // Budget comparison
  const budgetComparison = budgets.map(b => ({
    category: b.category,
    budget: b.amount,
    spent: categoryTotals[b.category] || 0,
    percentUsed: ((categoryTotals[b.category] || 0) / b.amount) * 100
  }))

  const currentTotal = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
  const lastTotal = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0)

  return {
    timeframe: 'current month',
    totalSpent: currentTotal,
    lastMonthTotal: lastTotal,
    percentChange: lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0,
    transactionCount: currentMonthExpenses.length,
    categoryBreakdown: categoryTotals,
    topMerchants,
    budgetComparison,
    avgTransactionSize: currentTotal / currentMonthExpenses.length,
  }
}

/**
 * Generate AI insights using LLM service
 */
async function generateAIInsights(dataSummary: DataSummary): Promise<AIInsight[]> {
  // Check if LLM service is configured
  if (!llmService.isConfigured()) {
    console.warn('LLM service not configured - skipping AI insights')
    return []
  }

  const systemPrompt = 'You are a helpful financial advisor analyzing spending patterns.'

  const userPrompt = `Based on the following data, provide 2-3 personalized insights and actionable recommendations.

Data Summary:
- Total spent this month: ₫${(dataSummary.totalSpent / 1000).toFixed(0)}k VND
- Last month: ₫${(dataSummary.lastMonthTotal / 1000).toFixed(0)}k VND
- Change: ${dataSummary.percentChange > 0 ? '+' : ''}${dataSummary.percentChange.toFixed(0)}%
- Transactions: ${dataSummary.transactionCount}
- Average transaction: ₫${(dataSummary.avgTransactionSize / 1000).toFixed(0)}k VND

Category Breakdown:
${Object.entries(dataSummary.categoryBreakdown)
  .map(([cat, amt]) => `- ${cat}: ₫${(amt / 1000).toFixed(0)}k VND`)
  .join('\n')}

Top Merchants:
${dataSummary.topMerchants.map((m) =>
  `- ${m.merchant}: ${m.count} visits, ₫${(m.total / 1000).toFixed(0)}k VND`
).join('\n')}

Budget Status:
${dataSummary.budgetComparison.map((b) =>
  `- ${b.category}: ${b.percentUsed.toFixed(0)}% used (₫${(b.spent / 1000).toFixed(0)}k / ₫${(b.budget / 1000).toFixed(0)}k)`
).join('\n')}

Provide insights in JSON format:
{
  "insights": [
    {
      "title": "Brief title",
      "description": "2-3 sentences with specific numbers and actionable advice",
      "type": "savings" | "warning" | "opportunity" | "pattern",
      "impact": "high" | "medium" | "low",
      "action": "Specific action to take"
    }
  ]
}

Focus on:
1. Unusual patterns or trends
2. Opportunities to save money
3. Budget alerts or concerns
4. Positive behavior to reinforce

Be concise, specific, and actionable. Use Vietnamese Dong (₫) in amounts.`

  const response = await llmService.completion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 500,
  })

  if (!response) {
    return []
  }

  const parsed = llmService.parseJSON<LLMInsightResponse>(response.content)

  if (!parsed || !parsed.insights) {
    return []
  }

  return parsed.insights.map((insight): AIInsight => ({
    id: `ai-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    type: insight.type || 'opportunity',
    title: insight.title,
    description: insight.description,
    impact: insight.impact || 'medium',
    action: insight.action,
    isAI: true, // Mark as AI-generated
  }))
}
