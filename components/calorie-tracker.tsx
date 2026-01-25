'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Settings, X, Check, Target } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { AnimatedCounter } from '@/components/animated-counter'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { queryKeys } from '@/lib/hooks/query-keys'
import { useCalorieGoal, useCalorieStats, useUpdateCalorieGoal } from '@/lib/hooks/use-meals'
import { getMillisecondsUntilMidnightGMT7, getTodayRangeGMT7 } from '@/lib/timezone'
import { hapticFeedback } from '@/lib/utils'

interface DailyStats {
  calories: number
  protein: number
  carbs: number
  fat: number
  meals: number
}

export function CalorieTracker() {
  const queryClient = useQueryClient()
  const [currentDay, setCurrentDay] = useState(() => getTodayRangeGMT7().todayDate)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [dailyCalories, setDailyCalories] = useState('')
  const [proteinTarget, setProteinTarget] = useState('')
  const [carbsTarget, setCarbsTarget] = useState('')
  const [fatTarget, setFatTarget] = useState('')

  const { startDate, endDate, todayDate } = useMemo(() => {
    return getTodayRangeGMT7()
  }, [currentDay])

  // Set up midnight reset timer in GMT+7
  useEffect(() => {
    const msUntilMidnight = getMillisecondsUntilMidnightGMT7()
    console.log(`⏰ Scheduling calorie reset in ${Math.round(msUntilMidnight / 1000 / 60)} minutes (GMT+7 midnight)`)

    const timer = setTimeout(() => {
      console.log('🌅 Midnight in GMT+7! Resetting calories...')
      setCurrentDay(getTodayRangeGMT7().todayDate)
      queryClient.invalidateQueries({ queryKey: queryKeys.calorieStats.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.meals.all })
      const nextReset = getMillisecondsUntilMidnightGMT7()
      console.log(`⏰ Next reset in ${Math.round(nextReset / 1000 / 60)} minutes`)
    }, msUntilMidnight)

    return () => clearTimeout(timer)
  }, [currentDay, queryClient])

  const { data: goal, isLoading: goalLoading } = useCalorieGoal()
  const { data: statsData, isLoading: statsLoading } = useCalorieStats({ startDate, endDate })
  const updateGoalMutation = useUpdateCalorieGoal()

  const loading = goalLoading || statsLoading

  useEffect(() => {
    if (goal) {
      setDailyCalories(goal.daily_calories.toString())
      setProteinTarget(goal.protein_target?.toString() || '')
      setCarbsTarget(goal.carbs_target?.toString() || '')
      setFatTarget(goal.fat_target?.toString() || '')
    }
  }, [goal])

  const handleSaveGoal = async () => {
    try {
      await updateGoalMutation.mutateAsync({
        daily_calories: parseInt(dailyCalories),
        protein_target: proteinTarget ? parseInt(proteinTarget) : undefined,
        carbs_target: carbsTarget ? parseInt(carbsTarget) : undefined,
        fat_target: fatTarget ? parseInt(fatTarget) : undefined,
      })
      setIsDialogOpen(false)
      hapticFeedback('medium')
    } catch (error) {
      console.error('Failed to update goal:', error)
      hapticFeedback('medium')
    }
  }

  const today: DailyStats = useMemo(() => {
    if (!statsData?.byDate) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 }
    }
    return statsData.byDate[todayDate] || { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 }
  }, [statsData, todayDate])

  if (loading) {
    return (
      <div className="ios-card p-5 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 rounded bg-muted" />
          <div className="h-6 w-24 rounded bg-muted" />
        </div>
        <div className="h-16 rounded bg-muted mb-4" />
        <div className="h-3 rounded-full bg-muted mb-4" />
        <div className="grid grid-cols-3 gap-3">
          <div className="h-12 rounded bg-muted" />
          <div className="h-12 rounded bg-muted" />
          <div className="h-12 rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (!goal) return null

  const progress = Math.min(100, (today.calories / goal.daily_calories) * 100)
  const remaining = goal.daily_calories - today.calories
  const isOverBudget = remaining < 0

  // Calculate macro percentages
  const proteinPercent = goal.protein_target ? Math.min(100, (today.protein / goal.protein_target) * 100) : 0
  const carbsPercent = goal.carbs_target ? Math.min(100, (today.carbs / goal.carbs_target) * 100) : 0
  const fatPercent = goal.fat_target ? Math.min(100, (today.fat / goal.fat_target) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="ios-card p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Flame className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Today's Calories</h3>
            <p className="text-xs text-muted-foreground">
              {today.meals} meal{today.meals !== 1 ? 's' : ''} logged
            </p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setIsDialogOpen(true)
            hapticFeedback('light')
          }}
          className="w-10 h-10 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
        </motion.button>
      </div>

      {/* Main calorie display */}
      <div className="flex items-end justify-between mb-4">
        <div className="flex items-baseline gap-2">
          <AnimatedCounter
            value={today.calories}
            className="text-4xl font-bold"
          />
          <span className="text-lg text-muted-foreground">
            / {goal.daily_calories.toLocaleString()}
          </span>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold ${isOverBudget ? 'text-red-500' : 'text-green-500'}`}>
            {isOverBudget ? '+' : ''}{Math.abs(remaining).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            {isOverBudget ? 'over' : 'left'}
          </div>
        </div>
      </div>

      {/* Animated progress bar */}
      <div className="relative h-3 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`absolute inset-y-0 left-0 rounded-full ${
            isOverBudget
              ? 'bg-gradient-to-r from-red-400 to-red-600'
              : progress >= 100
                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                : 'bg-gradient-to-r from-orange-400 to-red-500'
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      </div>

      {/* Macro nutrients */}
      <div className="grid grid-cols-3 gap-3">
        {/* Protein */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20"
        >
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Protein</div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {Math.round(today.protein)}
            </span>
            {goal.protein_target && (
              <span className="text-xs text-muted-foreground">/{goal.protein_target}g</span>
            )}
          </div>
          {goal.protein_target && (
            <div className="h-1 rounded-full bg-blue-200 dark:bg-blue-800 mt-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${proteinPercent}%` }}
                className="h-full bg-blue-500 rounded-full"
              />
            </div>
          )}
        </motion.div>

        {/* Carbs */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20"
        >
          <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Carbs</div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {Math.round(today.carbs)}
            </span>
            {goal.carbs_target && (
              <span className="text-xs text-muted-foreground">/{goal.carbs_target}g</span>
            )}
          </div>
          {goal.carbs_target && (
            <div className="h-1 rounded-full bg-amber-200 dark:bg-amber-800 mt-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${carbsPercent}%` }}
                className="h-full bg-amber-500 rounded-full"
              />
            </div>
          )}
        </motion.div>

        {/* Fat */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20"
        >
          <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Fat</div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              {Math.round(today.fat)}
            </span>
            {goal.fat_target && (
              <span className="text-xs text-muted-foreground">/{goal.fat_target}g</span>
            )}
          </div>
          {goal.fat_target && (
            <div className="h-1 rounded-full bg-green-200 dark:bg-green-800 mt-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${fatPercent}%` }}
                className="h-full bg-green-500 rounded-full"
              />
            </div>
          )}
        </motion.div>
      </div>

      {/* Goal reached celebration */}
      {progress >= 100 && !isOverBudget && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-2 mt-4 py-3 px-4 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800/50"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-md shadow-green-500/30"
          >
            <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
          </motion.div>
          <span className="text-sm font-semibold text-green-700 dark:text-green-400">
            Daily calorie goal reached!
          </span>
        </motion.div>
      )}

      {/* Settings Bottom Sheet */}
      <AnimatePresence>
        {isDialogOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setIsDialogOpen(false)
                hapticFeedback('light')
              }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-x-0 bottom-0 z-[70] bg-card/95 backdrop-blur-xl rounded-t-[2rem] shadow-2xl border-t border-border/50"
              style={{ maxHeight: '85vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: '85vh' }}>
                {/* Handle bar */}
                <div className="flex justify-center pt-4 pb-3">
                  <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
                </div>

                {/* Header */}
                <div className="relative px-6 pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">Daily Goals</h2>
                        <p className="text-sm text-muted-foreground">Set your nutrition targets</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsDialogOpen(false)}
                      className="h-9 w-9"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="calories" className="text-sm font-medium">
                      Daily Calories
                    </Label>
                    <Input
                      id="calories"
                      type="number"
                      inputMode="numeric"
                      value={dailyCalories}
                      onChange={(e) => setDailyCalories(e.target.value)}
                      placeholder="2000"
                      className="h-12 text-lg"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="protein" className="text-xs font-medium">
                        Protein (g)
                      </Label>
                      <Input
                        id="protein"
                        type="number"
                        inputMode="numeric"
                        value={proteinTarget}
                        onChange={(e) => setProteinTarget(e.target.value)}
                        placeholder="150"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carbs" className="text-xs font-medium">
                        Carbs (g)
                      </Label>
                      <Input
                        id="carbs"
                        type="number"
                        inputMode="numeric"
                        value={carbsTarget}
                        onChange={(e) => setCarbsTarget(e.target.value)}
                        placeholder="200"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fat" className="text-xs font-medium">
                        Fat (g)
                      </Label>
                      <Input
                        id="fat"
                        type="number"
                        inputMode="numeric"
                        value={fatTarget}
                        onChange={(e) => setFatTarget(e.target.value)}
                        placeholder="65"
                        className="h-12"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="border-t bg-background p-4 sm:p-6 flex-shrink-0">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1 h-12 sm:h-14 text-base font-medium"
                      disabled={updateGoalMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSaveGoal}
                      disabled={updateGoalMutation.isPending}
                      className="flex-1 h-12 sm:h-14 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold text-base shadow-lg shadow-orange-500/25 disabled:opacity-50"
                    >
                      {updateGoalMutation.isPending ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          <span>Saving...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <Check className="h-5 w-5" />
                          <span>Save Goals</span>
                        </div>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
