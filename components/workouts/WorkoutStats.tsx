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

function StatCard({ icon, label, value, bgColor, index }: StatCardProps & { index: number }) {
  return (
    <motion.div
      className={`${bgColor} rounded-2xl p-3 text-center`}
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        delay: 0.15 + index * 0.08,
        type: "spring",
        stiffness: 400,
        damping: 20
      }}
      whileHover={{
        scale: 1.05,
        y: -4,
        transition: { type: "spring", stiffness: 500, damping: 15 }
      }}
      whileTap={{
        scale: 0.95,
        transition: { duration: 0.1 }
      }}
    >
      <motion.div
        className="flex justify-center mb-2"
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, 10, -10, 0] }}
        transition={{
          delay: 0.2 + index * 0.08,
          duration: 0.5,
          type: "spring",
          stiffness: 300
        }}
      >
        {icon}
      </motion.div>
      <motion.div
        className="text-xl font-bold mb-0.5"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: 0.25 + index * 0.08,
          type: "spring",
          stiffness: 500,
          damping: 15
        }}
      >
        {value}
      </motion.div>
      <motion.div
        className="text-xs text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 + index * 0.08 }}
      >
        {label}
      </motion.div>
    </motion.div>
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
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 0.1,
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
      className="ios-card p-5"
    >
      <motion.div
        className="flex items-center justify-between mb-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
      >
        <h3 className="ios-headline">This Week</h3>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            delay: 0.2,
            type: "spring",
            stiffness: 500,
            damping: 15
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Badge variant="secondary" className="gap-1">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <Activity className="h-3 w-3" />
            </motion.div>
            {weekWorkouts.length} workouts
          </Badge>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Target className="h-4 w-4 text-blue-500" />}
          label="Workouts"
          value={weekWorkouts.length.toString()}
          bgColor="bg-blue-50 dark:bg-blue-950/30"
          index={0}
        />
        <StatCard
          icon={<Clock className="h-4 w-4 text-orange-500" />}
          label="Total Time"
          value={`${totalTime}m`}
          bgColor="bg-orange-50 dark:bg-orange-950/30"
          index={1}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-green-500" />}
          label="Avg Time"
          value={`${avgTime}m`}
          bgColor="bg-green-50 dark:bg-green-950/30"
          index={2}
        />
      </div>
    </motion.div>
  )
}
