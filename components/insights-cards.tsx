'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { Expense } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Award, Calendar, DollarSign, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'

interface InsightsCardsProps {
  expenses: Expense[]
}

interface Insight {
  title: string
  value: string
  subtitle: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color: string
  bgColor: string
}

export function InsightsCards({ expenses }: InsightsCardsProps) {
  const insights: Insight[] = useMemo(() => {
    if (expenses.length === 0) return []

    const now = new Date()
    const currentWeekStart = new Date(now)
    currentWeekStart.setDate(now.getDate() - now.getDay())
    currentWeekStart.setHours(0, 0, 0, 0)

    const lastWeekStart = new Date(currentWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    // Weekly calculations
    const currentWeekExpenses = expenses.filter((e) => {
      const date = new Date(e.transaction_date)
      return date >= currentWeekStart
    })
    const lastWeekExpenses = expenses.filter((e) => {
      const date = new Date(e.transaction_date)
      return date >= lastWeekStart && date < currentWeekStart
    })

    const currentWeekTotal = currentWeekExpenses.reduce((sum, e) => sum + e.amount, 0)
    const lastWeekTotal = lastWeekExpenses.reduce((sum, e) => sum + e.amount, 0)
    const weeklyChange = lastWeekTotal > 0 ? ((currentWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0

    // Monthly calculations
    const currentMonthExpenses = expenses.filter((e) => {
      const date = new Date(e.transaction_date)
      return date >= currentMonthStart
    })
    const lastMonthExpenses = expenses.filter((e) => {
      const date = new Date(e.transaction_date)
      return date >= lastMonthStart && date <= lastMonthEnd
    })

    const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
    const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
    const monthlyChange = lastMonthTotal > 0 ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0

    // Average daily spending (this month)
    const daysInMonth = Math.max(1, now.getDate())
    const avgDailySpending = currentMonthTotal / daysInMonth

    // Most expensive category this month
    const categoryTotals: Record<string, number> = {}
    currentMonthExpenses.forEach((e) => {
      categoryTotals[e.category || 'Other'] = (categoryTotals[e.category || 'Other'] || 0) + e.amount
    })
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]

    const insightsList: Insight[] = []

    // Weekly insight
    insightsList.push({
      title: 'This Week',
      value: formatCurrency(currentWeekTotal, 'VND'),
      subtitle: currentWeekExpenses.length + ' transactions',
      icon: Calendar,
      trend: weeklyChange > 5 ? 'up' : weeklyChange < -5 ? 'down' : 'neutral',
      trendValue: `${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(0)}% vs last week`,
      color: weeklyChange > 5 ? 'text-red-600 dark:text-red-400' : weeklyChange < -5 ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400',
      bgColor: weeklyChange > 5 ? 'bg-red-50 dark:bg-red-950/20' : weeklyChange < -5 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-blue-50 dark:bg-blue-950/20',
    })

    // Monthly insight
    insightsList.push({
      title: 'This Month',
      value: formatCurrency(currentMonthTotal, 'VND'),
      subtitle: currentMonthExpenses.length + ' transactions',
      icon: DollarSign,
      trend: monthlyChange > 5 ? 'up' : monthlyChange < -5 ? 'down' : 'neutral',
      trendValue: `${monthlyChange > 0 ? '+' : ''}${monthlyChange.toFixed(0)}% vs last month`,
      color: monthlyChange > 5 ? 'text-red-600 dark:text-red-400' : monthlyChange < -5 ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400',
      bgColor: monthlyChange > 5 ? 'bg-red-50 dark:bg-red-950/20' : monthlyChange < -5 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-blue-50 dark:bg-blue-950/20',
    })

    // Daily average
    insightsList.push({
      title: 'Daily Average',
      value: formatCurrency(avgDailySpending, 'VND'),
      subtitle: 'Based on this month',
      icon: TrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    })

    // Top category
    if (topCategory) {
      insightsList.push({
        title: 'Top Category',
        value: topCategory[0],
        subtitle: formatCurrency(topCategory[1], 'VND'),
        icon: Award,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      })
    }

    return insightsList
  }, [expenses])

  if (insights.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {insights.map((insight, index) => {
          const Icon = insight.icon
          const TrendIcon = insight.trend === 'up' ? TrendingUp : insight.trend === 'down' ? TrendingDown : null

          return (
            <motion.div
              key={insight.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.05,
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              }}
            >
              <Card className={`frosted-card ${insight.bgColor} border-0 h-full`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-full ${insight.bgColor} flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10`}>
                      <Icon className={`w-5 h-5 ${insight.color}`} />
                    </div>
                    {TrendIcon && (
                      <TrendIcon className={`w-4 h-4 ${insight.color}`} />
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">
                      {insight.title}
                    </p>
                    <h3 className={`text-lg font-bold ${insight.color} leading-tight mb-1 truncate`}>
                      {insight.value}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {insight.subtitle}
                    </p>
                    {insight.trendValue && (
                      <p className={`text-xs ${insight.color} mt-1.5 font-medium`}>
                        {insight.trendValue}
                      </p>
                    )}
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
