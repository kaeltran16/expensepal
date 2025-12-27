'use client'

import { motion } from 'framer-motion'
import { Activity, Clock, Target, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Workout } from '@/lib/supabase'

interface WorkoutStatsProps {
  weekWorkouts: Workout[]
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  bgColor: string
}

function StatCard({ icon, label, value, bgColor }: StatCardProps) {
  return (
    <div className={`${bgColor} rounded-2xl p-3 text-center`}>
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-xl font-bold mb-0.5">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

export function WorkoutStats({ weekWorkouts }: WorkoutStatsProps) {
  if (weekWorkouts.length === 0) {
    return null
  }

  const totalTime = weekWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0)
  const avgTime = Math.round(totalTime / weekWorkouts.length)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="ios-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="ios-headline">This Week</h3>
        <Badge variant="secondary" className="gap-1">
          <Activity className="h-3 w-3" />
          {weekWorkouts.length} workouts
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Target className="h-4 w-4 text-blue-500" />}
          label="Workouts"
          value={weekWorkouts.length.toString()}
          bgColor="bg-blue-50 dark:bg-blue-950/30"
        />
        <StatCard
          icon={<Clock className="h-4 w-4 text-orange-500" />}
          label="Total Time"
          value={`${totalTime}m`}
          bgColor="bg-orange-50 dark:bg-orange-950/30"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-green-500" />}
          label="Avg Time"
          value={`${avgTime}m`}
          bgColor="bg-green-50 dark:bg-green-950/30"
        />
      </div>
    </motion.div>
  )
}
