'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/hooks/use-motion'
import { springs, variants } from '@/lib/motion-system'
import { AnimatedCounter } from '@/components/animated-counter'
import { formatCurrency, getCurrencySymbol, getCurrencyLocale } from '@/lib/utils'
import type { Budget, Expense } from '@/lib/supabase'

interface BentoStatsProps {
  todayTotal: number
  todayCount: number
  weekTotal: number
  monthTotal: number
  currency: string
  budgets: Budget[]
  expenses: Expense[]
  onBudgetTap: () => void
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const RING_RADIUS = 18
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

export function BentoStats({
  todayTotal,
  todayCount,
  weekTotal,
  monthTotal,
  currency,
  budgets,
  expenses,
  onBudgetTap,
}: BentoStatsProps) {
  const symbol = getCurrencySymbol(currency)
  const locale = getCurrencyLocale(currency)
  const reducedMotion = useReducedMotion()

  const dayOfMonth = new Date().getDate()
  const averageDailySpend = dayOfMonth > 0 ? monthTotal / dayOfMonth : 0
  const vsAvgPct = averageDailySpend > 0
    ? Math.round(((todayTotal - averageDailySpend) / averageDailySpend) * 100)
    : null

  const { sparklineData, maxDay } = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const totals = Array(7).fill(0)
    for (const e of expenses) {
      const d = new Date(e.transaction_date)
      if (d >= weekStart) {
        totals[d.getDay()] += e.amount
      }
    }
    return { sparklineData: totals, maxDay: Math.max(...totals, 1) }
  }, [expenses])

  const todayIdx = new Date().getDay()

  const budgetData = useMemo(() => {
    if (budgets.length === 0) return null
    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
    if (totalBudget <= 0) return null

    const usedPct = Math.round((monthTotal / totalBudget) * 100)
    const overBudget = monthTotal > totalBudget
    const remaining = totalBudget - monthTotal

    const now = new Date()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const remainingDays = daysInMonth - now.getDate() + 1
    const dailyAllowance = remaining > 0 ? remaining / remainingDays : 0

    // expenses prop is already scoped to current month by the caller
    const categorySpending: Record<string, number> = {}
    for (const e of expenses) {
      const cat = e.category || 'Other'
      categorySpending[cat] = (categorySpending[cat] || 0) + e.amount
    }
    const hasAlert = budgets.some((b) => {
      const spent = categorySpending[b.category] || 0
      return (spent / b.amount) * 100 >= 80
    })

    const ringOffset = RING_CIRCUMFERENCE * (1 - Math.min(usedPct, 100) / 100)

    return { totalBudget, usedPct, overBudget, remaining, dailyAllowance, hasAlert, ringOffset }
  }, [budgets, monthTotal, expenses])

  const hasBudget = budgetData !== null

  return (
    <div className="space-y-2">
      <motion.div
        {...variants.slideUp}
        transition={springs.ios}
        className="ios-card p-4 relative overflow-hidden"
      >
        <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-primary/10 pointer-events-none" />

        <div className="flex justify-between items-center relative z-10">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Today&apos;s Spending
            </p>
            <p className="text-4xl font-black tracking-tighter leading-none">
              <span className="text-xl text-muted-foreground mr-0.5">{symbol}</span>
              <AnimatedCounter value={todayTotal} duration={1200} locale={locale} />
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">
              {todayCount} {todayCount === 1 ? 'transaction' : 'transactions'}
            </p>
            {todayTotal > 0 && vsAvgPct !== null && (
              <div
                className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-lg px-2.5 py-1 ${
                  vsAvgPct > 0
                    ? 'bg-destructive/20 text-destructive'
                    : 'bg-success/20 text-success'
                }`}
              >
                {vsAvgPct > 0 ? '↑' : '↓'} {Math.abs(vsAvgPct)}% vs avg
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <div className={`grid gap-2 ${hasBudget ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <motion.div
          {...variants.slideUp}
          transition={{ ...springs.ios, delay: 0.06 }}
          className={`ios-card p-4 ${!hasBudget ? 'col-span-1' : ''}`}
        >
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            This Week
          </p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">
            {symbol}{formatCurrency(weekTotal, currency)}
          </p>

          <div
            className="flex items-end gap-[3px] h-7 mt-2.5"
            role="img"
            aria-label={`Weekly spending: ${sparklineData.map((v, i) => `${DAY_LABELS[i]} ${formatCurrency(v, currency)}`).join(', ')}`}
          >
            {sparklineData.map((total, idx) => {
              const height = maxDay > 0 ? Math.max((total / maxDay) * 100, 4) : 4
              const isToday = idx === todayIdx
              const isPast = idx < todayIdx

              return (
                <motion.div
                  key={idx}
                  className={`flex-1 rounded-sm ${
                    isToday
                      ? 'bg-primary'
                      : isPast
                        ? 'bg-primary/25'
                        : 'bg-muted'
                  }`}
                  initial={reducedMotion ? undefined : { height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={reducedMotion ? { duration: 0 } : { ...springs.ios, delay: 0.06 + idx * 0.04 }}
                />
              )
            })}
          </div>

          <div className="flex gap-[3px] mt-1">
            {DAY_LABELS.map((label, idx) => (
              <p
                key={idx}
                className={`flex-1 text-center text-[10px] ${
                  idx === todayIdx
                    ? 'text-primary font-bold'
                    : 'text-muted-foreground/50'
                }`}
              >
                {label}
              </p>
            ))}
          </div>
        </motion.div>

        {hasBudget && budgetData && (
          <motion.button
            onClick={onBudgetTap}
            whileTap={{ scale: 0.97 }}
            {...variants.slideUp}
            transition={{ ...springs.ios, delay: 0.06 }}
            className="ios-card p-4 text-left relative"
            aria-label={`Budget ${budgetData.usedPct}% used${budgetData.hasAlert ? ', warning: category near limit' : ''}`}
          >
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
              Budget
            </p>
            <p className={`text-2xl font-bold tracking-tight tabular-nums ${
              budgetData.overBudget ? 'text-destructive' : 'text-primary'
            }`}>
              {budgetData.usedPct}%
            </p>

            <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90 mt-2" role="img">
                <title>{budgetData.usedPct}% of budget used</title>
                <circle
                  cx="22" cy="22" r={RING_RADIUS}
                  fill="none"
                  className="stroke-secondary"
                  strokeWidth="4"
                />
                <motion.circle
                  cx="22" cy="22" r={RING_RADIUS}
                  fill="none"
                  className={budgetData.overBudget ? 'stroke-destructive' : 'stroke-primary'}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  initial={reducedMotion ? undefined : { strokeDashoffset: RING_CIRCUMFERENCE }}
                  animate={{ strokeDashoffset: budgetData.ringOffset }}
                  transition={reducedMotion ? { duration: 0 } : { delay: 0.3, duration: 0.4 }}
                />
              </svg>

            <p className={`text-[11px] font-semibold mt-1.5 ${
              budgetData.overBudget ? 'text-destructive' : 'text-success'
            }`}>
              {budgetData.overBudget
                ? `Over by ${symbol}${formatCurrency(Math.abs(budgetData.remaining), currency)}`
                : `${symbol}${formatCurrency(budgetData.dailyAllowance, currency)}/day`
              }
            </p>

            {budgetData.hasAlert && (
              <div
                className="absolute top-2.5 right-3 w-2 h-2 rounded-full bg-warning"
                style={{ boxShadow: '0 0 6px hsl(var(--warning) / 0.5)' }}
              />
            )}
          </motion.button>
        )}
      </div>
    </div>
  )
}

const SKELETON_BAR_HEIGHTS = [40, 65, 30, 80, 55, 45, 70]

export function BentoStatsSkeleton() {
  return (
    <div className="space-y-2">
      {/* Today skeleton */}
      <div className="ios-card p-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-3 w-24 rounded bg-muted animate-pulse mb-3" />
            <div className="h-9 w-32 rounded bg-muted animate-pulse" />
          </div>
          <div className="text-right space-y-2">
            <div className="h-3 w-20 rounded bg-muted animate-pulse ml-auto" />
            <div className="h-6 w-24 rounded-lg bg-muted animate-pulse ml-auto" />
          </div>
        </div>
      </div>

      {/* Week + Budget skeleton */}
      <div className="grid grid-cols-2 gap-2">
        <div className="ios-card p-4 space-y-3">
          <div className="h-2.5 w-16 rounded bg-muted animate-pulse" />
          <div className="h-6 w-20 rounded bg-muted animate-pulse" />
          <div className="flex items-end gap-[3px] h-7">
            {SKELETON_BAR_HEIGHTS.map((h, i) => (
              <div key={i} className="flex-1 bg-muted rounded-sm animate-pulse" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="ios-card p-4 space-y-3">
          <div className="h-2.5 w-12 rounded bg-muted animate-pulse" />
          <div className="h-6 w-14 rounded bg-muted animate-pulse" />
          <div className="w-11 h-11 rounded-full bg-muted animate-pulse" />
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  )
}
