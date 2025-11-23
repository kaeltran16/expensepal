'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Lightbulb,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import type { Expense } from '@/lib/supabase'

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍔',
  Transport: '🚗',
  Shopping: '🛍️',
  Entertainment: '🎬',
  Bills: '💡',
  Health: '🏥',
  Other: '📦',
}

interface CategoryInsightsProps {
  expenses: Expense[]
}

interface Insight {
  type: 'trend' | 'pattern' | 'alert' | 'tip'
  category?: string
  title: string
  description: string
  value?: string
  change?: number
  icon: any
}

export function CategoryInsights({ expenses }: CategoryInsightsProps) {
  const insights = useMemo(() => {
    const results: Insight[] = []
    const now = new Date()

    // Date ranges
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Filter expenses
    const thisMonthExpenses = expenses.filter((e) => new Date(e.transaction_date) >= startOfThisMonth)
    const lastMonthExpenses = expenses.filter(
      (e) => new Date(e.transaction_date) >= startOfLastMonth && new Date(e.transaction_date) <= endOfLastMonth
    )
    const last30DaysExpenses = expenses.filter((e) => new Date(e.transaction_date) >= last30Days)

    // 1. Month-over-month category trends
    const thisMonthByCategory: Record<string, number> = {}
    const lastMonthByCategory: Record<string, number> = {}

    thisMonthExpenses.forEach((e) => {
      const cat = e.category || 'Other'
      thisMonthByCategory[cat] = (thisMonthByCategory[cat] || 0) + e.amount
    })

    lastMonthExpenses.forEach((e) => {
      const cat = e.category || 'Other'
      lastMonthByCategory[cat] = (lastMonthByCategory[cat] || 0) + e.amount
    })

    // Find significant changes (>25%)
    Object.keys(thisMonthByCategory).forEach((category) => {
      const thisMonth = thisMonthByCategory[category]
      const lastMonth = lastMonthByCategory[category] || 0

      if (lastMonth > 0) {
        const change = ((thisMonth - lastMonth) / lastMonth) * 100

        if (Math.abs(change) > 25) {
          results.push({
            type: 'trend',
            category,
            title: `${category} ${change > 0 ? 'increased' : 'decreased'}`,
            description: `${Math.abs(change).toFixed(0)}% ${change > 0 ? 'more' : 'less'} than last month`,
            value: formatCurrency(thisMonth, 'VND'),
            change,
            icon: change > 0 ? TrendingUp : TrendingDown,
          })
        }
      } else if (thisMonth > 100000) {
        // New category with significant spending
        results.push({
          type: 'alert',
          category,
          title: `New spending in ${category}`,
          description: 'This is a new category for you this month',
          value: formatCurrency(thisMonth, 'VND'),
          icon: AlertCircle,
        })
      }
    })

    // 2. Weekend vs weekday patterns
    const weekdayByCategory: Record<string, number> = {}
    const weekendByCategory: Record<string, number> = {}
    const weekdayCount: Record<string, number> = {}
    const weekendCount: Record<string, number> = {}

    last30DaysExpenses.forEach((e) => {
      const date = new Date(e.transaction_date)
      const day = date.getDay()
      const isWeekend = day === 0 || day === 6
      const cat = e.category || 'Other'

      if (isWeekend) {
        weekendByCategory[cat] = (weekendByCategory[cat] || 0) + e.amount
        weekendCount[cat] = (weekendCount[cat] || 0) + 1
      } else {
        weekdayByCategory[cat] = (weekdayByCategory[cat] || 0) + e.amount
        weekdayCount[cat] = (weekdayCount[cat] || 0) + 1
      }
    })

    // Find weekend spending patterns
    Object.keys(weekendByCategory).forEach((category) => {
      const weekendTotal = weekendByCategory[category]
      const weekdayTotal = weekdayByCategory[category] || 0

      if (weekdayTotal > 0) {
        const weekendAvg = weekendTotal / (weekendCount[category] || 1)
        const weekdayAvg = weekdayTotal / (weekdayCount[category] || 1)
        const diff = ((weekendAvg - weekdayAvg) / weekdayAvg) * 100

        if (diff > 30) {
          results.push({
            type: 'pattern',
            category,
            title: `You spend more on ${category} on weekends`,
            description: `${diff.toFixed(0)}% higher average per day`,
            value: formatCurrency(weekendAvg, 'VND') + ' avg',
            icon: Calendar,
          })
        } else if (diff < -30) {
          results.push({
            type: 'pattern',
            category,
            title: `You spend more on ${category} on weekdays`,
            description: `${Math.abs(diff).toFixed(0)}% higher average per day`,
            value: formatCurrency(weekdayAvg, 'VND') + ' avg',
            icon: Calendar,
          })
        }
      }
    })

    // 3. Top spending category with tips
    const categoryTotals: Record<string, number> = {}
    last30DaysExpenses.forEach((e) => {
      const cat = e.category || 'Other'
      categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount
    })

    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]

    if (topCategory) {
      const [category, amount] = topCategory
      const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0)
      const percentage = (amount / total) * 100

      if (percentage > 40) {
        const tips: Record<string, string> = {
          Food: 'Try meal prepping to reduce dining out costs',
          Transport: 'Consider carpooling or public transit alternatives',
          Shopping: 'Create a wishlist and wait 48 hours before purchasing',
          Entertainment: 'Look for free events or use subscription services more',
          Bills: 'Review recurring subscriptions and cancel unused ones',
          Health: 'Check if your insurance covers more services',
          Other: 'Categorize expenses better to track spending patterns',
        }

        results.push({
          type: 'tip',
          category,
          title: `${category} is ${percentage.toFixed(0)}% of spending`,
          description: tips[category] || 'Consider setting a budget for this category',
          value: formatCurrency(amount, 'VND'),
          icon: Lightbulb,
        })
      }
    }

    // 4. Unusual spending spikes
    const dailyTotals: Record<string, number> = {}
    last30DaysExpenses.forEach((e) => {
      const dateStr = new Date(e.transaction_date).toDateString()
      dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + e.amount
    })

    const dailyAmounts = Object.values(dailyTotals)
    if (dailyAmounts.length > 7) {
      const avgDaily = dailyAmounts.reduce((sum, val) => sum + val, 0) / dailyAmounts.length
      const maxDaily = Math.max(...dailyAmounts)

      if (maxDaily > avgDaily * 2.5) {
        results.push({
          type: 'alert',
          title: 'Unusual spending spike detected',
          description: `One day was ${((maxDaily / avgDaily - 1) * 100).toFixed(0)}% above your daily average`,
          value: formatCurrency(maxDaily, 'VND'),
          icon: AlertCircle,
        })
      }
    }

    // 5. Spending velocity
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

    if (prev7DaysTotal > 0) {
      const velocityChange = ((last7DaysTotal - prev7DaysTotal) / prev7DaysTotal) * 100

      if (Math.abs(velocityChange) > 30) {
        results.push({
          type: velocityChange > 0 ? 'alert' : 'tip',
          title: `Spending is ${velocityChange > 0 ? 'accelerating' : 'slowing down'}`,
          description: `${Math.abs(velocityChange).toFixed(0)}% ${velocityChange > 0 ? 'more' : 'less'} than last week`,
          value: formatCurrency(last7DaysTotal, 'VND'),
          change: velocityChange,
          icon: velocityChange > 0 ? TrendingUp : TrendingDown,
        })
      }
    }

    return results
  }, [expenses])

  const getInsightColor = (type: string, change?: number) => {
    if (type === 'alert') return 'border-l-destructive bg-destructive/5'
    if (type === 'tip') return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20'
    if (type === 'pattern') return 'border-l-purple-500 bg-purple-50 dark:bg-purple-950/20'
    if (change !== undefined) {
      return change > 0
        ? 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20'
        : 'border-l-green-500 bg-green-50 dark:bg-green-950/20'
    }
    return 'border-l-primary bg-primary/5'
  }

  const getIconColor = (type: string, change?: number) => {
    if (type === 'alert') return 'text-destructive'
    if (type === 'tip') return 'text-blue-500'
    if (type === 'pattern') return 'text-purple-500'
    if (change !== undefined) {
      return change > 0 ? 'text-orange-500' : 'text-green-500'
    }
    return 'text-primary'
  }

  if (insights.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Not enough data yet</h3>
        <p className="text-muted-foreground text-sm">
          Keep tracking expenses for a few weeks to see personalized insights
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Lightbulb className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Insights</h2>
          <p className="text-sm text-muted-foreground">Personalized spending patterns</p>
        </div>
      </div>

      {insights.map((insight, index) => {
        const Icon = insight.icon
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`p-4 border-l-4 ${getInsightColor(insight.type, insight.change)}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-background/50 ${getIconColor(insight.type, insight.change)}`}>
                  {insight.category && (
                    <span className="text-xl mr-1">{CATEGORY_EMOJI[insight.category] || '📦'}</span>
                  )}
                  <Icon className="h-5 w-5 inline" />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1">{insight.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>

                  {insight.value && (
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold">{insight.value}</p>
                      {insight.change !== undefined && (
                        <div className="flex items-center gap-1">
                          {insight.change > 0 ? (
                            <ArrowUpRight className="h-4 w-4 text-orange-500" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-green-500" />
                          )}
                          <span
                            className={`text-sm font-medium ${
                              insight.change > 0 ? 'text-orange-500' : 'text-green-500'
                            }`}
                          >
                            {Math.abs(insight.change).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
