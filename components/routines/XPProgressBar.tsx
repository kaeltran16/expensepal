'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Sparkles, Star } from 'lucide-react'
import {
  formatXP,
  getLevelForXP,
  getLevelProgress,
  getXPToNextLevel,
} from '@/lib/routine-gamification'

interface XPProgressBarProps {
  totalXp: number
  className?: string
  showDetails?: boolean
}

export function XPProgressBar({ totalXp, className, showDetails = true }: XPProgressBarProps) {
  const levelInfo = getLevelForXP(totalXp)
  const progress = getLevelProgress(totalXp)
  const xpToNext = getXPToNextLevel(totalXp)
  const isMaxLevel = levelInfo.maxXp === Infinity

  return (
    <div className={cn('space-y-2', className)}>
      {/* Level badge and title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Star className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold">Level {levelInfo.level}</span>
              <span className="text-xs text-muted-foreground">· {levelInfo.title}</span>
            </div>
            {showDetails && (
              <span className="text-xs text-muted-foreground">
                {formatXP(totalXp)} XP total
              </span>
            )}
          </div>
        </div>

        {showDetails && !isMaxLevel && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>{formatXP(xpToNext)} to next level</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Progress text */}
      {showDetails && !isMaxLevel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatXP(levelInfo.minXp)} XP</span>
          <span>{formatXP(levelInfo.maxXp)} XP</span>
        </div>
      )}

      {isMaxLevel && showDetails && (
        <p className="text-center text-xs text-emerald-600 dark:text-emerald-400">
          Max level achieved! You are a Routine Deity
        </p>
      )}
    </div>
  )
}
