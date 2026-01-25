'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Flame,
  Dumbbell,
  Cookie,
  Droplet,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
} from 'lucide-react'
import { useCalorieStats, useCalorieGoal } from '@/lib/hooks/use-meals'

export function WeeklyNutritionSummary() {
  // Get stats for the last 7 days
  const today = new Date()
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  const { data: stats, isLoading } = useCalorieStats({
    startDate: weekAgo.toISOString(),
    endDate: today.toISOString(),
  })

  const { data: goal } = useCalorieGoal()

  const summary = useMemo(() => {
    if (!stats || !stats.byDate) return null

    const dates = Object.keys(stats.byDate)
    if (dates.length === 0) return null

    const daysWithData = dates.length
    const totalCalories = stats.totalCalories
    const totalProtein = stats.totalProtein
    const totalCarbs = stats.totalCarbs
    const totalFat = stats.totalFat

    const avgCalories = Math.round(totalCalories / daysWithData)
    const avgProtein = Math.round(totalProtein / daysWithData)
    const avgCarbs = Math.round(totalCarbs / daysWithData)
    const avgFat = Math.round(totalFat / daysWithData)

    // Find best and worst days
    let bestDay = { date: '', calories: 0 }
    let worstDay = { date: '', calories: Infinity }

    Object.entries(stats.byDate).forEach(([date, data]) => {
      if (data.calories > bestDay.calories) {
        bestDay = { date, calories: data.calories }
      }
      if (data.calories < worstDay.calories && data.calories > 0) {
        worstDay = { date, calories: data.calories }
      }
    })

    // Compare to goal
    const goalCalories = goal?.daily_calories || 2000
    const goalProtein = goal?.protein_target || 100
    const goalCarbs = goal?.carbs_target || 250
    const goalFat = goal?.fat_target || 65

    const caloriesDiff = avgCalories - goalCalories
    const proteinDiff = avgProtein - goalProtein
    const carbsDiff = avgCarbs - goalCarbs
    const fatDiff = avgFat - goalFat

    return {
      daysWithData,
      avgCalories,
      avgProtein,
      avgCarbs,
      avgFat,
      bestDay: bestDay.calories > 0 ? bestDay : null,
      worstDay: worstDay.calories < Infinity ? worstDay : null,
      goalCalories,
      goalProtein,
      goalCarbs,
      goalFat,
      caloriesDiff,
      proteinDiff,
      carbsDiff,
      fatDiff,
    }
  }, [stats, goal])

  if (isLoading) {
    return (
      <div className="ios-card p-4 animate-pulse">
        <div className="h-5 w-40 rounded bg-muted mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="ios-card p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Weekly Nutrition</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          No meal data for this week yet. Start logging meals to see your weekly summary!
        </p>
      </motion.div>
    )
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const getDiffIcon = (diff: number) => {
    if (diff > 10) return <TrendingUp className="h-3 w-3" />
    if (diff < -10) return <TrendingDown className="h-3 w-3" />
    return <Minus className="h-3 w-3" />
  }

  const getDiffColor = (diff: number, isCalories = false) => {
    // For calories, being over is red, under is green
    // For macros, being close to goal is good
    if (isCalories) {
      if (diff > 100) return 'text-red-500'
      if (diff < -200) return 'text-yellow-500'
      return 'text-green-500'
    }
    // For macros, being under is less ideal
    if (diff < -20) return 'text-yellow-500'
    if (diff > 20) return 'text-blue-500'
    return 'text-green-500'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="ios-card p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Weekly Nutrition</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {summary.daysWithData} days logged
        </span>
      </div>

      {/* Main stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Calories */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
              Avg Calories
            </span>
          </div>
          <p className="text-2xl font-bold">{summary.avgCalories}</p>
          <div
            className={`flex items-center gap-1 text-xs ${getDiffColor(summary.caloriesDiff, true)}`}
          >
            {getDiffIcon(summary.caloriesDiff)}
            <span>
              {summary.caloriesDiff > 0 ? '+' : ''}
              {summary.caloriesDiff} vs goal
            </span>
          </div>
        </motion.div>

        {/* Protein */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <Dumbbell className="h-4 w-4 text-red-500" />
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              Avg Protein
            </span>
          </div>
          <p className="text-2xl font-bold">{summary.avgProtein}g</p>
          <div
            className={`flex items-center gap-1 text-xs ${getDiffColor(summary.proteinDiff)}`}
          >
            {getDiffIcon(summary.proteinDiff)}
            <span>
              {summary.proteinDiff > 0 ? '+' : ''}
              {summary.proteinDiff}g vs goal
            </span>
          </div>
        </motion.div>

        {/* Carbs */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <Cookie className="h-4 w-4 text-yellow-500" />
            <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
              Avg Carbs
            </span>
          </div>
          <p className="text-2xl font-bold">{summary.avgCarbs}g</p>
          <div
            className={`flex items-center gap-1 text-xs ${getDiffColor(summary.carbsDiff)}`}
          >
            {getDiffIcon(summary.carbsDiff)}
            <span>
              {summary.carbsDiff > 0 ? '+' : ''}
              {summary.carbsDiff}g vs goal
            </span>
          </div>
        </motion.div>

        {/* Fat */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <Droplet className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Avg Fat
            </span>
          </div>
          <p className="text-2xl font-bold">{summary.avgFat}g</p>
          <div
            className={`flex items-center gap-1 text-xs ${getDiffColor(summary.fatDiff)}`}
          >
            {getDiffIcon(summary.fatDiff)}
            <span>
              {summary.fatDiff > 0 ? '+' : ''}
              {summary.fatDiff}g vs goal
            </span>
          </div>
        </motion.div>
      </div>

      {/* Best/Worst days */}
      {(summary.bestDay || summary.worstDay) && (
        <div className="flex gap-3 text-xs">
          {summary.bestDay && (
            <div className="flex-1 bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
              <p className="text-green-600 dark:text-green-400 font-medium">
                Best Day
              </p>
              <p className="text-muted-foreground">
                {formatDate(summary.bestDay.date)} - {summary.bestDay.calories} cal
              </p>
            </div>
          )}
          {summary.worstDay && summary.worstDay.date !== summary.bestDay?.date && (
            <div className="flex-1 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2">
              <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                Lowest Day
              </p>
              <p className="text-muted-foreground">
                {formatDate(summary.worstDay.date)} - {summary.worstDay.calories} cal
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
