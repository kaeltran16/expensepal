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
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="ios-card p-3 flex items-center gap-3"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Award className="h-6 w-6 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="ios-subheadline mb-0.5 truncate">{workoutName}</h4>
        <p className="ios-caption text-muted-foreground">
          {completedDate ? format(completedDate, 'MMM d, h:mm a') : 'Unknown date'}
          {workout.duration_minutes && ` • ${workout.duration_minutes}min`}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-xs text-muted-foreground">
          {workout.status === 'completed' ? '✓ Done' : workout.status}
        </p>
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
      transition={{ delay: 0.2 }}
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
