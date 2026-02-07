'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { AnimatedCounter } from '@/components/animated-counter'
import { formatCurrency } from '@/lib/utils'
import { springs, stagger, getStaggerDelay } from '@/lib/animation-config'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Wallet,
  ShoppingBag,
  Calendar,
  Flame,
  Sparkles,
  Award,
  Medal,
  Trophy,
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

const CATEGORY_COLORS: Record<string, { bg: string; ring: string }> = {
  Food: { bg: 'bg-orange-100 dark:bg-orange-900/30', ring: 'stroke-orange-500' },
  Transport: { bg: 'bg-blue-100 dark:bg-blue-900/30', ring: 'stroke-blue-500' },
  Shopping: { bg: 'bg-pink-100 dark:bg-pink-900/30', ring: 'stroke-pink-500' },
  Entertainment: { bg: 'bg-purple-100 dark:bg-purple-900/30', ring: 'stroke-purple-500' },
  Bills: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', ring: 'stroke-yellow-500' },
  Health: { bg: 'bg-green-100 dark:bg-green-900/30', ring: 'stroke-green-500' },
  Other: { bg: 'bg-gray-100 dark:bg-gray-900/30', ring: 'stroke-gray-500' },
}

export interface AISectionInsight {
  emoji: string
  title: string
  summary: string
  highlight: string | null
}

interface WeeklySummaryProps {
  expenses: Expense[]
  aiInsight?: AISectionInsight | null
}

export function WeeklySummary({ expenses, aiInsight }: WeeklySummaryProps) {
  const summary = useMemo(() => {
    const now = new Date()

    // Last 7 days (more useful than "this week from Sunday")
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(now.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    // Previous 7 days (for comparison)
    const fourteenDaysAgo = new Date(sevenDaysAgo)
    fourteenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Last 7 days expenses
    const thisWeek = expenses.filter((e) => {
      const date = new Date(e.transaction_date)
      return date >= sevenDaysAgo && date <= now
    })

    // Previous 7 days expenses
    const lastWeek = expenses.filter((e) => {
      const date = new Date(e.transaction_date)
      return date >= fourteenDaysAgo && date < sevenDaysAgo
    })

    const thisWeekTotal = thisWeek.reduce((sum, e) => sum + e.amount, 0)
    const lastWeekTotal = lastWeek.reduce((sum, e) => sum + e.amount, 0)
    const change = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0

    // Category breakdown
    const categoryTotals: Record<string, number> = {}
    thisWeek.forEach((e) => {
      const category = e.category || 'Other'
      categoryTotals[category] = (categoryTotals[category] || 0) + e.amount
    })

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    // Merchant breakdown
    const merchantTotals: Record<string, number> = {}
    thisWeek.forEach((e) => {
      merchantTotals[e.merchant] = (merchantTotals[e.merchant] || 0) + e.amount
    })

    const topMerchants = Object.entries(merchantTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    // Daily breakdown - generate last 7 days
    const last7Days: { date: Date; label: string; dateLabel: string; dayNum: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(now.getDate() - i)
      date.setHours(0, 0, 0, 0)
      last7Days.push({
        date,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        dayNum: date.getDate(),
      })
    }

    const dailyTotals = last7Days.map((day) => {
      const dayEnd = new Date(day.date)
      dayEnd.setHours(23, 59, 59, 999)
      const amount = thisWeek
        .filter((e) => {
          const date = new Date(e.transaction_date)
          return date >= day.date && date <= dayEnd
        })
        .reduce((sum, e) => sum + e.amount, 0)
      return { ...day, amount }
    })

    // Find highest spending day
    const highestDay = dailyTotals.reduce(
      (max, day) => (day.amount > max.amount ? day : max),
      dailyTotals[0]
    )

    // Calculate streak (consecutive days with spending)
    let streak = 0
    for (let i = dailyTotals.length - 1; i >= 0; i--) {
      if (dailyTotals[i].amount > 0) streak++
      else break
    }

    return {
      thisWeekTotal,
      lastWeekTotal,
      change,
      thisWeekCount: thisWeek.length,
      lastWeekCount: lastWeek.length,
      topCategories,
      topMerchants,
      dailyTotals,
      avgDailySpend: thisWeekTotal / 7,
      highestDay,
      streak,
    }
  }, [expenses])

  const maxDailyAmount = Math.max(...summary.dailyTotals.map((d) => d.amount), 1)

  return (
    <div className="space-y-4">
      {/* Hero Stats Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.gentle}
      >
        <Card className="relative overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-primary/5" />

          <div className="relative p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <motion.div
                  className="p-3 bg-primary/10 rounded-2xl"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Calendar className="h-6 w-6 text-primary" />
                </motion.div>
                <div>
                  <h2 className="text-lg font-semibold">Last 7 Days</h2>
                  <p className="text-sm text-muted-foreground">
                    {summary.thisWeekCount} transactions
                  </p>
                </div>
              </div>

              {/* Trend Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, ...springs.bouncy }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                  summary.change > 0
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : summary.change < 0
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {summary.change > 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : summary.change < 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                <span>{Math.abs(summary.change).toFixed(1)}%</span>
              </motion.div>
            </div>

            {/* Main Amount */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight">
                  <AnimatedCounter
                    value={summary.thisWeekTotal}
                    duration={1200}
                    prefix="₫"
                  />
                </span>
              </div>
              {summary.change !== 0 && (
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-muted-foreground mt-1"
                >
                  {summary.change > 0 ? 'More' : 'Less'} than previous 7 days
                </motion.p>
              )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <QuickStatCard
                icon={Wallet}
                label="Daily Avg"
                value={formatCurrency(summary.avgDailySpend, 'VND')}
                delay={0.1}
              />
              <QuickStatCard
                icon={Flame}
                label="Streak"
                value={`${summary.streak} days`}
                delay={0.15}
              />
              <QuickStatCard
                icon={Sparkles}
                label="Peak Day"
                value={summary.highestDay.label}
                delay={0.2}
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Daily Breakdown - Visual Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, ...springs.gentle }}
      >
        <Card className="p-5">
          <h3 className="text-base font-semibold mb-4">Daily Spending</h3>
          <div className="flex items-end justify-between gap-2 h-32">
            {summary.dailyTotals.map((day, index) => {
              const height = (day.amount / maxDailyAmount) * 100
              const isToday = index === summary.dailyTotals.length - 1
              const isHighest = day === summary.highestDay && day.amount > 0

              return (
                <motion.div
                  key={index}
                  className="flex-1 flex flex-col items-center gap-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * stagger.normal }}
                >
                  {/* Amount label */}
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + index * stagger.normal }}
                    className="text-[10px] text-muted-foreground font-medium"
                  >
                    {day.amount > 0 ? `${(day.amount / 1000).toFixed(0)}k` : '-'}
                  </motion.span>

                  {/* Bar */}
                  <div className="relative w-full h-20 flex items-end justify-center">
                    <motion.div
                      className={`w-full max-w-[32px] rounded-t-lg relative overflow-hidden ${
                        isToday
                          ? 'bg-primary'
                          : isHighest
                            ? 'bg-orange-500'
                            : 'bg-primary/60'
                      }`}
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(height, day.amount > 0 ? 8 : 0)}%` }}
                      transition={{ delay: 0.3 + index * stagger.normal, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    >
                      {/* Shimmer effect on bars */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-t from-transparent via-white/20 to-transparent"
                        initial={{ y: '100%' }}
                        animate={{ y: '-100%' }}
                        transition={{ delay: 0.8 + index * stagger.fast, duration: 0.8 }}
                      />
                    </motion.div>
                    {isHighest && day.amount > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.8, ...springs.bouncy }}
                        className="absolute -top-1 left-1/2 -translate-x-1/2"
                      >
                        <Flame className="h-3 w-3 text-orange-500" />
                      </motion.div>
                    )}
                  </div>

                  {/* Day labels */}
                  <div className="text-center">
                    <p className={`text-xs font-medium ${isToday ? 'text-primary' : ''}`}>
                      {day.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{day.dayNum}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </Card>
      </motion.div>

      {/* Categories with Ring Charts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, ...springs.gentle }}
      >
        <Card className="p-5">
          <h3 className="text-base font-semibold mb-4">Top Categories</h3>
          {summary.topCategories.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              No expenses in the last 7 days
            </p>
          ) : (
            <div className="space-y-3">
              {summary.topCategories.map(([category, amount], index) => {
                const percentage = (amount / summary.thisWeekTotal) * 100
                const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other

                return (
                  <motion.div
                    key={category}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * stagger.normal, ...springs.default }}
                    className="flex items-center gap-4"
                  >
                    {/* Category Ring */}
                    <div className="relative">
                      <CategoryRing
                        percentage={percentage}
                        colorClass={colors.ring}
                        delay={0.4 + index * stagger.normal}
                      />
                      <div
                        className={`absolute inset-0 flex items-center justify-center text-lg ${colors.bg} rounded-full m-1`}
                      >
                        {CATEGORY_EMOJI[category] || '📦'}
                      </div>
                    </div>

                    {/* Category Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{category}</span>
                        <span className="font-semibold">{formatCurrency(amount, 'VND')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ delay: 0.5 + index * stagger.normal, duration: 0.6 }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Top Merchants with Rank Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, ...springs.gentle }}
      >
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Top Merchants</h3>
          </div>
          {summary.topMerchants.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              No expenses in the last 7 days
            </p>
          ) : (
            <div className="space-y-3">
              {summary.topMerchants.map(([merchant, amount], index) => {
                const percentage = (amount / summary.thisWeekTotal) * 100

                return (
                  <motion.div
                    key={merchant}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * stagger.normal, ...springs.default }}
                    className="flex items-center gap-3"
                  >
                    {/* Rank Badge */}
                    <RankBadge rank={index + 1} />

                    {/* Merchant Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium truncate pr-2">{merchant}</span>
                        <span className="font-semibold flex-shrink-0">
                          {formatCurrency(amount, 'VND')}
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            index === 0
                              ? 'bg-yellow-500'
                              : index === 1
                                ? 'bg-gray-400'
                                : index === 2
                                  ? 'bg-amber-600'
                                  : 'bg-primary/60'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: 0.5 + index * stagger.normal, duration: 0.6 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Comparison Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, ...springs.gentle }}
      >
        <Card className="p-5 bg-muted/40">
          <h3 className="text-base font-semibold mb-3">Week Comparison</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">This Week</p>
              <p className="text-xl font-bold">{formatCurrency(summary.thisWeekTotal, 'VND')}</p>
              <p className="text-xs text-muted-foreground">{summary.thisWeekCount} transactions</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Last Week</p>
              <p className="text-xl font-semibold text-muted-foreground">
                {formatCurrency(summary.lastWeekTotal, 'VND')}
              </p>
              <p className="text-xs text-muted-foreground">{summary.lastWeekCount} transactions</p>
            </div>
          </div>

          {/* Visual Comparison Bar */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>This week</span>
                  <span>Last week</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden flex">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(summary.thisWeekTotal / (summary.thisWeekTotal + summary.lastWeekTotal || 1)) * 100}%`,
                    }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                  />
                  <motion.div
                    className="h-full bg-muted-foreground/30"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${(summary.lastWeekTotal / (summary.thisWeekTotal + summary.lastWeekTotal || 1)) * 100}%`,
                    }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* AI Insight inline */}
      {aiInsight && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex items-start gap-2.5 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 px-3 py-2.5"
        >
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
          <div className="min-w-0">
            {aiInsight.highlight && (
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-0.5">
                {aiInsight.highlight}
              </p>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {aiInsight.summary}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// Quick Stat Card Component
function QuickStatCard({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: React.ElementType
  label: string
  value: string
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ...springs.default }}
      className="bg-background/60 backdrop-blur-sm rounded-xl p-3 text-center"
    >
      <Icon className="h-4 w-4 mx-auto mb-1.5 text-muted-foreground" />
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold truncate">{value}</p>
    </motion.div>
  )
}

// Category Ring Component
function CategoryRing({
  percentage,
  colorClass,
  delay,
}: {
  percentage: number
  colorClass: string
  delay: number
}) {
  const size = 44
  const strokeWidth = 3
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/20"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ delay, duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        className={colorClass}
      />
    </svg>
  )
}

// Rank Badge Component
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.5, ...springs.bouncy }}
        className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30"
      >
        <Trophy className="h-4 w-4 text-white" />
      </motion.div>
    )
  }
  if (rank === 2) {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.55, ...springs.bouncy }}
        className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-lg shadow-gray-400/30"
      >
        <Medal className="h-4 w-4 text-white" />
      </motion.div>
    )
  }
  if (rank === 3) {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.6, ...springs.bouncy }}
        className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/30"
      >
        <Award className="h-4 w-4 text-white" />
      </motion.div>
    )
  }
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 0.5 + rank * 0.05, ...springs.default }}
      className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
    >
      <span className="text-sm font-medium text-muted-foreground">{rank}</span>
    </motion.div>
  )
}
