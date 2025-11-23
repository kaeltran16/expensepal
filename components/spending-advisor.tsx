'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useBudgets } from '@/lib/hooks'
import type { Expense } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ChevronRight,
  Lightbulb,
  Sparkles,
  Target,
  TrendingUp
} from 'lucide-react'
import { useMemo, useState } from 'react'

interface Recommendation {
  id: string
  type: 'savings' | 'warning' | 'optimization' | 'goal'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  action?: string
  amount?: number
}

interface SpendingAdvisorProps {
  expenses: Expense[]
}

export function SpendingAdvisor({ expenses }: SpendingAdvisorProps) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: budgets = [] } = useBudgets({ month: currentMonth })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const recommendations: Recommendation[] = useMemo(() => {
    if (expenses.length === 0) return []

    const recs: Recommendation[] = []
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    // Current month expenses
    const currentMonthExpenses = expenses.filter((e) => {
      const date = new Date(e.transaction_date)
      return date >= currentMonthStart
    })

    // Last month expenses
    const lastMonthExpenses = expenses.filter((e) => {
      const date = new Date(e.transaction_date)
      return date >= lastMonthStart && date <= lastMonthEnd
    })

    // Category analysis
    const categoryTotals: Record<string, { current: number; last: number }> = {}

    currentMonthExpenses.forEach((e) => {
      if (!categoryTotals[e.category || 'Other']) {
        categoryTotals[e.category || 'Other'] = { current: 0, last: 0 }
      }
      categoryTotals[e.category || 'Other'].current += e.amount
    })

    lastMonthExpenses.forEach((e) => {
      if (!categoryTotals[e.category || 'Other']) {
        categoryTotals[e.category || 'Other'] = { current: 0, last: 0 }
      }
      categoryTotals[e.category || 'Other'].last += e.amount
    })

    // 1. Detect unusual spending spikes
    Object.entries(categoryTotals).forEach(([category, totals]) => {
      if (totals.last > 0) {
        const increase = ((totals.current - totals.last) / totals.last) * 100
        if (increase > 30) {
          recs.push({
            id: `spike-${category}`,
            type: 'warning',
            title: `${category} spending increased by ${increase.toFixed(0)}%`,
            description: `You spent ${formatCurrency(totals.current, 'VND')} this month vs ${formatCurrency(totals.last, 'VND')} last month. Consider reviewing your ${category.toLowerCase()} expenses.`,
            impact: increase > 50 ? 'high' : 'medium',
            amount: totals.current - totals.last,
          })
        }
      }
    })

    // 2. Savings opportunities from reduced categories
    Object.entries(categoryTotals).forEach(([category, totals]) => {
      if (totals.last > 0) {
        const decrease = ((totals.last - totals.current) / totals.last) * 100
        if (decrease > 20) {
          recs.push({
            id: `savings-${category}`,
            type: 'savings',
            title: `Great job reducing ${category} spending!`,
            description: `You've saved ${formatCurrency(totals.last - totals.current, 'VND')} compared to last month. Keep it up!`,
            impact: 'high',
            amount: totals.last - totals.current,
            action: 'Maintain this trend',
          })
        }
      }
    })

    // 3. Budget optimization suggestions
    budgets.forEach((budget) => {
      const spent = categoryTotals[budget.category]?.current || 0
      const percentage = (spent / budget.amount) * 100

      if (percentage < 50) {
        recs.push({
          id: `budget-${budget.category}`,
          type: 'optimization',
          title: `${budget.category} budget underutilized`,
          description: `You've only used ${percentage.toFixed(0)}% of your ${budget.category} budget. Consider reallocating to categories you use more.`,
          impact: 'low',
          action: 'Adjust budget',
        })
      }
    })

    // 4. Recurring expense patterns
    const merchantFrequency: Record<string, number> = {}
    currentMonthExpenses.forEach((e) => {
      merchantFrequency[e.merchant] = (merchantFrequency[e.merchant] || 0) + 1
    })

    const frequentMerchants = Object.entries(merchantFrequency)
      .filter(([_, count]) => count >= 5)
      .sort((a, b) => b[1] - a[1])

    if (frequentMerchants.length > 0) {
      const [merchant, count] = frequentMerchants[0]
      const merchantTotal = currentMonthExpenses
        .filter((e) => e.merchant === merchant)
        .reduce((sum, e) => sum + e.amount, 0)

      recs.push({
        id: `frequent-${merchant}`,
        type: 'optimization',
        title: `Frequent purchases at ${merchant}`,
        description: `You've made ${count} transactions totaling ${formatCurrency(merchantTotal, 'VND')} this month. Consider bulk purchasing or finding alternatives to save.`,
        impact: 'medium',
        amount: merchantTotal,
      })
    }

    // 5. Daily spending goal
    const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daysElapsed = now.getDate()
    const daysRemaining = daysInMonth - daysElapsed
    const avgDailySpent = currentMonthTotal / daysElapsed
    const projectedMonthTotal = avgDailySpent * daysInMonth

    if (daysRemaining > 0 && lastMonthExpenses.length > 0) {
      const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
      const projectedIncrease = ((projectedMonthTotal - lastMonthTotal) / lastMonthTotal) * 100

      if (projectedIncrease > 10) {
        const suggestedDailyLimit = lastMonthTotal / daysInMonth
        recs.push({
          id: 'daily-goal',
          type: 'goal',
          title: 'Set a daily spending limit',
          description: `At your current pace, you'll spend ${formatCurrency(projectedMonthTotal, 'VND')} this month (${projectedIncrease.toFixed(0)}% more than last month). Try limiting daily spending to ${formatCurrency(suggestedDailyLimit, 'VND')}.`,
          impact: 'high',
          action: 'Set daily goal',
        })
      }
    }

    // Sort by impact
    const impactOrder = { high: 0, medium: 1, low: 2 }
    return recs.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]).slice(0, 6)
  }, [expenses, budgets])

  if (recommendations.length === 0) {
    return (
      <Card className="frosted-card">
        <CardContent className="p-8 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="font-semibold mb-2">No recommendations yet</h3>
          <p className="text-sm text-muted-foreground">
            Keep tracking your expenses to get personalized insights and recommendations.
          </p>
        </CardContent>
      </Card>
    )
  }

  const getIcon = (type: Recommendation['type']) => {
    switch (type) {
      case 'savings':
        return TrendingUp
      case 'warning':
        return AlertTriangle
      case 'optimization':
        return Lightbulb
      case 'goal':
        return Target
      default:
        return Lightbulb
    }
  }

  const getColor = (type: Recommendation['type']) => {
    switch (type) {
      case 'savings':
        return {
          bg: 'bg-green-50 dark:bg-green-950/20',
          border: 'border-l-green-500',
          text: 'text-green-600 dark:text-green-400',
          badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
        }
      case 'warning':
        return {
          bg: 'bg-red-50 dark:bg-red-950/20',
          border: 'border-l-red-500',
          text: 'text-red-600 dark:text-red-400',
          badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        }
      case 'optimization':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/20',
          border: 'border-l-blue-500',
          text: 'text-blue-600 dark:text-blue-400',
          badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
        }
      case 'goal':
        return {
          bg: 'bg-purple-50 dark:bg-purple-950/20',
          border: 'border-l-purple-500',
          text: 'text-purple-600 dark:text-purple-400',
          badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
        }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-base">AI Recommendations</h2>
        <Badge variant="secondary" className="text-xs">
          {recommendations.length}
        </Badge>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec, index) => {
          const Icon = getIcon(rec.type)
          const colors = getColor(rec.type)
          const isExpanded = expandedId === rec.id

          return (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.05,
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              <Card className={`frosted-card border-l-4 ${colors.border} ${colors.bg} cursor-pointer`}
                onClick={() => setExpandedId(isExpanded ? null : rec.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10 flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-sm leading-tight">
                          {rec.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`text-xs ${colors.badge} border-0`}>
                            {rec.impact}
                          </Badge>
                          <ChevronRight
                            className={`w-4 h-4 text-muted-foreground transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <p className="text-sm text-muted-foreground mb-3">
                              {rec.description}
                            </p>
                            {rec.action && (
                              <Button size="sm" variant="outline" className="h-8 text-xs">
                                {rec.action}
                              </Button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {!isExpanded && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {rec.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
