'use client'

import { springs, variants } from '@/lib/motion-system'
import { DISPLAY_GROUPS, getMuscleGroupsHitThisWeek } from '@/lib/workout-stats'
import type { DisplayGroup } from '@/lib/workout-stats'
import { motion } from 'motion/react'

interface WorkoutMuscleMapProps {
  trainedMuscleGroups: string[]
}

export function WorkoutMuscleMap({ trainedMuscleGroups }: WorkoutMuscleMapProps) {
  const hitGroups = new Set<DisplayGroup>(
    getMuscleGroupsHitThisWeek(trainedMuscleGroups)
  )

  const hitCount = hitGroups.size

  return (
    <motion.div
      {...variants.slideUp}
      transition={springs.ios}
      className="flex-1 ios-card p-4"
    >
      <h3 className="text-sm font-semibold mb-2">Muscle Map</h3>

      <div className="flex flex-wrap gap-1.5">
        {DISPLAY_GROUPS.map((group) => {
          const isHit = hitGroups.has(group)
          return (
            <motion.span
              key={group}
              initial={isHit ? { scale: 0.95 } : false}
              animate={isHit ? { scale: 1 } : undefined}
              transition={springs.touch}
              className={`text-[10px] font-medium px-2 py-1 rounded-md ${
                isHit
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {group} {isHit && '\u2713'}
            </motion.span>
          )
        })}
      </div>

      <p className="text-[10px] text-muted-foreground mt-2">
        {hitCount}/{DISPLAY_GROUPS.length} groups this week
      </p>
    </motion.div>
  )
}
