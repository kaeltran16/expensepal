'use client'

import { useEffect, useState, useMemo, useCallback, memo } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence, animate } from 'framer-motion'
import { Award, Check, Clock, Flame, Sparkles, Star, TrendingUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'
import { XPProgressBar } from './XPProgressBar'
import { formatXP, checkLevelUp, getLevelForXP } from '@/lib/routine-gamification'
import { rewardLevelUp, rewardRoutineComplete, rewardPerfectRoutine } from '@/lib/micro-rewards'
import type { XPBreakdown, CompletedStep, Achievement } from '@/lib/types/routines'

// Memoized achievement item to prevent re-renders during XP animation
const AchievementItem = memo(function AchievementItem({ achievement }: { achievement: Achievement }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-3 dark:bg-amber-900/30">
      <span className="text-2xl">{achievement.icon}</span>
      <div className="flex-1">
        <p className="font-medium">{achievement.name}</p>
        <p className="text-xs text-muted-foreground">{achievement.description}</p>
      </div>
      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
        +{achievement.xpReward} XP
      </span>
    </div>
  )
})

interface RoutineCompletionSummaryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  routineName: string
  duration: number
  stepsCompleted: CompletedStep[]
  totalSteps: number
  xpBreakdown: XPBreakdown
  previousXP: number
  newXP: number
  currentStreak: number
  newAchievements?: Achievement[]
  onAddJournalEntry?: () => void
}

export function RoutineCompletionSummary({
  open,
  onOpenChange,
  routineName,
  duration,
  stepsCompleted,
  totalSteps,
  xpBreakdown,
  previousXP,
  newXP,
  currentStreak,
  newAchievements = [],
  onAddJournalEntry,
}: RoutineCompletionSummaryProps) {
  const [showXPAnimation, setShowXPAnimation] = useState(false)
  const [displayedXP, setDisplayedXP] = useState(previousXP)

  // Memoize computed values to avoid recalculation on every render
  const isPerfect = useMemo(
    () => stepsCompleted.length === totalSteps && !stepsCompleted.some(s => s.skipped),
    [stepsCompleted, totalSteps]
  )
  const levelUpInfo = useMemo(() => checkLevelUp(previousXP, newXP), [previousXP, newXP])
  const skippedCount = useMemo(() => stepsCompleted.filter(s => s.skipped).length, [stepsCompleted])
  const completedCount = useMemo(() => stepsCompleted.filter(s => !s.skipped).length, [stepsCompleted])

  // Trigger animations on open
  useEffect(() => {
    if (!open) {
      setShowXPAnimation(false)
      setDisplayedXP(previousXP)
      return
    }

    // Play completion sound
    if (isPerfect) {
      rewardPerfectRoutine()
    } else {
      rewardRoutineComplete()
    }

    // Store animation controls for cleanup
    let animationControls: ReturnType<typeof animate> | null = null

    // Animate XP counter using Framer Motion
    const timeout = setTimeout(() => {
      setShowXPAnimation(true)

      // Use Framer Motion's animate for smooth XP counting
      animationControls = animate(previousXP, newXP, {
        duration: 1.5,
        ease: 'easeOut',
        onUpdate: (value) => setDisplayedXP(Math.floor(value)),
        onComplete: () => {
          setDisplayedXP(newXP)
          // Level up celebration
          if (levelUpInfo.didLevelUp) {
            setTimeout(() => rewardLevelUp(levelUpInfo.newLevel), 300)
          }
        },
      })
    }, 500)

    return () => {
      clearTimeout(timeout)
      animationControls?.stop()
    }
  }, [open, isPerfect, newXP, previousXP, levelUpInfo])

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <div className="relative flex h-full flex-col">
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-full bg-muted p-2"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header celebration */}
          <div className="flex flex-col items-center pt-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30, delay: 0.2 }}
              className={cn(
                'flex h-20 w-20 items-center justify-center rounded-full',
                isPerfect ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-teal-500'
              )}
            >
              {isPerfect ? (
                <Star className="h-10 w-10 text-white" />
              ) : (
                <Check className="h-10 w-10 text-white" />
              )}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-4 text-2xl font-bold"
            >
              {isPerfect ? 'Perfect!' : 'Well Done!'}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground"
            >
              {routineName} completed
            </motion.p>
          </div>

          {/* Stats grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6 grid grid-cols-3 gap-3"
          >
            <div className="rounded-xl bg-muted p-3 text-center">
              <Clock className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-1 text-lg font-semibold">{formatDuration(duration)}</p>
              <p className="text-xs text-muted-foreground">Duration</p>
            </div>
            <div className="rounded-xl bg-muted p-3 text-center">
              <Check className="mx-auto h-5 w-5 text-ios-success" />
              <p className="mt-1 text-lg font-semibold">
                {completedCount}/{totalSteps}
              </p>
              <p className="text-xs text-muted-foreground">Steps</p>
            </div>
            <div className="rounded-xl bg-muted p-3 text-center">
              <Flame className="mx-auto h-5 w-5 text-orange-500" />
              <p className="mt-1 text-lg font-semibold">{currentStreak}</p>
              <p className="text-xs text-muted-foreground">Streak</p>
            </div>
          </motion.div>

          {/* XP earned */}
          <AnimatePresence>
            {showXPAnimation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-900/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-medium text-emerald-700 dark:text-emerald-300">
                      XP Earned
                    </span>
                  </div>
                  <motion.span
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="text-2xl font-bold text-emerald-600 dark:text-emerald-400"
                  >
                    +{xpBreakdown.total}
                  </motion.span>
                </div>

                {/* XP breakdown */}
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Base XP</span>
                    <span>+{xpBreakdown.baseXp}</span>
                  </div>
                  {xpBreakdown.streakBonus > 0 && (
                    <div className="flex justify-between text-orange-600 dark:text-orange-400">
                      <span>Streak Bonus</span>
                      <span>+{xpBreakdown.streakBonus}</span>
                    </div>
                  )}
                  {xpBreakdown.perfectBonus > 0 && (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                      <span>Perfect Bonus</span>
                      <span>+{xpBreakdown.perfectBonus}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Level up notification */}
          <AnimatePresence>
            {levelUpInfo.didLevelUp && showXPAnimation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 1.5 }}
                className="mt-4 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 p-4 text-center"
              >
                <TrendingUp className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-1 font-semibold">Level Up!</p>
                <p className="text-sm text-muted-foreground">
                  You're now Level {levelUpInfo.newLevel} - {getLevelForXP(newXP).title}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* New achievements */}
          {newAchievements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mt-4 space-y-2"
            >
              <h3 className="text-sm font-medium">Achievements Unlocked</h3>
              {newAchievements.map((achievement) => (
                <AchievementItem key={achievement.id} achievement={achievement} />
              ))}
            </motion.div>
          )}

          {/* XP Progress */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-6"
          >
            <XPProgressBar totalXp={displayedXP} showDetails />
          </motion.div>

          {/* Actions */}
          <div className="mt-auto flex gap-3 pb-safe pt-6">
            {onAddJournalEntry && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={onAddJournalEntry}
              >
                Add Note
              </Button>
            )}
            <Button
              className="flex-1 bg-teal-500 hover:bg-teal-600"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
