'use client'

import { motion } from 'motion/react'
import { springs, durations } from '@/lib/motion-system'
import { Flame, Droplets, Utensils } from 'lucide-react'

interface CaloriesCardProps {
  caloriesConsumed: number
  calorieGoal: number | null
  waterMl: number
  waterGoalMl: number
  mealCount: number
  lastMealName: string | null
  annotation?: string | null
  onTap: () => void
}

function ProgressRing({ progress, size = 56, strokeWidth = 5, color }: {
  progress: number
  size?: number
  strokeWidth?: number
  color: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - Math.min(progress, 1) * circumference

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
      />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={springs.ios}
      />
    </svg>
  )
}

export function CaloriesCard({
  caloriesConsumed,
  calorieGoal,
  waterMl,
  waterGoalMl,
  mealCount,
  lastMealName,
  annotation,
  onTap,
}: CaloriesCardProps) {
  const calProgress = calorieGoal ? caloriesConsumed / calorieGoal : 0
  const waterProgress = waterGoalMl > 0 ? waterMl / waterGoalMl : 0
  const calPct = calorieGoal ? Math.round((caloriesConsumed / calorieGoal) * 100) : null

  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      transition={springs.ios}
      className="w-full ios-card overflow-hidden text-left relative"
    >
      {/* Animated accent bar */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-1 bg-accent"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: durations.slow }}
        style={{ transformOrigin: 'left' }}
      />

      {/* Background overlay */}
      <div className="absolute inset-0 bg-accent/[0.03] dark:bg-accent/[0.05] pointer-events-none" />

      <div className="p-6 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Nutrition</p>
            {calPct !== null && (
              <p className="text-sm text-muted-foreground">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse mr-1.5" />
                {calPct}% of daily goal
              </p>
            )}
          </div>

          <motion.div
            className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center border border-border/50 shadow-sm"
            whileTap={{ scale: 0.97 }}
          >
            <Flame className="h-6 w-6 text-accent" />
          </motion.div>
        </div>

        {/* Progress rings side by side */}
        <div className="flex items-center gap-6 mb-5">
          {/* Calories */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="relative">
              <ProgressRing progress={calProgress} color="hsl(var(--accent))" />
              <Flame className="absolute inset-0 m-auto h-4.5 w-4.5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-black tabular-nums tracking-tight">{Math.round(caloriesConsumed)}</p>
              <p className="text-xs text-muted-foreground">
                / {calorieGoal ?? '---'} cal
              </p>
            </div>
          </motion.div>

          {/* Water */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="relative">
              <ProgressRing progress={waterProgress} color="hsl(var(--primary))" />
              <Droplets className="absolute inset-0 m-auto h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-black tabular-nums tracking-tight">{(waterMl / 1000).toFixed(1)}L</p>
              <p className="text-xs text-muted-foreground">
                / {(waterGoalMl / 1000).toFixed(1)}L water
              </p>
            </div>
          </motion.div>
        </div>

        {/* AI annotation */}
        {annotation && (
          <p className="text-xs text-muted-foreground/80 italic">{annotation}</p>
        )}
      </div>

      {/* Meal summary footer */}
      <div className="px-6 py-3 border-t border-border/30 relative z-10">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
            <Utensils className="h-3.5 w-3.5 text-accent" />
          </div>
          {mealCount > 0 ? (
            <span>
              <span className="font-semibold text-foreground/80">{mealCount} meal{mealCount !== 1 ? 's' : ''}</span>
              {lastMealName && <> &mdash; last: {lastMealName}</>}
            </span>
          ) : (
            <span>No meals logged yet</span>
          )}
        </div>
      </div>
    </motion.button>
  )
}
