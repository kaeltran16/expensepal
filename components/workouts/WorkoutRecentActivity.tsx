'use client'

import { motion } from 'framer-motion'
import { Calendar, Award } from 'lucide-react'
import { format } from 'date-fns'
import type { Workout } from '@/lib/supabase'

interface WorkoutRecentActivityProps {
  recentWorkouts: Workout[]
  maxVisible?: number
}

function WorkoutHistoryCard({
  workout,
  index
}: {
  workout: Workout
  index: number
}) {
  const completedDate = workout.completed_at ? new Date(workout.completed_at) : null
  const workoutName = workout.notes || 'Workout'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
      className="ios-card p-4 flex items-center gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Award className="h-5 w-5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold truncate">{workoutName}</h4>
        <p className="text-xs text-muted-foreground">
          {completedDate ? format(completedDate, 'MMM d, h:mm a') : 'Unknown date'}
          {workout.duration_minutes && ` \u2022 ${workout.duration_minutes}min`}
        </p>
      </div>

      <div className="shrink-0">
        <span className="text-xs text-muted-foreground">
          {workout.status === 'completed' ? '\u2713 Done' : workout.status}
        </span>
      </div>
    </motion.div>
  )
}

export function WorkoutRecentActivity({
  recentWorkouts,
  maxVisible = 3
}: WorkoutRecentActivityProps) {
  if (recentWorkouts.length === 0) {
    return null
  }

  const visibleWorkouts = recentWorkouts.slice(0, maxVisible)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 px-1">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <h3 className="ios-headline">Recent Activity</h3>
      </div>

      <div className="space-y-2">
        {visibleWorkouts.map((workout, index) => (
          <WorkoutHistoryCard
            key={workout.id}
            workout={workout}
            index={index}
          />
        ))}
      </div>
    </motion.div>
  )
}
