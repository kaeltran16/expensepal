'use client'

import { useMemo } from 'react'
import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { ScrollReveal } from '@/components/ui/scroll-reveal'
import { Wallet } from 'lucide-react'
import { SpendingCard } from '@/components/feed/spending-card'
import { CaloriesCard } from '@/components/feed/calories-card'
import { RoutineCard } from '@/components/feed/routine-card'
import {
  useExpenses,
  useBudgets,
  useMeals,
  useCalorieStats,
  useCalorieGoal,
  useWaterLog,
  useRoutineStreak,
  useRoutineStats,
  useRoutines,
  useRoutineTemplates,
  useRoutineSteps,
  useProfile,
  useFeedAnnotations,
} from '@/lib/hooks'
import type { ViewType } from '@/lib/constants/filters'

interface FeedViewProps {
  onNavigate: (view: ViewType) => void
}

function FeedCardSkeleton() {
  return (
    <motion.div
      className="w-full ios-card overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.cinematic}
    >
      <motion.div
        className="h-0.5 bg-muted"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformOrigin: 'left' }}
      />
      <div className="p-5">
        <motion.div
          initial="initial"
          animate="animate"
          variants={{
            initial: {},
            animate: { transition: { staggerChildren: 0.08 } },
          }}
          className="space-y-4"
        >
          {/* Header row */}
          <motion.div
            variants={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
            className="flex items-center gap-2.5"
          >
            <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
          </motion.div>

          {/* Amount */}
          <motion.div variants={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}>
            <div className="h-3 w-12 rounded bg-muted animate-pulse mb-1" />
            <div className="h-7 w-32 rounded bg-muted animate-pulse" />
          </motion.div>

          {/* Stat boxes */}
          <motion.div
            variants={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
            className="grid grid-cols-2 gap-2"
          >
            <div className="bg-muted/40 rounded-xl p-3 border border-border/50">
              <div className="h-3 w-10 rounded bg-muted animate-pulse mb-1" />
              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            </div>
            <div className="bg-muted/40 rounded-xl p-3 border border-border/50">
              <div className="h-3 w-10 rounded bg-muted animate-pulse mb-1" />
              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
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

  const { todayTotal, weekTotal, monthTotal, lastMonthTotal, topCategories } = useMemo(() => {
    const now = new Date()
    const todayDate = now.toDateString()
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthSameDay = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), 23, 59, 59, 999)

    let today = 0, week = 0, month = 0, lastMonth = 0
    const byCategory: Record<string, number> = {}
    for (const e of expenses) {
      const d = new Date(e.transaction_date)
      if (d.toDateString() === todayDate) today += e.amount
      if (d >= weekStart) week += e.amount
      if (d >= monthStart) {
        month += e.amount
        const cat = e.category || 'Other'
        byCategory[cat] = (byCategory[cat] || 0) + e.amount
      }
      if (d >= prevMonthStart && d <= prevMonthSameDay) lastMonth += e.amount
    }

    const categories = Object.entries(byCategory)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)

    return { todayTotal: today, weekTotal: week, monthTotal: month, lastMonthTotal: lastMonth, topCategories: categories }
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

  const { data: todayMeals = [], isLoading: mealsLoading } = useMeals(
    { startDate: todayStr, endDate: todayStr },
    { enabled: !caloriesLoading }
  )
  const mealCount = todayMeals.length
  const lastMealName = todayMeals.length > 0
    ? [...todayMeals].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())[0].name
    : null

  const { data: streakData, isLoading: routineLoading } = useRoutineStreak()
  const { data: statsData } = useRoutineStats()
  const { data: routineData } = useRoutines({ startDate: todayStr })
  const completedToday = (routineData?.completions?.length ?? 0) > 0

  const { data: templateData, isLoading: templatesLoading } = useRoutineTemplates()
  const { data: stepsData } = useRoutineSteps()

  const routineSteps = useMemo(() => {
    const completions = routineData?.completions ?? []
    const completedSteps = completions.flatMap(c => c.steps_completed ?? [])

    if (completedSteps.length > 0) {
      return completedSteps.map(s => ({
        name: s.step_name,
        completed: !s.skipped,
      }))
    }

    const templates = templateData?.templates ?? []
    const builtinSteps = stepsData?.steps ?? []
    const customSteps = stepsData?.customSteps ?? []
    if (templates.length === 0) return []

    const template = templates[0]
    const stepMap = new Map([...builtinSteps, ...customSteps].map(s => [s.id, s.name]))
    return template.steps
      .sort((a, b) => a.order - b.order)
      .map(ref => ({
        name: stepMap.get(ref.step_id) ?? 'Unknown step',
        completed: false,
      }))
  }, [routineData, templateData, stepsData])

  const hasAnyData = todayTotal > 0 || weekTotal > 0 || monthTotal > 0 || todayCalories > 0 || waterMl > 0 || completedToday
  const { data: annotations } = useFeedAnnotations({ enabled: hasAnyData })

  const isLoading = expensesLoading || caloriesLoading || routineLoading || mealsLoading || templatesLoading

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
    <div className="space-y-3">
      <ScrollReveal delay={0}>
        {isLoading ? (
          <FeedCardSkeleton />
        ) : (
          <SpendingCard
            todayTotal={todayTotal}
            weekTotal={weekTotal}
            monthTotal={monthTotal}
            lastMonthTotal={lastMonthTotal}
            dailyAllowance={dailyAllowance}
            budgetTotal={totalBudget}
            topCategories={topCategories}
            currency={currency}
            annotation={annotations?.spending}
            onTap={() => onNavigate('expenses')}
          />
        )}
      </ScrollReveal>

      <ScrollReveal delay={0.08}>
        {isLoading ? (
          <FeedCardSkeleton />
        ) : (
          <CaloriesCard
            caloriesConsumed={todayCalories}
            calorieGoal={calGoal}
            waterMl={waterMl}
            waterGoalMl={waterGoalMl}
            mealCount={mealCount}
            lastMealName={lastMealName}
            annotation={annotations?.calories}
            onTap={() => onNavigate('calories')}
          />
        )}
      </ScrollReveal>

      <ScrollReveal delay={0.16}>
        {isLoading ? (
          <FeedCardSkeleton />
        ) : (
          <RoutineCard
            completedToday={completedToday}
            currentStreak={streakData?.streak?.current_streak ?? 0}
            totalXp={statsData?.stats?.total_xp ?? 0}
            level={statsData?.stats?.current_level ?? 1}
            steps={routineSteps}
            annotation={annotations?.routine}
            onTap={() => onNavigate('routines')}
          />
        )}
      </ScrollReveal>
    </div>
  )
}
