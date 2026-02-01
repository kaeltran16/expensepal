'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useBudgets, useAIInsights } from '@/lib/hooks'
import type { Expense } from '@/lib/supabase'
import { formatCurrency, hapticFeedback } from '@/lib/utils'
import { AnimatePresence, motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { springs, stagger } from '@/lib/animation-config'
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  Eye,
  Filter,
  Flame,
  Gift,
  Lightbulb,
  PiggyBank,
  Plus,
  RefreshCcw,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { useMemo, useState, useCallback } from 'react'

interface RecommendationAction {
  label: string
  icon: React.ElementType
  variant: 'primary' | 'secondary'
  onClick: () => void
}

interface Recommendation {
  id: string
  type: 'savings' | 'warning' | 'optimization' | 'goal' | 'opportunity' | 'pattern' | 'achievement' | 'challenge'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  amount?: number
  progress?: number
  dismissable?: boolean
  isAI?: boolean
  actions?: RecommendationAction[]
  metadata?: {
    category?: string
    merchant?: string
    percentChange?: number
    daysLeft?: number
  }
}

interface SpendingAdvisorProps {
  expenses: Expense[]
  onNavigate?: (view: 'budget' | 'expenses', params?: { category?: string; merchant?: string }) => void
}

export function SpendingAdvisor({ expenses, onNavigate }: SpendingAdvisorProps) {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: budgets = [] } = useBudgets({ month: currentMonth })
  const { data: aiInsights, isLoading: aiLoading } = useAIInsights(expenses)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  const recommendations: Recommendation[] = useMemo(() => {
    if (expenses.length === 0) return []

    const recs: Recommendation[] = []
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const daysElapsed = now.getDate()
    const daysRemaining = daysInMonth - daysElapsed

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

    const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0)
    const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0)

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

    // Merchant analysis
    const merchantTotals: Record<string, { total: number; count: number; category: string }> = {}
    currentMonthExpenses.forEach((e) => {
      if (!merchantTotals[e.merchant]) {
        merchantTotals[e.merchant] = { total: 0, count: 0, category: e.category || 'Other' }
      }
      merchantTotals[e.merchant].total += e.amount
      merchantTotals[e.merchant].count++
    })

    // === GENERATE SMART RECOMMENDATIONS ===

    // 1. Budget alerts (near limit or over)
    budgets.forEach((budget) => {
      const spent = categoryTotals[budget.category]?.current || 0
      const percentage = (spent / budget.amount) * 100
      const remaining = budget.amount - spent

      if (percentage >= 100) {
        recs.push({
          id: `budget-over-${budget.category}`,
          type: 'warning',
          title: `${budget.category} budget exceeded`,
          description: `You've spent ${formatCurrency(spent, 'VND')} of your ${formatCurrency(budget.amount, 'VND')} budget.`,
          impact: 'high',
          amount: spent - budget.amount,
          progress: 100,
          metadata: { category: budget.category, percentChange: percentage - 100 },
          actions: [
            {
              label: 'View expenses',
              icon: Eye,
              variant: 'primary',
              onClick: () => onNavigate?.('expenses', { category: budget.category }),
            },
            {
              label: 'Adjust',
              icon: Settings2,
              variant: 'secondary',
              onClick: () => onNavigate?.('budget'),
            },
          ],
        })
      } else if (percentage >= 80) {
        const dailyAllowance = remaining / Math.max(1, daysRemaining)
        recs.push({
          id: `budget-warning-${budget.category}`,
          type: 'goal',
          title: `${budget.category} at ${percentage.toFixed(0)}%`,
          description: `${formatCurrency(remaining, 'VND')} left for ${daysRemaining} days (${formatCurrency(dailyAllowance, 'VND')}/day).`,
          impact: 'medium',
          progress: percentage,
          dismissable: true,
          metadata: { category: budget.category, daysLeft: daysRemaining },
          actions: [
            {
              label: 'View expenses',
              icon: Filter,
              variant: 'primary',
              onClick: () => onNavigate?.('expenses', { category: budget.category }),
            },
          ],
        })
      }
    })

    // 2. Unusual spending spikes
    Object.entries(categoryTotals).forEach(([category, totals]) => {
      if (totals.last > 0) {
        const increase = ((totals.current - totals.last) / totals.last) * 100
        if (increase > 50 && totals.current > currentMonthTotal * 0.1) {
          const topMerchant = Object.entries(merchantTotals)
            .filter(([_, data]) => data.category === category)
            .sort((a, b) => b[1].total - a[1].total)[0]

          recs.push({
            id: `spike-${category}`,
            type: 'warning',
            title: `${category} up ${increase.toFixed(0)}%`,
            description: `${formatCurrency(totals.current - totals.last, 'VND')} more than last month.${topMerchant ? ` Top: ${topMerchant[0]}` : ''}`,
            impact: increase > 75 ? 'high' : 'medium',
            amount: totals.current - totals.last,
            dismissable: true,
            metadata: { category, percentChange: increase, merchant: topMerchant?.[0] },
            actions: [
              {
                label: 'View expenses',
                icon: Filter,
                variant: 'primary',
                onClick: () => onNavigate?.('expenses', { category }),
              },
              ...(topMerchant ? [{
                label: 'Top merchant',
                icon: Eye,
                variant: 'secondary' as const,
                onClick: () => onNavigate?.('expenses', { merchant: topMerchant[0] }),
              }] : []),
            ],
          })
        }
      }
    })

    // 3. Savings achievements
    Object.entries(categoryTotals).forEach(([category, totals]) => {
      if (totals.last > 0) {
        const decrease = ((totals.last - totals.current) / totals.last) * 100
        if (decrease > 25 && totals.last > lastMonthTotal * 0.1) {
          recs.push({
            id: `savings-${category}`,
            type: 'achievement',
            title: `${category} down ${decrease.toFixed(0)}%`,
            description: `Saved ${formatCurrency(totals.last - totals.current, 'VND')} on ${category.toLowerCase()}!`,
            impact: 'high',
            amount: totals.last - totals.current,
            dismissable: true,
            metadata: { category, percentChange: -decrease },
            actions: [
              {
                label: 'Set goal',
                icon: Target,
                variant: 'primary',
                onClick: () => onNavigate?.('budget'),
              },
            ],
          })
        }
      }
    })

    // 4. Frequent merchant optimization
    const frequentMerchants = Object.entries(merchantTotals)
      .filter(([_, data]) => data.count >= 4)
      .sort((a, b) => b[1].total - a[1].total)

    if (frequentMerchants.length > 0) {
      const [merchant, data] = frequentMerchants[0]
      const avgPerVisit = data.total / data.count

      const tips: Record<string, string> = {
        'Food': 'Try meal prepping to reduce visits.',
        'Coffee': 'Brew at home 2-3 days/week.',
        'Transport': 'Consider a monthly pass.',
        'Shopping': 'Use the 48-hour rule.',
        'Entertainment': 'Look for free alternatives.',
      }

      recs.push({
        id: `frequent-${merchant}`,
        type: 'optimization',
        title: `${data.count}x at ${merchant}`,
        description: `${formatCurrency(avgPerVisit, 'VND')}/visit avg. ${tips[data.category] || 'Review if needed.'}`,
        impact: 'medium',
        amount: data.total,
        dismissable: true,
        metadata: { merchant, category: data.category },
        actions: [
          {
            label: 'View details',
            icon: Eye,
            variant: 'primary',
            onClick: () => onNavigate?.('expenses', { merchant }),
          },
        ],
      })
    }

    // 5. Month-end challenge
    if (daysRemaining > 0 && daysRemaining <= 10 && lastMonthTotal > 0) {
      const avgDailySpent = currentMonthTotal / daysElapsed
      const projectedTotal = avgDailySpent * daysInMonth
      const projectedIncrease = ((projectedTotal - lastMonthTotal) / lastMonthTotal) * 100

      if (projectedIncrease > 15) {
        const targetDaily = (lastMonthTotal - currentMonthTotal) / daysRemaining
        const challengeSavings = (avgDailySpent - Math.max(0, targetDaily)) * daysRemaining

        if (targetDaily > 0) {
          recs.push({
            id: 'end-month-challenge',
            type: 'challenge',
            title: `${daysRemaining}-day challenge`,
            description: `Spend max ${formatCurrency(targetDaily, 'VND')}/day to save ${formatCurrency(challengeSavings, 'VND')}.`,
            impact: 'high',
            progress: (daysElapsed / daysInMonth) * 100,
            dismissable: true,
            metadata: { daysLeft: daysRemaining },
            actions: [
              {
                label: 'Track daily',
                icon: Target,
                variant: 'primary',
                onClick: () => onNavigate?.('expenses'),
              },
            ],
          })
        }
      }
    }

    // 6. Subscription reminder
    const potentialSubscriptions = Object.entries(merchantTotals)
      .filter(([merchant, data]) => {
        const merchantExpenses = currentMonthExpenses.filter(e => e.merchant === merchant)
        if (merchantExpenses.length < 2) return false
        const amounts = merchantExpenses.map(e => e.amount)
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
        return amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.1) && data.count >= 2
      })

    if (potentialSubscriptions.length > 0) {
      const totalSubscriptions = potentialSubscriptions.reduce((sum, [_, data]) => sum + data.total, 0)
      recs.push({
        id: 'subscription-audit',
        type: 'opportunity',
        title: `${potentialSubscriptions.length} recurring payments`,
        description: `${formatCurrency(totalSubscriptions, 'VND')}/month in subscriptions. Review unused ones.`,
        impact: 'medium',
        amount: totalSubscriptions,
        dismissable: true,
        actions: [
          {
            label: 'Review all',
            icon: Eye,
            variant: 'primary',
            onClick: () => onNavigate?.('expenses'),
          },
        ],
      })
    }

    // 7. Weekend spending pattern
    const weekendExpenses = currentMonthExpenses.filter(e => {
      const day = new Date(e.transaction_date).getDay()
      return day === 0 || day === 6
    })
    const weekdayExpenses = currentMonthExpenses.filter(e => {
      const day = new Date(e.transaction_date).getDay()
      return day !== 0 && day !== 6
    })

    if (weekendExpenses.length > 0 && weekdayExpenses.length > 0) {
      const weekendTotal = weekendExpenses.reduce((sum, e) => sum + e.amount, 0)
      const weekdayTotal = weekdayExpenses.reduce((sum, e) => sum + e.amount, 0)
      const weekendDays = Math.ceil(daysElapsed * 2 / 7)
      const weekdayDays = daysElapsed - weekendDays

      const weekendAvg = weekendTotal / Math.max(1, weekendDays)
      const weekdayAvg = weekdayTotal / Math.max(1, weekdayDays)

      if (weekendAvg > weekdayAvg * 1.5 && weekendTotal > currentMonthTotal * 0.3) {
        recs.push({
          id: 'weekend-pattern',
          type: 'pattern',
          title: 'High weekend spending',
          description: `${formatCurrency(weekendAvg, 'VND')}/day vs ${formatCurrency(weekdayAvg, 'VND')} on weekdays.`,
          impact: 'medium',
          dismissable: true,
          metadata: { percentChange: ((weekendAvg - weekdayAvg) / weekdayAvg) * 100 },
          actions: [
            {
              label: 'View weekends',
              icon: Eye,
              variant: 'primary',
              onClick: () => onNavigate?.('expenses'),
            },
          ],
        })
      }
    }

    // Sort by impact
    const impactOrder = { high: 0, medium: 1, low: 2 }
    return recs.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact])
  }, [expenses, budgets, onNavigate])

  // Merge rule-based and AI recommendations
  const allRecommendations = useMemo(() => {
    const aiRecs: Recommendation[] = (aiInsights?.insights || []).map(rec => ({
      id: rec.id,
      type: rec.type as Recommendation['type'],
      title: rec.title,
      description: rec.description,
      impact: rec.impact,
      isAI: true,
      dismissable: true,
      actions: rec.action ? [{
        label: 'Take action',
        icon: ArrowRight,
        variant: 'primary' as const,
        onClick: () => onNavigate?.('expenses'),
      }] : undefined,
    }))
    const combined = [...aiRecs, ...recommendations]
    return combined.filter(rec => !dismissedIds.has(rec.id)).slice(0, 5)
  }, [recommendations, aiInsights, dismissedIds, onNavigate])

  const handleDismiss = useCallback((id: string) => {
    hapticFeedback('light')
    setDismissedIds(prev => new Set(prev).add(id))
  }, [])

  if (allRecommendations.length === 0 && !aiLoading) {
    return (
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={springs.bouncy}
          >
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
          </motion.div>
          <h3 className="font-semibold mb-1">Looking good!</h3>
          <p className="text-sm text-muted-foreground">
            No issues found. Keep up the great spending habits!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Smart Recommendations</h2>
        </div>
        {aiLoading && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCcw className="w-4 h-4 text-muted-foreground" />
          </motion.div>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {allRecommendations.map((rec, index) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            index={index}
            onDismiss={handleDismiss}
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
}

function RecommendationCard({ recommendation: rec, index, onDismiss }: RecommendationCardProps) {
  const config = getRecommendationConfig(rec.type)
  const Icon = config.icon
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-100, 0, 100], [0.5, 1, 0.5])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (rec.dismissable && Math.abs(info.offset.x) > 80) {
      onDismiss(rec.id)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -200, transition: { duration: 0.2 } }}
      transition={{ delay: index * stagger.fast, ...springs.default }}
      style={{ opacity }}
      drag={rec.dismissable ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.15}
      onDragEnd={handleDragEnd}
    >
      <Card className={`relative overflow-hidden border-0 shadow-sm ${rec.dismissable ? 'active:cursor-grabbing' : ''}`}>
        {/* Top accent bar */}
        <motion.div
          className={`absolute top-0 left-0 right-0 h-1 ${config.accent}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: index * stagger.fast + 0.1, duration: 0.4 }}
          style={{ transformOrigin: 'left' }}
        />

        {/* Background gradient */}
        <div className={`absolute inset-0 ${config.bg} opacity-40`} />

        {/* AI badge */}
        {rec.isAI && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-3 right-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-medium"
          >
            <Zap className="w-3 h-3" />
            AI
          </motion.div>
        )}

        {/* Dismiss button */}
        {rec.dismissable && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * stagger.fast + 0.2 }}
            onClick={() => onDismiss(rec.id)}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-10"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </motion.button>
        )}

        <CardContent className="relative p-4">
          <div className="flex items-start gap-3">
            {/* Icon with impact indicator */}
            <div className="relative flex-shrink-0">
              <motion.div
                className={`w-11 h-11 rounded-xl ${config.iconBg} flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10`}
                whileTap={{ scale: 0.95 }}
              >
                <Icon className={`w-5 h-5 ${config.iconColor}`} />
              </motion.div>
              {/* Impact dot */}
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
                rec.impact === 'high' ? 'bg-red-500' : rec.impact === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
              }`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className={`font-semibold text-sm ${config.titleColor} mb-0.5 pr-8`}>
                {rec.title}
              </h4>

              {/* Amount display */}
              {rec.amount !== undefined && rec.amount > 0 && (
                <p className="text-base font-bold mb-1">
                  {rec.type === 'achievement' || rec.type === 'savings' ? '+' : ''}
                  {formatCurrency(rec.amount, 'VND')}
                </p>
              )}

              {/* Progress bar */}
              {rec.progress !== undefined && (
                <div className="mb-2">
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${config.accent}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(rec.progress, 100)}%` }}
                      transition={{ delay: index * stagger.fast + 0.3, duration: 0.5 }}
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                {rec.description}
              </p>

              {/* Action buttons - always visible, mobile-friendly */}
              {rec.actions && rec.actions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {rec.actions.map((action, i) => {
                    const ActionIcon = action.icon
                    return (
                      <Button
                        key={i}
                        size="sm"
                        variant={action.variant === 'primary' ? 'default' : 'outline'}
                        className={`h-9 px-3 text-xs font-medium ${
                          action.variant === 'primary'
                            ? `${config.accent} text-white border-0 shadow-sm`
                            : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          hapticFeedback('light')
                          action.onClick()
                        }}
                      >
                        <ActionIcon className="w-3.5 h-3.5 mr-1.5" />
                        {action.label}
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function getRecommendationConfig(type: Recommendation['type']) {
  const configs = {
    warning: {
      icon: AlertTriangle,
      bg: 'bg-red-50 dark:bg-red-950/30',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      iconColor: 'text-red-600 dark:text-red-400',
      titleColor: 'text-red-700 dark:text-red-300',
      accent: 'bg-gradient-to-r from-red-500 to-rose-500',
    },
    savings: {
      icon: PiggyBank,
      bg: 'bg-green-50 dark:bg-green-950/30',
      iconBg: 'bg-green-100 dark:bg-green-900/40',
      iconColor: 'text-green-600 dark:text-green-400',
      titleColor: 'text-green-700 dark:text-green-300',
      accent: 'bg-gradient-to-r from-green-500 to-emerald-500',
    },
    achievement: {
      icon: Award,
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      titleColor: 'text-emerald-700 dark:text-emerald-300',
      accent: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    },
    optimization: {
      icon: Lightbulb,
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-700 dark:text-blue-300',
      accent: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    },
    goal: {
      icon: Target,
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      iconBg: 'bg-purple-100 dark:bg-purple-900/40',
      iconColor: 'text-purple-600 dark:text-purple-400',
      titleColor: 'text-purple-700 dark:text-purple-300',
      accent: 'bg-gradient-to-r from-purple-500 to-violet-500',
    },
    opportunity: {
      icon: Gift,
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconColor: 'text-amber-600 dark:text-amber-400',
      titleColor: 'text-amber-700 dark:text-amber-300',
      accent: 'bg-gradient-to-r from-amber-500 to-yellow-500',
    },
    pattern: {
      icon: TrendingUp,
      bg: 'bg-indigo-50 dark:bg-indigo-950/30',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      titleColor: 'text-indigo-700 dark:text-indigo-300',
      accent: 'bg-gradient-to-r from-indigo-500 to-blue-500',
    },
    challenge: {
      icon: Flame,
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      iconBg: 'bg-orange-100 dark:bg-orange-900/40',
      iconColor: 'text-orange-600 dark:text-orange-400',
      titleColor: 'text-orange-700 dark:text-orange-300',
      accent: 'bg-gradient-to-r from-orange-500 to-red-500',
    },
  }

  return configs[type] || configs.optimization
}
