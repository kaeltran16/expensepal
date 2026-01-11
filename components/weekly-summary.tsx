'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import {
  DollarSign,
  ShoppingBag,
  Calendar,
  Target,
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

interface WeeklySummaryProps {
  expenses: Expense[]
}

export function WeeklySummary({ expenses }: WeeklySummaryProps) {
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
    const last7Days: { date: Date; label: string; dateLabel: string }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(now.getDate() - i)
      date.setHours(0, 0, 0, 0)
      last7Days.push({
        date,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      })
    }

    const dailyTotals: { label: string; dateLabel: string; amount: number }[] = last7Days.map((day) => {
      const dayEnd = new Date(day.date)
      dayEnd.setHours(23, 59, 59, 999)
      const amount = thisWeek
        .filter((e) => {
          const date = new Date(e.transaction_date)
          return date >= day.date && date <= dayEnd
        })
        .reduce((sum, e) => sum + e.amount, 0)
      return { label: day.label, dateLabel: day.dateLabel, amount }
    })

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
    }
  }, [expenses])

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-none">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Last 7 Days</h2>
                <p className="text-sm text-muted-foreground">
                  {summary.thisWeekCount} transactions
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-4xl font-bold">{formatCurrency(summary.thisWeekTotal, 'VND')}</p>
          </div>

          {/* Comparison with last week */}
          <div className="flex items-center gap-2">
            {summary.change !== 0 && (
              <>
                {summary.change > 0 ? (
                  <ArrowUpRight className="h-5 w-5 text-destructive" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-green-500" />
                )}
                <span
                  className={`text-sm font-medium ${
                    summary.change > 0 ? 'text-destructive' : 'text-green-500'
                  }`}
                >
                  {Math.abs(summary.change).toFixed(1)}%
                </span>
                <span className="text-sm text-muted-foreground">
                  vs previous 7 days
                </span>
              </>
            )}
            {summary.change === 0 && (
              <span className="text-sm text-muted-foreground">Same as previous period</span>
            )}
          </div>

          <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Previous 7 Days</p>
              <p className="text-lg font-semibold">
                {formatCurrency(summary.lastWeekTotal, 'VND')}
              </p>
              <p className="text-xs text-muted-foreground">{summary.lastWeekCount} transactions</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Daily Average</p>
              <p className="text-lg font-semibold">
                {formatCurrency(summary.avgDailySpend, 'VND')}
              </p>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Top Categories */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Top Categories</h3>
          </div>
          {summary.topCategories.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              No expenses in the last 7 days
            </p>
          ) : (
            <div className="space-y-3">
              {summary.topCategories.map(([category, amount], index) => {
                const percentage = (amount / summary.thisWeekTotal) * 100
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{CATEGORY_EMOJI[category] || '📦'}</span>
                        <span className="font-medium">{category}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(amount, 'VND')}</p>
                        <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                        className="bg-primary h-2 rounded-full"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Top Merchants */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Top Merchants</h3>
          </div>
          {summary.topMerchants.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              No expenses in the last 7 days
            </p>
          ) : (
            <div className="space-y-3">
              {summary.topMerchants.map(([merchant, amount]) => (
                <div key={merchant} className="flex items-center justify-between">
                  <p className="font-medium truncate flex-1">{merchant}</p>
                  <p className="font-semibold ml-4">{formatCurrency(amount, 'VND')}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Daily Breakdown */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Daily Breakdown</h3>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {summary.dailyTotals.map((day, index) => {
              const maxAmount = Math.max(...summary.dailyTotals.map(d => d.amount), 1)
              const height = (day.amount / maxAmount) * 100

              return (
                <div key={index} className="flex flex-col items-center">
                  <div className="w-full h-24 flex items-end justify-center mb-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(height, day.amount > 0 ? 5 : 0)}%` }}
                      transition={{ delay: 0.4 + index * 0.05, duration: 0.5 }}
                      className="w-full bg-primary/20 rounded-t-lg relative"
                    >
                      {day.amount > 0 && (
                        <div className="absolute inset-0 bg-primary/60 rounded-t-lg" />
                      )}
                    </motion.div>
                  </div>
                  <p className="text-[10px] font-medium">{day.label}</p>
                  <p className="text-[9px] text-muted-foreground">{day.dateLabel.split(' ')[1]}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {day.amount > 0 ? `${(day.amount / 1000).toFixed(0)}k` : '-'}
                  </p>
                </div>
              )
            })}
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
