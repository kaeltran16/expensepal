'use client'

import { AnimatedCounter } from '@/components/animated-counter'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { queryKeys } from '@/lib/hooks/query-keys'
import { useCalorieGoal, useCalorieStats, useUpdateCalorieGoal } from '@/lib/hooks/use-meals'
import { getMillisecondsUntilMidnightGMT7, getTodayRangeGMT7 } from '@/lib/timezone'
import { hapticFeedback } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { Flame, Settings, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

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

  // Calculate today's date range in GMT+7
  const { startDate, endDate, todayDate } = useMemo(() => {
    return getTodayRangeGMT7()
  }, [currentDay]) // Re-calculate when day changes

  // Set up midnight reset timer in GMT+7
  useEffect(() => {
    const msUntilMidnight = getMillisecondsUntilMidnightGMT7()

    console.log(`⏰ Scheduling calorie reset in ${Math.round(msUntilMidnight / 1000 / 60)} minutes (GMT+7 midnight)`)

    const timer = setTimeout(() => {
      console.log('🌅 Midnight in GMT+7! Resetting calories...')

      // Update the current day to trigger re-calculation
      setCurrentDay(getTodayRangeGMT7().todayDate)

      // Invalidate all calorie-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.calorieStats.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.meals.all })

      // Set up next day's timer
      const nextReset = getMillisecondsUntilMidnightGMT7()
      console.log(`⏰ Next reset in ${Math.round(nextReset / 1000 / 60)} minutes`)
    }, msUntilMidnight)

    return () => clearTimeout(timer)
  }, [currentDay, queryClient])

  // Fetch data using TanStack Query hooks
  const { data: goal, isLoading: goalLoading } = useCalorieGoal()
  const { data: statsData, isLoading: statsLoading } = useCalorieStats({
    startDate,
    endDate,
  })
  const updateGoalMutation = useUpdateCalorieGoal()

  const loading = goalLoading || statsLoading

  // Initialize form values when goal data is loaded
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

  // Extract today's stats from the response
  const today: DailyStats = useMemo(() => {
    if (!statsData?.byDate) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 }
    }

    return (
      statsData.byDate[todayDate] ||
      { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 }
    )
  }, [statsData, todayDate])

  if (loading) {
    return (
      <Card className="frosted-card border-l-4 border-l-orange-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-3 border-t">
            <div className="text-center space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="text-center space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
            <div className="text-center space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!goal) return null

  const progress = (today.calories / goal.daily_calories) * 100
  const remaining = goal.daily_calories - today.calories
  const isOverBudget = remaining < 0

  return (
    <Card className="frosted-card border-l-4 border-l-orange-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-base">Today's Calories</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setIsDialogOpen(true);
              hapticFeedback('light');
            }}
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* Bottom Sheet for Goals */}
          <AnimatePresence>
            {isDialogOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => {
                    setIsDialogOpen(false);
                    hapticFeedback('light');
                  }}
                  className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
                />

                {/* Sheet */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{
                    duration: 0.35,
                    ease: [0.32, 0.72, 0, 1],
                  }}
                  className="fixed inset-x-0 bottom-0 z-[70] bg-card/95 backdrop-blur-xl rounded-t-[2rem] shadow-2xl border-t border-border/50"
                  style={{ maxHeight: '85vh' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="overflow-y-auto overscroll-contain"
                    style={{ maxHeight: '85vh' }}
                  >
                    {/* Handle bar */}
                    <div className="flex justify-center pt-4 pb-3">
                      <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full" />
                    </div>

                    {/* Header */}
                    <div className="relative px-6 pb-4 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                            <Flame className="w-6 h-6 text-orange-500" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold">Adjust Daily Goals</h2>
                            <p className="text-sm text-muted-foreground">Set your daily calorie and macro targets</p>
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
                        <Button
                          type="button"
                          onClick={handleSaveGoal}
                          disabled={updateGoalMutation.isPending}
                          className="flex-1 h-12 sm:h-14 text-base font-bold shadow-lg"
                        >
                          {updateGoalMutation.isPending ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              <span>Saving...</span>
                            </div>
                          ) : (
                            '✓ Save Goals'
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main calorie counter */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <AnimatedCounter
                value={today.calories}
                className="text-5xl font-bold"
              />
              <span className="text-muted-foreground text-base">
                / {goal.daily_calories.toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <div className={`text-lg font-bold ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {isOverBudget ? '+' : ''}{Math.abs(remaining).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {isOverBudget ? 'over' : 'left'}
              </div>
            </div>
          </div>

          <Progress value={Math.min(progress, 100)} className="h-3" />
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t">
          {/* Protein */}
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Protein</div>
            <div className="font-bold text-sm text-blue-600 dark:text-blue-400">
              {Math.round(today.protein)}
              {goal.protein_target && <span className="text-muted-foreground font-normal">/{goal.protein_target}</span>}
              <span className="text-xs ml-0.5">g</span>
            </div>
          </div>

          {/* Carbs */}
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Carbs</div>
            <div className="font-bold text-sm text-amber-600 dark:text-amber-400">
              {Math.round(today.carbs)}
              {goal.carbs_target && <span className="text-muted-foreground font-normal">/{goal.carbs_target}</span>}
              <span className="text-xs ml-0.5">g</span>
            </div>
          </div>

          {/* Fat */}
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Fat</div>
            <div className="font-bold text-sm text-green-600 dark:text-green-400">
              {Math.round(today.fat)}
              {goal.fat_target && <span className="text-muted-foreground font-normal">/{goal.fat_target}</span>}
              <span className="text-xs ml-0.5">g</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
