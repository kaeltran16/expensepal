'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Expense } from '@/lib/supabase'
import { formatCurrency, hapticFeedback } from '@/lib/utils'
import { AnimatedCounter } from '@/components/animated-counter'
import { springs, stagger } from '@/lib/animation-config'
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Flame,
  Lightbulb,
  PiggyBank,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { useMemo, useState, useCallback } from 'react'

interface InsightsCardsProps {
  expenses: Expense[]
  onNavigate?: (view: 'budget' | 'expenses' | 'insights') => void
}

type RecommendationType =
  | 'streak'
  | 'overspending'
  | 'savings'
  | 'budget_warning'
  | 'goal'
  | 'pattern'
  | 'tip'
  | 'achievement'

interface Recommendation {
  id: string
  type: RecommendationType
  title: string
  description: string
  value?: number
  formattedValue?: string
  progress?: number
  action?: {
    label: string
    view?: 'budget' | 'expenses' | 'insights'
  }
  dismissable?: boolean
  priority: 'high' | 'medium' | 'low'
  icon: React.ElementType
  color: {
    text: string
    bg: string
    accent: string
    badge: string
  }
}

export function InsightsCards({ expenses, onNavigate }: InsightsCardsProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const recommendations = useMemo(() => {
    if (expenses.length === 0) return []

    const recs: Recommendation[] = []
    const now = new Date()

    // Date ranges
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

    // Category analysis
    const categoryTotals: Record<string, { current: number; last: number; count: number }> = {}

    currentMonthExpenses.forEach((e) => {
      const cat = e.category || 'Other'
      if (!categoryTotals[cat]) {
        categoryTotals[cat] = { current: 0, last: 0, count: 0 }
      }
      categoryTotals[cat].current += e.amount
      categoryTotals[cat].count++
    })

    lastMonthExpenses.forEach((e) => {
      const cat = e.category || 'Other'
      if (!categoryTotals[cat]) {
        categoryTotals[cat] = { current: 0, last: 0, count: 0 }
      }
      categoryTotals[cat].last += e.amount
    })

    // Days tracking
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daysElapsed = now.getDate()
    const daysRemaining = daysInMonth - daysElapsed
    const avgDailySpending = currentMonthTotal / Math.max(1, daysElapsed)

    // Find no-spend days (streak)
    const last7Days = new Set<string>()
    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      last7Days.add(d.toISOString().split('T')[0])
    }

    const expenseDays = new Set(
      currentWeekExpenses.map((e) => e.transaction_date.split('T')[0])
    )
    let noSpendStreak = 0
    for (let i = 1; i <= 7; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      if (!expenseDays.has(dateStr)) {
        noSpendStreak++
      } else {
        break
      }
    }

    // === GENERATE RECOMMENDATIONS ===

    // 1. No-spend streak achievement
    if (noSpendStreak >= 2) {
      recs.push({
        id: 'streak-nospend',
        type: 'streak',
        title: `${noSpendStreak} day no-spend streak!`,
        description: noSpendStreak >= 3
          ? "Amazing discipline! Keep going to reach your savings goals faster."
          : "Great start! Try to extend your streak for bigger savings.",
        progress: Math.min(100, (noSpendStreak / 7) * 100),
        dismissable: true,
        priority: noSpendStreak >= 3 ? 'high' : 'medium',
        icon: Flame,
        color: {
          text: 'text-orange-600 dark:text-orange-400',
          bg: 'bg-orange-50 dark:bg-orange-950/30',
          accent: 'bg-gradient-to-r from-orange-500 to-amber-500',
          badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
        },
      })
    }

    // 2. Weekly spending comparison
    if (lastWeekTotal > 0) {
      if (weeklyChange < -15) {
        // Reduced spending - positive
        recs.push({
          id: 'weekly-savings',
          type: 'savings',
          title: `Saved ${Math.abs(weeklyChange).toFixed(0)}% this week`,
          description: `You spent ${formatCurrency(Math.abs(currentWeekTotal - lastWeekTotal), 'VND')} less than last week. Excellent progress!`,
          value: Math.abs(currentWeekTotal - lastWeekTotal),
          formattedValue: formatCurrency(Math.abs(currentWeekTotal - lastWeekTotal), 'VND'),
          dismissable: true,
          priority: 'high',
          icon: TrendingDown,
          color: {
            text: 'text-green-600 dark:text-green-400',
            bg: 'bg-green-50 dark:bg-green-950/30',
            accent: 'bg-gradient-to-r from-green-500 to-emerald-500',
            badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
          },
        })
      } else if (weeklyChange > 25) {
        // Increased spending - warning
        recs.push({
          id: 'weekly-overspend',
          type: 'overspending',
          title: `Spending up ${weeklyChange.toFixed(0)}% this week`,
          description: `You've spent ${formatCurrency(currentWeekTotal - lastWeekTotal, 'VND')} more than last week. Review your recent expenses.`,
          value: currentWeekTotal - lastWeekTotal,
          action: { label: 'View expenses', view: 'expenses' },
          priority: 'high',
          icon: AlertTriangle,
          color: {
            text: 'text-red-600 dark:text-red-400',
            bg: 'bg-red-50 dark:bg-red-950/30',
            accent: 'bg-gradient-to-r from-red-500 to-rose-500',
            badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
          },
        })
      }
    }

    // 3. Monthly pace check
    if (daysElapsed >= 7 && lastMonthTotal > 0) {
      const projectedTotal = avgDailySpending * daysInMonth
      const projectedChange = ((projectedTotal - lastMonthTotal) / lastMonthTotal) * 100

      if (projectedChange > 20) {
        const dailyTarget = (lastMonthTotal / daysInMonth)
        recs.push({
          id: 'monthly-pace',
          type: 'goal',
          title: 'On track to overspend',
          description: `At this pace, you'll spend ${formatCurrency(projectedTotal, 'VND')} this month (${projectedChange.toFixed(0)}% more than last month). Try a daily limit of ${formatCurrency(dailyTarget, 'VND')}.`,
          value: projectedTotal,
          progress: Math.min(100, (daysElapsed / daysInMonth) * 100),
          action: { label: 'Set budget', view: 'budget' },
          priority: 'high',
          icon: Target,
          color: {
            text: 'text-purple-600 dark:text-purple-400',
            bg: 'bg-purple-50 dark:bg-purple-950/30',
            accent: 'bg-gradient-to-r from-purple-500 to-violet-500',
            badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
          },
        })
      } else if (projectedChange < -10) {
        recs.push({
          id: 'monthly-savings',
          type: 'achievement',
          title: 'Great month ahead!',
          description: `You're on track to spend ${Math.abs(projectedChange).toFixed(0)}% less than last month. Keep up the good habits!`,
          progress: Math.min(100, (daysElapsed / daysInMonth) * 100),
          dismissable: true,
          priority: 'medium',
          icon: Award,
          color: {
            text: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
            accent: 'bg-gradient-to-r from-emerald-500 to-teal-500',
            badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
          },
        })
      }
    }

    // 4. Category spike detection
    Object.entries(categoryTotals).forEach(([category, data]) => {
      if (data.last > 0) {
        const increase = ((data.current - data.last) / data.last) * 100
        if (increase > 40 && data.current > currentMonthTotal * 0.15) {
          recs.push({
            id: `category-spike-${category}`,
            type: 'budget_warning',
            title: `${category} up ${increase.toFixed(0)}%`,
            description: `${formatCurrency(data.current, 'VND')} spent on ${category.toLowerCase()} this month vs ${formatCurrency(data.last, 'VND')} last month.`,
            value: data.current - data.last,
            action: { label: 'Set budget', view: 'budget' },
            dismissable: true,
            priority: 'medium',
            icon: TrendingUp,
            color: {
              text: 'text-amber-600 dark:text-amber-400',
              bg: 'bg-amber-50 dark:bg-amber-950/30',
              accent: 'bg-gradient-to-r from-amber-500 to-yellow-500',
              badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
            },
          })
        }
      }
    })

    // 5. Savings tip based on top spending category
    const sortedCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1].current - a[1].current)

    if (sortedCategories.length > 0) {
      const [topCategory, topData] = sortedCategories[0]
      const percentage = (topData.current / currentMonthTotal) * 100

      if (percentage > 35) {
        const tips: Record<string, string> = {
          'Food': 'Try meal prepping or cooking at home more often to save.',
          'Shopping': 'Consider a 24-hour rule before non-essential purchases.',
          'Entertainment': 'Look for free activities or use reward programs.',
          'Transport': 'Try carpooling, public transit, or walking when possible.',
          'Dining Out': 'Limit restaurant visits and explore cooking new recipes.',
        }
        const tip = tips[topCategory] || `Look for ways to reduce ${topCategory.toLowerCase()} expenses.`

        recs.push({
          id: 'tip-top-category',
          type: 'tip',
          title: `${percentage.toFixed(0)}% on ${topCategory}`,
          description: tip,
          value: topData.current,
          formattedValue: formatCurrency(topData.current, 'VND'),
          dismissable: true,
          priority: 'low',
          icon: Lightbulb,
          color: {
            text: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-950/30',
            accent: 'bg-gradient-to-r from-blue-500 to-cyan-500',
            badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
          },
        })
      }
    }

    // 6. Quick stats summary card (always show)
    recs.push({
      id: 'quick-stats',
      type: 'pattern',
      title: 'This Month',
      description: `${currentMonthExpenses.length} transactions over ${daysElapsed} days`,
      value: currentMonthTotal,
      formattedValue: formatCurrency(currentMonthTotal, 'VND'),
      progress: daysElapsed > 0 ? (daysElapsed / daysInMonth) * 100 : 0,
      action: { label: 'View details', view: 'insights' },
      priority: 'low',
      icon: Calendar,
      color: {
        text: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-50 dark:bg-indigo-950/30',
        accent: 'bg-gradient-to-r from-indigo-500 to-blue-500',
        badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
      },
    })

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  }, [expenses])

  const visibleRecommendations = recommendations.filter(
    (rec) => !dismissedIds.has(rec.id)
  )

  const handleDismiss = useCallback((id: string) => {
    hapticFeedback('light')
    setDismissedIds((prev) => new Set(prev).add(id))
  }, [])

  const handleAction = useCallback((view?: 'budget' | 'expenses' | 'insights') => {
    hapticFeedback('light')
    if (view && onNavigate) {
      onNavigate(view)
    }
  }, [onNavigate])

  if (visibleRecommendations.length === 0) {
    return (
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={springs.bouncy}
          >
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
          </motion.div>
          <h3 className="font-semibold text-sm mb-1">All caught up!</h3>
          <p className="text-xs text-muted-foreground">
            Keep tracking to get personalized insights.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {visibleRecommendations.slice(0, 4).map((rec, index) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            index={index}
            onDismiss={handleDismiss}
            onAction={handleAction}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface RecommendationCardProps {
  recommendation: Recommendation
  index: number
  onDismiss: (id: string) => void
  onAction: (view?: 'budget' | 'expenses' | 'insights') => void
}

function RecommendationCard({ recommendation: rec, index, onDismiss, onAction }: RecommendationCardProps) {
  const Icon = rec.icon
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5])
  const scale = useTransform(x, [-100, 0, 100], [0.95, 1, 0.95])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (rec.dismissable && Math.abs(info.offset.x) > 100) {
      onDismiss(rec.id)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -200, transition: { duration: 0.2 } }}
      transition={{
        delay: index * stagger.fast,
        ...springs.default,
      }}
      style={{ opacity, scale }}
      drag={rec.dismissable ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
    >
      <Card className={`relative overflow-hidden border-0 shadow-sm ${rec.dismissable ? 'cursor-grab active:cursor-grabbing' : ''}`}>
        {/* Accent bar */}
        <motion.div
          className={`absolute top-0 left-0 right-0 h-1 ${rec.color.accent}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: index * stagger.fast + 0.2, duration: 0.4 }}
          style={{ transformOrigin: 'left' }}
        />

        {/* Background */}
        <div className={`absolute inset-0 ${rec.color.bg} opacity-60`} />

        {/* Decorative circle */}
        <motion.div
          className={`absolute -right-6 -top-6 w-20 h-20 rounded-full ${rec.color.bg}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * stagger.fast + 0.1, ...springs.bouncy }}
        />

        <CardContent className="relative p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <motion.div
              className={`w-11 h-11 rounded-xl ${rec.color.bg} flex items-center justify-center flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10`}
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Icon className={`w-5 h-5 ${rec.color.text}`} />
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className={`font-semibold text-sm ${rec.color.text}`}>
                  {rec.title}
                </h4>

                {/* Dismiss button */}
                {rec.dismissable && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * stagger.fast + 0.3 }}
                    onClick={() => onDismiss(rec.id)}
                    className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </motion.button>
                )}
              </div>

              {/* Value display */}
              {rec.formattedValue && (
                <div className="mb-1">
                  <span className="text-lg font-bold">
                    {rec.value !== undefined ? (
                      <AnimatedCounter value={rec.value} duration={800} prefix="₫" />
                    ) : (
                      rec.formattedValue
                    )}
                  </span>
                </div>
              )}

              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                {rec.description}
              </p>

              {/* Progress bar */}
              {rec.progress !== undefined && (
                <div className="mb-2">
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${rec.color.accent}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(rec.progress, 100)}%` }}
                      transition={{ delay: index * stagger.fast + 0.4, duration: 0.6 }}
                    />
                  </div>
                </div>
              )}

              {/* Action button */}
              {rec.action && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * stagger.fast + 0.3 }}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-7 px-3 text-xs font-medium ${rec.color.text} hover:${rec.color.bg}`}
                    onClick={() => onAction(rec.action?.view)}
                  >
                    {rec.action.label}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
