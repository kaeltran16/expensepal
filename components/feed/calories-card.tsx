'use client'

import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { Flame, Droplets } from 'lucide-react'

interface CaloriesCardProps {
  caloriesConsumed: number
  calorieGoal: number | null
  waterMl: number
  waterGoalMl: number
  annotation?: string | null
  onTap: () => void
}

function ProgressRing({ progress, size = 48, strokeWidth = 4, color }: {
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
  annotation,
  onTap,
}: CaloriesCardProps) {
  const calProgress = calorieGoal ? caloriesConsumed / calorieGoal : 0
  const waterProgress = waterGoalMl > 0 ? waterMl / waterGoalMl : 0

  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      transition={springs.ios}
      className="w-full ios-card p-4 text-left"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <Flame className="h-4 w-4 text-orange-500" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Nutrition</span>
      </div>

      {/* Progress rings side by side */}
      <div className="flex items-center gap-6 mb-2">
        {/* Calories */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <ProgressRing progress={calProgress} color="var(--color-orange-500, #f97316)" />
            <Flame className="absolute inset-0 m-auto h-4 w-4 text-orange-500" />
          </div>
          <div>
            <p className="text-base font-semibold tabular-nums">{Math.round(caloriesConsumed)}</p>
            <p className="text-xs text-muted-foreground">
              / {calorieGoal ?? '---'} cal
            </p>
          </div>
        </div>

        {/* Water */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <ProgressRing progress={waterProgress} color="var(--color-blue-500, #3b82f6)" />
            <Droplets className="absolute inset-0 m-auto h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-base font-semibold tabular-nums">{(waterMl / 1000).toFixed(1)}L</p>
            <p className="text-xs text-muted-foreground">
              / {(waterGoalMl / 1000).toFixed(1)}L water
            </p>
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
