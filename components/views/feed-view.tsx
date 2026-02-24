'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { springs, getStaggerDelay } from '@/lib/motion-system'
import { Wallet } from 'lucide-react'
import { SpendingCard } from '@/components/feed/spending-card'
import { CaloriesCard } from '@/components/feed/calories-card'
import { RoutineCard } from '@/components/feed/routine-card'
import {
  useExpenses,
  useBudgets,
  useCalorieStats,
  useCalorieGoal,
  useWaterLog,
  useRoutineStreak,
  useRoutineStats,
  useRoutines,
  useProfile,
  useFeedAnnotations,
} from '@/lib/hooks'
import type { ViewType } from '@/lib/constants/filters'

interface FeedViewProps {
  onNavigate: (view: ViewType) => void
}

function FeedCardSkeleton() {
  return (
    <div className="w-full ios-card p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-muted" />
        <div className="h-4 w-20 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-3 gap-3 mb-2">
        <div><div className="h-3 w-10 rounded bg-muted mb-1" /><div className="h-5 w-16 rounded bg-muted" /></div>
        <div><div className="h-3 w-10 rounded bg-muted mb-1" /><div className="h-5 w-16 rounded bg-muted" /></div>
        <div><div className="h-3 w-10 rounded bg-muted mb-1" /><div className="h-5 w-16 rounded bg-muted" /></div>
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

  const { todayTotal, weekTotal, monthTotal, lastMonthTotal } = useMemo(() => {
    const now = new Date()
    const todayDate = now.toDateString()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthSameDay = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 23, 59, 59, 999)

    let today = 0, week = 0, month = 0, lastMonth = 0
    for (const e of expenses) {
      const d = new Date(e.transaction_date)
      if (d.toDateString() === todayDate) today += e.amount
      if (d >= weekStart) week += e.amount
      if (d >= monthStart) month += e.amount
      if (d >= prevMonthStart && d <= prevMonthSameDay) lastMonth += e.amount
    }
    return { todayTotal: today, weekTotal: week, monthTotal: month, lastMonthTotal: lastMonth }
  }, [expenses])

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysRemaining = daysInMonth - now.getDate()
  const dailyAllowance = totalBudget > 0 && daysRemaining > 0
    ? Math.round((totalBudget - monthTotal) / daysRemaining)
    : null

  const { data: calorieStats, isLoading: caloriesLoading } = useCalorieStats({
    startDate: todayStr,
    endDate: todayStr,
  })
  const { data: calorieGoal } = useCalorieGoal()
  const { data: waterData } = useWaterLog(todayStr)

  const todayCalories = calorieStats?.totalCalories ?? 0
  const calGoal = calorieGoal?.daily_calories ?? null
  const waterMl = waterData?.waterLog?.amount_ml ?? 0
  const waterGoalMl = waterData?.daily_goal_ml ?? 2500

  const { data: streakData, isLoading: routineLoading } = useRoutineStreak()
  const { data: statsData } = useRoutineStats()
  const { data: routineData } = useRoutines({ startDate: todayStr })
  const completedToday = (routineData?.completions?.length ?? 0) > 0

  const hasAnyData = todayTotal > 0 || weekTotal > 0 || monthTotal > 0 || todayCalories > 0 || waterMl > 0 || completedToday
  const { data: annotations } = useFeedAnnotations({ enabled: hasAnyData })

  if (!expensesLoading && !caloriesLoading && !routineLoading && !hasAnyData) {
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
    <div className="space-y-3">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springs.ios, delay: getStaggerDelay(0) }}
      >
        {expensesLoading ? (
          <FeedCardSkeleton />
        ) : (
          <SpendingCard
            todayTotal={todayTotal}
            weekTotal={weekTotal}
            monthTotal={monthTotal}
            lastMonthTotal={lastMonthTotal}
            dailyAllowance={dailyAllowance}
            currency={currency}
            annotation={annotations?.spending}
            onTap={() => onNavigate('expenses')}
          />
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springs.ios, delay: getStaggerDelay(1) }}
      >
        {caloriesLoading ? (
          <FeedCardSkeleton />
        ) : (
          <CaloriesCard
            caloriesConsumed={todayCalories}
            calorieGoal={calGoal}
            waterMl={waterMl}
            waterGoalMl={waterGoalMl}
            annotation={annotations?.calories}
            onTap={() => onNavigate('calories')}
          />
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springs.ios, delay: getStaggerDelay(2) }}
      >
        {routineLoading ? (
          <FeedCardSkeleton />
        ) : (
          <RoutineCard
            completedToday={completedToday}
            currentStreak={streakData?.streak?.current_streak ?? 0}
            totalXp={statsData?.stats?.total_xp ?? 0}
            level={statsData?.stats?.current_level ?? 1}
            annotation={annotations?.routine}
            onTap={() => onNavigate('routines')}
          />
        )}
      </motion.div>
    </div>
  )
}
