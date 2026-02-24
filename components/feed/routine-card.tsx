'use client'

import { motion } from 'motion/react'
import { springs, durations } from '@/lib/motion-system'
import { Sparkles, Zap, Flame as StreakIcon, Check, Circle } from 'lucide-react'

interface RoutineStep {
  name: string
  completed: boolean
}

interface RoutineCardProps {
  completedToday: boolean
  currentStreak: number
  totalXp: number
  level: number
  steps: RoutineStep[]
  annotation?: string | null
  onTap: () => void
}

export function RoutineCard({
  completedToday,
  currentStreak,
  totalXp,
  level,
  steps,
  annotation,
  onTap,
}: RoutineCardProps) {
  const completedCount = steps.filter(s => s.completed).length
  const progressPct = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0

  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      transition={springs.ios}
      className="w-full ios-card overflow-hidden text-left relative"
    >
      {/* Animated accent bar */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-1 bg-teal-500"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: durations.slow }}
        style={{ transformOrigin: 'left' }}
      />

      {/* Background overlay */}
      <div className="absolute inset-0 bg-teal-500/[0.03] dark:bg-teal-500/[0.05] pointer-events-none" />


      <div className="p-6 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Routines</p>
              {completedToday && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                >
                  <Check className="h-2 w-2" />
                  Done
                </motion.div>
              )}
            </div>
            {steps.length > 0 && (
              <p className="text-sm text-muted-foreground">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse mr-1.5" />
                {completedCount}/{steps.length} steps
              </p>
            )}
          </div>

          <motion.div
            className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center border border-border/50 shadow-sm"
            whileTap={{ scale: 0.97 }}
          >
            <Sparkles className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </motion.div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3.5 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <StreakIcon className="h-3.5 w-3.5 text-orange-500" />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Streak</p>
              </div>
              <p className="text-lg font-bold tracking-tight tabular-nums">{currentStreak} days</p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="bg-muted/40 dark:bg-muted/20 rounded-xl p-3.5 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-yellow-500" />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Level</p>
              </div>
              <p className="text-lg font-bold tracking-tight tabular-nums">Lv.{level} <span className="font-normal text-muted-foreground text-xs">{totalXp} XP</span></p>
            </div>
          </motion.div>
        </div>

        {/* Progress bar */}
        {steps.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Progress</p>
              <p className={`text-xs font-medium tabular-nums ${completedToday ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                {progressPct}%
              </p>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-teal-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ delay: 0.4, duration: 0.6 }}
              />
            </div>
          </div>
        )}

        {/* AI annotation */}
        {annotation && (
          <p className="text-xs text-muted-foreground/80 italic">{annotation}</p>
        )}
      </div>

      {/* Step checklist footer */}
      {steps.length > 0 && (
        <div className="px-6 py-3 border-t border-border/30 relative z-10 space-y-1.5">
          {steps.slice(0, 4).map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {step.completed ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.05, type: 'spring', bounce: 0.4 }}
                  className="w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center shrink-0"
                >
                  <Check className="h-2.5 w-2.5 text-white" />
                </motion.div>
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}
              <span className={step.completed ? 'text-muted-foreground line-through' : 'text-foreground/80'}>
                {step.name}
              </span>
            </div>
          ))}
          {steps.length > 4 && (
            <p className="text-[10px] text-muted-foreground pl-6">+{steps.length - 4} more</p>
          )}
        </div>
      )}
    </motion.button>
  )
}
