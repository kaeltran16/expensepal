'use client'

import { motion } from 'framer-motion'
import { Flame, Trophy } from 'lucide-react'
import { useMealStreak } from '@/lib/hooks'

export function StreakCounter() {
  const { data: streak, isLoading } = useMealStreak()

  if (isLoading) {
    return (
      <div className="ios-card p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  const currentStreak = streak?.currentStreak || 0
  const bestStreak = streak?.bestStreak || 0

  // Determine fire color based on streak
  const getFireColor = () => {
    if (currentStreak >= 30) return 'text-purple-500'
    if (currentStreak >= 14) return 'text-orange-500'
    if (currentStreak >= 7) return 'text-yellow-500'
    if (currentStreak >= 3) return 'text-orange-400'
    return 'text-muted-foreground'
  }

  const getFireBgColor = () => {
    if (currentStreak >= 30) return 'bg-purple-100 dark:bg-purple-900/30'
    if (currentStreak >= 14) return 'bg-orange-100 dark:bg-orange-900/30'
    if (currentStreak >= 7) return 'bg-yellow-100 dark:bg-yellow-900/30'
    if (currentStreak >= 3) return 'bg-orange-100 dark:bg-orange-900/30'
    return 'bg-muted'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="ios-card p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className={`w-12 h-12 rounded-full ${getFireBgColor()} flex items-center justify-center`}
            animate={currentStreak > 0 ? { scale: [1, 1.1, 1] } : undefined}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
          >
            <Flame className={`h-6 w-6 ${getFireColor()}`} />
          </motion.div>
          <div>
            <p className="text-2xl font-bold">
              {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
            </p>
            <p className="text-sm text-muted-foreground">Current streak</p>
          </div>
        </div>

        {bestStreak > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="h-4 w-4" />
            <span className="text-sm">Best: {bestStreak}</span>
          </div>
        )}
      </div>

      {currentStreak === 0 && (
        <p className="text-sm text-muted-foreground mt-2">
          Log a meal to start your streak!
        </p>
      )}
    </motion.div>
  )
}
