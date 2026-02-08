'use client'

import { motion } from 'framer-motion'
import { Activity, Clock, Target, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Workout } from '@/lib/supabase'

interface WorkoutStatsProps {
  weekWorkouts: Workout[]
}

export function WorkoutStats({ weekWorkouts }: WorkoutStatsProps) {
  if (weekWorkouts.length === 0) {
    return null
  }

  const totalTime = weekWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0)
  const avgTime = Math.round(totalTime / weekWorkouts.length)

  const stats = [
    {
      icon: <Target className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />,
      iconBg: 'bg-blue-500/10',
      label: 'Workouts',
      value: weekWorkouts.length.toString(),
      cardBg: 'bg-muted/40 dark:bg-muted/20'
    },
    {
      icon: <Clock className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />,
      iconBg: 'bg-orange-500/10',
      label: 'Total Time',
      value: `${totalTime}m`,
      cardBg: 'bg-muted/40 dark:bg-muted/20'
    },
    {
      icon: <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />,
      iconBg: 'bg-green-500/10',
      label: 'Avg Time',
      value: `${avgTime}m`,
      cardBg: 'bg-muted/40 dark:bg-muted/20'
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
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
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`${stat.cardBg} rounded-xl p-3 border border-border/50`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <div className={`w-6 h-6 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                {stat.icon}
              </div>
            </div>
            <div className="text-xl font-bold tracking-tight">{stat.value}</div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
