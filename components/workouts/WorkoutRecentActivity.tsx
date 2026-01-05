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
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{
        delay: index * 0.07,
        type: "spring",
        stiffness: 350,
        damping: 25
      }}
      whileHover={{
        scale: 1.02,
        x: 4,
        transition: { type: "spring", stiffness: 400, damping: 20 }
      }}
      whileTap={{
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
      className="ios-card p-3 flex items-center gap-3 cursor-pointer"
    >
      <motion.div
        className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          delay: index * 0.07 + 0.1,
          type: "spring",
          stiffness: 500,
          damping: 20
        }}
        whileHover={{
          rotate: [0, -10, 10, 0],
          transition: { duration: 0.5 }
        }}
      >
        <Award className="h-6 w-6 text-primary" />
      </motion.div>

      <div className="flex-1 min-w-0">
        <motion.h4
          className="ios-subheadline mb-0.5 truncate"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.07 + 0.15 }}
        >
          {workoutName}
        </motion.h4>
        <motion.p
          className="ios-caption text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.07 + 0.2 }}
        >
          {completedDate ? format(completedDate, 'MMM d, h:mm a') : 'Unknown date'}
          {workout.duration_minutes && ` • ${workout.duration_minutes}min`}
        </motion.p>
      </div>

      <motion.div
        className="shrink-0 text-right"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: index * 0.07 + 0.25,
          type: "spring",
          stiffness: 500,
          damping: 15
        }}
      >
        <p className="text-xs text-muted-foreground">
          {workout.status === 'completed' ? '✓ Done' : workout.status}
        </p>
      </motion.div>
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
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 0.2,
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
      className="space-y-3"
    >
      <motion.div
        className="flex items-center gap-2 px-1"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25, type: "spring", stiffness: 300 }}
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <h3 className="ios-headline">Recent Activity</h3>
      </motion.div>

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
