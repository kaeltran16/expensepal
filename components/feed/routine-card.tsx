'use client'

import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { Sparkles, Zap, Flame as StreakIcon } from 'lucide-react'

interface RoutineCardProps {
  completedToday: boolean
  currentStreak: number
  totalXp: number
  level: number
  annotation?: string | null
  onTap: () => void
}

export function RoutineCard({
  completedToday,
  currentStreak,
  totalXp,
  level,
  annotation,
  onTap,
}: RoutineCardProps) {
  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      transition={springs.ios}
      className="w-full ios-card p-4 text-left"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-teal-600 dark:text-teal-400" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Routines</span>
        {completedToday && (
          <span className="ml-auto text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
            Done
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6 mb-2">
        <div className="flex items-center gap-2">
          <StreakIcon className="h-4 w-4 text-orange-500" />
          <div>
            <p className="text-base font-semibold tabular-nums">{currentStreak}</p>
            <p className="text-xs text-muted-foreground">day streak</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <div>
            <p className="text-base font-semibold tabular-nums">Lv.{level}</p>
            <p className="text-xs text-muted-foreground">{totalXp} XP</p>
          </div>
        </div>
      </div>

      {/* AI annotation */}
      {annotation && (
        <p className="text-xs text-muted-foreground/80 italic">{annotation}</p>
      )}
    </motion.button>
  )
}
