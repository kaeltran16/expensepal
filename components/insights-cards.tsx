'use client'

import { Card, CardContent } from '@/components/ui/card'
import type { Expense } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { AnimatedCounter } from '@/components/animated-counter'
import { springs, stagger } from '@/lib/animation-config'
import { motion } from 'framer-motion'
import {
  Award,
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'
import { useMemo } from 'react'

interface InsightsCardsProps {
  expenses: Expense[]
}

interface Insight {
  title: string
  value: number
  formattedValue: string
  subtitle: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  trendPercent?: number
  color: string
  bgColor: string
  ringColor: string
  gradientFrom: string
  gradientTo: string
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
      value: currentWeekTotal,
      formattedValue: formatCurrency(currentWeekTotal, 'VND'),
      subtitle: currentWeekExpenses.length + ' transactions',
      icon: Calendar,
      trend: weeklyChange > 5 ? 'up' : weeklyChange < -5 ? 'down' : 'neutral',
      trendValue: `${weeklyChange > 0 ? '+' : ''}${weeklyChange.toFixed(0)}%`,
      trendPercent: weeklyChange,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      ringColor: 'ring-blue-500/20',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-cyan-500',
    })

    // Monthly insight
    insightsList.push({
      title: 'This Month',
      value: currentMonthTotal,
      formattedValue: formatCurrency(currentMonthTotal, 'VND'),
      subtitle: currentMonthExpenses.length + ' transactions',
      icon: DollarSign,
      trend: monthlyChange > 5 ? 'up' : monthlyChange < -5 ? 'down' : 'neutral',
      trendValue: `${monthlyChange > 0 ? '+' : ''}${monthlyChange.toFixed(0)}%`,
      trendPercent: monthlyChange,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      ringColor: 'ring-emerald-500/20',
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-teal-500',
    })

    // Daily average
    insightsList.push({
      title: 'Daily Average',
      value: avgDailySpending,
      formattedValue: formatCurrency(avgDailySpending, 'VND'),
      subtitle: 'Based on this month',
      icon: Zap,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      ringColor: 'ring-purple-500/20',
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-pink-500',
    })

    // Top category
    if (topCategory) {
      insightsList.push({
        title: 'Top Category',
        value: topCategory[1],
        formattedValue: topCategory[0],
        subtitle: formatCurrency(topCategory[1], 'VND'),
        icon: Award,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950/30',
        ringColor: 'ring-orange-500/20',
        gradientFrom: 'from-orange-500',
        gradientTo: 'to-amber-500',
      })
    }

    return insightsList
  }, [expenses])

  if (insights.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {insights.map((insight, index) => (
          <InsightCard key={insight.title} insight={insight} index={index} />
        ))}
      </div>
    </div>
  )
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const Icon = insight.icon
  const TrendIcon =
    insight.trend === 'up' ? ArrowUpRight : insight.trend === 'down' ? ArrowDownRight : null

  const trendColor =
    insight.trend === 'up'
      ? 'text-red-500 bg-red-50 dark:bg-red-900/30'
      : insight.trend === 'down'
        ? 'text-green-500 bg-green-50 dark:bg-green-900/30'
        : 'text-muted-foreground bg-muted'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * stagger.normal,
        ...springs.default,
      }}
    >
      <Card className="relative overflow-hidden border-0 shadow-sm h-full">
        {/* Gradient accent bar */}
        <motion.div
          className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${insight.gradientFrom} ${insight.gradientTo}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: index * stagger.normal + 0.2, duration: 0.5 }}
          style={{ transformOrigin: 'left' }}
        />

        {/* Background pattern */}
        <div className={`absolute inset-0 ${insight.bgColor} opacity-50`} />
        <motion.div
          className={`absolute -right-8 -top-8 w-24 h-24 rounded-full ${insight.bgColor}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * stagger.normal + 0.1, ...springs.bouncy }}
        />

        <CardContent className="relative p-4">
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <motion.div
              className={`w-10 h-10 rounded-xl ${insight.bgColor} flex items-center justify-center ring-1 ${insight.ringColor}`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Icon className={`w-5 h-5 ${insight.color}`} />
            </motion.div>

            {/* Trend badge */}
            {TrendIcon && insight.trendValue && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * stagger.normal + 0.3 }}
                className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-semibold ${trendColor}`}
              >
                <TrendIcon className="w-3 h-3" />
                <span>{insight.trendValue}</span>
              </motion.div>
            )}
          </div>

          {/* Content */}
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">{insight.title}</p>

            {/* Main value with animation */}
            {insight.title !== 'Top Category' ? (
              <div className="mb-1">
                <span className={`text-xl font-bold ${insight.color}`}>
                  <AnimatedCounter
                    value={insight.value}
                    duration={1000}
                    prefix="₫"
                  />
                </span>
              </div>
            ) : (
              <h3 className={`text-xl font-bold ${insight.color} leading-tight mb-1 truncate`}>
                {insight.formattedValue}
              </h3>
            )}

            <p className="text-xs text-muted-foreground truncate">{insight.subtitle}</p>

            {/* Mini trend indicator */}
            {insight.trendPercent !== undefined && (
              <motion.div
                className="mt-2 h-1 bg-secondary rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * stagger.normal + 0.4 }}
              >
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${insight.gradientFrom} ${insight.gradientTo}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(Math.abs(insight.trendPercent), 100)}%` }}
                  transition={{ delay: index * stagger.normal + 0.5, duration: 0.6 }}
                />
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
