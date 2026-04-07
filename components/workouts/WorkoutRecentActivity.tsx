'use client'

import { getStaggerDelay, springs, variants } from '@/lib/motion-system'
import { hapticFeedback } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'motion/react'
import { CheckCircle2 } from 'lucide-react'
import type { Workout } from '@/lib/supabase'

interface WorkoutRecentActivityProps {
  recentWorkouts: Workout[]
  templateNameMap?: Map<string, string>
  maxVisible?: number
  onViewAll?: () => void
}

export function WorkoutRecentActivity({
  recentWorkouts,
  templateNameMap,
  maxVisible = 3,
  onViewAll,
}: WorkoutRecentActivityProps) {
  if (recentWorkouts.length === 0) {
    return null
  }

  const visibleWorkouts = recentWorkouts.slice(0, maxVisible)

  return (
    <motion.div
      {...variants.slideUp}
      transition={springs.ios}
      className="ios-card p-4"
    >
      <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>

      <div className="space-y-0">
        {visibleWorkouts.map((workout, index) => {
          const completedDate = workout.completed_at ? new Date(workout.completed_at) : null
          const workoutName = workout.notes || (workout.template_id && templateNameMap?.get(workout.template_id)) || 'Quick Workout'
          const isLast = index === visibleWorkouts.length - 1

          return (
            <motion.div
              key={workout.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: getStaggerDelay(index), ...springs.ios }}
              className={`flex items-center gap-3 py-2.5 ${!isLast ? 'border-b border-border/50' : ''}`}
            >
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{workoutName}</p>
                <p className="text-xs text-muted-foreground">
                  {completedDate
                    ? formatDistanceToNow(completedDate, { addSuffix: true })
                    : 'Unknown'}
                  {workout.duration_minutes && ` \u00B7 ${workout.duration_minutes}min`}
                  {workout.total_volume && ` \u00B7 ${Math.round(workout.total_volume).toLocaleString()} kg`}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {recentWorkouts.length > maxVisible && onViewAll && (
        <button
          onClick={() => {
            onViewAll()
            hapticFeedback('light')
          }}
          className="text-xs text-primary font-medium mt-2 block"
        >
          View all &rarr;
        </button>
      )}
    </motion.div>
  )
}
