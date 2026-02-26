'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Expense } from '@/lib/supabase'

interface SpendingMiniChartProps {
  expenses: Expense[]
  currency: string
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const CURRENCY_LOCALES: Record<string, string> = {
  VND: 'vi-VN',
  USD: 'en-US',
}

function formatCompact(amount: number, currency: string) {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency] ?? 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    notation: 'compact',
  }).format(amount)
}

export function SpendingMiniChart({ expenses, currency }: SpendingMiniChartProps) {
  const { dailyTotals, maxDay, weekTotal, lastWeekTotal } = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const prevWeekStart = new Date(weekStart)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)

    const totals = Array(7).fill(0)
    let week = 0
    let lastWeek = 0

    for (const e of expenses) {
      const d = new Date(e.transaction_date)
      if (d >= weekStart) {
        const dayIdx = d.getDay()
        totals[dayIdx] += e.amount
        week += e.amount
      } else if (d >= prevWeekStart && d < weekStart) {
        lastWeek += e.amount
      }
    }

    return {
      dailyTotals: totals,
      maxDay: Math.max(...totals, 1),
      weekTotal: week,
      lastWeekTotal: lastWeek,
    }
  }, [expenses])

  const todayIdx = new Date().getDay()
  const pctChange = lastWeekTotal > 0
    ? Math.round(((weekTotal - lastWeekTotal) / lastWeekTotal) * 100)
    : null

  const TrendIcon = pctChange === null || pctChange === 0 ? Minus : pctChange > 0 ? TrendingUp : TrendingDown
  const trendColor = pctChange === null || pctChange === 0
    ? 'text-muted-foreground'
    : pctChange > 0
      ? 'text-destructive'
      : 'text-success'

  return (
    <div className="ios-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">This Week</p>
        {pctChange !== null && (
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="h-3 w-3" />
            <p className="text-[10px] font-semibold">{Math.abs(pctChange)}% vs last week</p>
          </div>
        )}
      </div>

      <div className="flex items-end gap-1.5 h-16 mb-2">
        {dailyTotals.map((total, idx) => {
          const height = maxDay > 0 ? Math.max((total / maxDay) * 100, 4) : 4
          const isToday = idx === todayIdx
          const isPast = idx < todayIdx

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                className={`w-full rounded-md ${
                  isToday
                    ? 'bg-primary'
                    : isPast
                      ? 'bg-primary/30'
                      : 'bg-muted'
                }`}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ ...springs.ios, delay: idx * 0.04 }}
              />
            </div>
          )
        })}
      </div>

      <div className="flex items-end gap-1.5">
        {DAY_LABELS.map((label, idx) => (
          <p
            key={label}
            className={`flex-1 text-center text-[9px] font-medium ${
              idx === todayIdx ? 'text-primary font-bold' : 'text-muted-foreground'
            }`}
          >
            {label}
          </p>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Week total</p>
        <p className="text-sm font-bold tabular-nums">{formatCompact(weekTotal, currency)}</p>
      </div>
    </div>
  )
}
