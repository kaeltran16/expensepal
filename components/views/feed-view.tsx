'use client'

import { useMemo } from 'react'
import { Wallet, Flame, Sparkles } from 'lucide-react'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { SpendingHero } from '@/components/feed/spending-hero'
import { CompactWidget } from '@/components/feed/compact-widget'
import { SpendingMiniChart } from '@/components/feed/spending-mini-chart'
import { QuickActions } from '@/components/feed/quick-actions'
import {
  useExpenses,
  useBudgets,
  useCalorieStats,
  useCalorieGoal,
  useRoutineStreak,
  useRoutineStats,
  useRoutines,
  useRoutineTemplates,
  useProfile,
} from '@/lib/hooks'
import type { ViewType } from '@/lib/constants/filters'

interface FeedViewProps {
  onNavigate: (view: ViewType) => void
}

function FeedCardSkeleton() {
  return (
    <div className="w-full ios-card overflow-hidden">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="h-3 w-20 rounded bg-muted animate-pulse mb-3" />
            <div className="h-9 w-32 rounded bg-muted animate-pulse" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-muted animate-pulse" />
        </div>
        {/* Stat boxes */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/40 rounded-xl p-3.5 border border-border/50">
            <div className="h-3 w-12 rounded bg-muted animate-pulse mb-2" />
            <div className="h-5 w-20 rounded bg-muted animate-pulse" />
          </div>
          <div className="bg-muted/40 rounded-xl p-3.5 border border-border/50">
            <div className="h-3 w-12 rounded bg-muted animate-pulse mb-2" />
            <div className="h-5 w-20 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function FeedView({ onNavigate }: FeedViewProps) {
  const { data: profile } = useProfile()
  const currency = profile?.currency || 'VND'

  const dayKey = new Date().toDateString()
  const { todayStr, lastMonthStart, currentMonth } = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const d = now.getDate()
    return {
      todayStr: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      lastMonthStart: new Date(y, m - 1, 1).toISOString().split('T')[0],
      currentMonth: `${y}-${String(m + 1).padStart(2, '0')}`,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayKey])

  const { data: expenses = [], isLoading: expensesLoading } = useExpenses({
    startDate: lastMonthStart,
  })
  const { data: budgets = [] } = useBudgets({ month: currentMonth })

  const { todayTotal, weekTotal, monthTotal } = useMemo(() => {
    const now = new Date()
    const todayDate = now.toDateString()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let today = 0, week = 0, month = 0
    for (const e of expenses) {
      const d = new Date(e.transaction_date)
      if (d.toDateString() === todayDate) today += e.amount
      if (d >= weekStart) week += e.amount
      if (d >= monthStart) month += e.amount
    }

    return { todayTotal: today, weekTotal: week, monthTotal: month }
  }, [expenses])

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)

  const { data: calorieStats, isLoading: caloriesLoading } = useCalorieStats({
    startDate: todayStr,
    endDate: todayStr,
  })
  const { data: calorieGoal } = useCalorieGoal()

  const todayCalories = calorieStats?.totalCalories ?? 0
  const calGoal = calorieGoal?.daily_calories ?? null

  const { data: streakData, isLoading: routineLoading } = useRoutineStreak()
  const { data: statsData } = useRoutineStats()
  const { data: routineData } = useRoutines({ startDate: todayStr })
  const completedToday = (routineData?.completions?.length ?? 0) > 0

  const { data: templateData } = useRoutineTemplates()
  const totalSteps = templateData?.templates?.[0]?.steps?.length ?? 0
  const completedCount = routineData?.completions?.[0]?.steps_completed?.filter(s => !s.skipped)?.length ?? 0

  const isLoading = expensesLoading || caloriesLoading || routineLoading

  const hasAnyData = todayTotal > 0 || weekTotal > 0 || monthTotal > 0 || todayCalories > 0 || completedToday

  if (!isLoading && !hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Wallet className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Welcome to your daily feed</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Start by logging an expense, meal, or completing a routine to see your dashboard come alive.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Spending hero */}
      <ScrollReveal delay={0}>
        {isLoading ? (
          <FeedCardSkeleton />
        ) : (
          <SpendingHero
            todayTotal={todayTotal}
            weekTotal={weekTotal}
            monthTotal={monthTotal}
            budgetTotal={totalBudget}
            currency={currency}
            onTap={() => onNavigate('expenses')}
          />
        )}
      </ScrollReveal>

      {/* Compact widget row */}
      <ScrollReveal delay={0.06}>
        {isLoading ? (
          <div className="flex gap-2.5">
            <div className="flex-1 ios-card p-3.5 space-y-2">
              <div className="h-3 w-14 rounded bg-muted animate-pulse" />
              <div className="h-5 w-10 rounded bg-muted animate-pulse" />
            </div>
            <div className="flex-1 ios-card p-3.5 space-y-2">
              <div className="h-3 w-14 rounded bg-muted animate-pulse" />
              <div className="h-5 w-10 rounded bg-muted animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="flex gap-2.5">
            <CompactWidget
              icon={Flame}
              iconColor="text-accent"
              iconBg="bg-accent/10"
              label="Calories"
              value={`${Math.round(todayCalories)}`}
              subtitle={calGoal ? `/ ${calGoal} cal` : undefined}
              onTap={() => onNavigate('calories')}
            />
            <CompactWidget
              icon={Sparkles}
              iconColor="text-success"
              iconBg="bg-success/10"
              label="Routine"
              value={completedToday ? 'Done' : `${completedCount}/${totalSteps}`}
              subtitle={`${streakData?.streak?.current_streak ?? 0} day streak`}
              onTap={() => onNavigate('routines')}
            />
          </div>
        )}
      </ScrollReveal>

      {/* Quick actions */}
      <ScrollReveal delay={0.12}>
        {!isLoading && (
          <QuickActions
            completedToday={completedToday}
            onNavigate={onNavigate}
          />
        )}
      </ScrollReveal>

      {/* Weekly spending insight */}
      <ScrollReveal delay={0.18}>
        {!isLoading && (
          <SpendingMiniChart
            expenses={expenses}
            currency={currency}
          />
        )}
      </ScrollReveal>
    </div>
  )
}
