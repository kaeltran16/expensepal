'use client'

import { useWorkoutStreak } from '@/lib/hooks/use-achievements'
import { motion } from 'framer-motion'
import { Flame, TrendingUp, Trophy } from 'lucide-react'

interface WorkoutStreakBadgeProps {
  compact?: boolean
}

export function WorkoutStreakBadge({ compact = false }: WorkoutStreakBadgeProps) {
  const { data: streak, isLoading } = useWorkoutStreak()

  if (isLoading) {
    return (
      <div className={`${compact ? 'h-8 w-20' : 'h-16 w-full'} bg-muted rounded-xl animate-pulse`} />
    )
  }

  if (!streak || streak.current_streak === 0) {
    if (compact) return null

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="ios-card p-4 text-center"
      >
        <Flame className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Complete a workout to start your streak!
        </p>
      </motion.div>
    )
  }

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-1.5 bg-orange-500/10 text-orange-600 px-3 py-1.5 rounded-full"
      >
        <Flame className="h-4 w-4" />
        <span className="font-bold text-sm">{streak.current_streak}</span>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="ios-card p-5 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20"
    >
      <div className="flex items-center justify-between">
        {/* Current Streak */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-orange-500/20">
            <Flame className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{streak.current_streak}</span>
              <span className="text-sm text-muted-foreground">day streak</span>
            </div>
            <p className="text-xs text-muted-foreground">Keep it up!</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4">
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end text-muted-foreground">
              <Trophy className="h-3.5 w-3.5" />
              <span className="text-xs">Best</span>
            </div>
            <span className="font-bold">{streak.longest_streak}</span>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-xs">Total</span>
            </div>
            <span className="font-bold">{streak.total_workouts}</span>
          </div>
        </div>
      </div>

      {/* Progress to next milestone */}
      {streak.current_streak > 0 && (
        <StreakProgress currentStreak={streak.current_streak} />
      )}
    </motion.div>
  )
}

function StreakProgress({ currentStreak }: { currentStreak: number }) {
  const milestones = [3, 7, 14, 30, 60, 100]
  const nextMilestone = milestones.find(m => m > currentStreak) || milestones[milestones.length - 1]!
  const prevMilestone = milestones.filter(m => m <= currentStreak).pop() || 0
  const progress = ((currentStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100

  if (currentStreak >= 100) {
    return (
      <div className="mt-4 text-center">
        <span className="text-sm text-orange-600 font-medium">
          Legendary status!
        </span>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{currentStreak} days</span>
        <span>{nextMilestone} day milestone</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
        />
      </div>
    </div>
  )
}
