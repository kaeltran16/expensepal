'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Flame, Trophy } from 'lucide-react'
import {
  getStreakColorClass,
  getStreakEmoji,
  getStreakMessage,
} from '@/lib/routine-gamification'
import type { UserRoutineStreak } from '@/lib/types/routines'

interface RoutineStreakBannerProps {
  streak: UserRoutineStreak | null
  className?: string
  compact?: boolean
}

export function RoutineStreakBanner({
  streak,
  className,
  compact = false,
}: RoutineStreakBannerProps) {
  const currentStreak = streak?.current_streak || 0
  const longestStreak = streak?.longest_streak || 0
  const totalCompletions = streak?.total_completions || 0

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-full bg-orange-500 px-3 py-1.5 text-white',
          className
        )}
      >
        <Flame className="h-4 w-4" />
        <span className="text-sm font-semibold">{currentStreak}</span>
        {currentStreak > 0 && <span className="text-xs">day streak</span>}
      </div>
    )
  }

  return (
    <div className={cn('ios-card overflow-hidden', className)}>
      {/* Main streak display */}
      <div className="flex items-center gap-4 p-4">
        <motion.div
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
            currentStreak > 0
              ? 'bg-gradient-to-br from-orange-400 to-orange-600'
              : 'bg-muted'
          )}
          animate={currentStreak >= 3 ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
        >
          <Flame
            className={cn(
              'h-7 w-7',
              currentStreak > 0 ? 'text-white' : 'text-muted-foreground'
            )}
          />
        </motion.div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className={cn('text-3xl font-bold tracking-tight', getStreakColorClass(currentStreak))}>
              {currentStreak}
            </span>
            <span className="text-base text-muted-foreground">
              {currentStreak === 1 ? 'day' : 'days'}
            </span>
            {currentStreak > 0 && (
              <span className="ml-1 text-lg">{getStreakEmoji(currentStreak)}</span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {getStreakMessage(currentStreak)}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex border-t border-border/50 bg-muted/30">
        <div className="flex flex-1 items-center justify-center gap-2 py-2.5">
          <Trophy className="h-4 w-4 text-amber-500" />
          <span className="text-sm">
            <span className="font-semibold">{longestStreak}</span>
            <span className="ml-1 text-muted-foreground">best</span>
          </span>
        </div>
        <div className="w-px bg-border/50" />
        <div className="flex flex-1 items-center justify-center gap-2 py-2.5">
          <span className="text-sm">
            <span className="font-semibold">{totalCompletions}</span>
            <span className="ml-1 text-muted-foreground">completed</span>
          </span>
        </div>
      </div>
    </div>
  )
}
