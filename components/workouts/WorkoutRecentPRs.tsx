'use client'

import { usePersonalRecords } from '@/lib/hooks/use-workouts'
import { getStaggerDelay, springs, variants } from '@/lib/motion-system'
import { hapticFeedback } from '@/lib/utils'
import { motion } from 'motion/react'
import { Star } from 'lucide-react'

interface WorkoutRecentPRsProps {
  onViewAll: () => void
}

export function WorkoutRecentPRs({ onViewAll }: WorkoutRecentPRsProps) {
  const { data: records = [] } = usePersonalRecords()

  const recentPRs = records
    .sort((a, b) => new Date(b.achieved_at).getTime() - new Date(a.achieved_at).getTime())
    .slice(0, 3)

  return (
    <motion.div
      {...variants.slideUp}
      transition={springs.ios}
      className="flex-1 ios-card p-4"
    >
      <h3 className="text-sm font-semibold mb-2">Recent PRs</h3>

      {recentPRs.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No records yet. Keep training!
        </p>
      ) : (
        <div className="space-y-1.5">
          {recentPRs.map((pr, i) => (
            <motion.div
              key={pr.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: getStaggerDelay(i), ...springs.ios }}
              className="flex items-center gap-1.5 text-xs"
            >
              <motion.div
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ delay: getStaggerDelay(i) + 0.1, ...springs.ios }}
              >
                <Star className="h-3 w-3 text-orange-500 fill-orange-500" />
              </motion.div>
              <span className="truncate flex-1">{pr.exercise_name}</span>
              <span className="font-semibold shrink-0">
                {pr.value}{pr.unit ? ` ${pr.unit}` : ''}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {recentPRs.length > 0 && (
        <button
          onClick={() => {
            onViewAll()
            hapticFeedback('light')
          }}
          className="text-[10px] text-primary font-medium mt-2 block"
        >
          View all &rarr;
        </button>
      )}
    </motion.div>
  )
}
