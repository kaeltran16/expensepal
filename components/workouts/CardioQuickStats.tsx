'use client'

import { motion } from 'motion/react'
import { springs, variants } from '@/lib/motion-system'
import { formatPace } from '@/lib/types/cardio'

interface CardioQuickStatsProps {
  totalDistance: number
  avgSpeed: number
  totalMinutes: number
}

export function CardioQuickStats({
  totalDistance,
  avgSpeed,
  totalMinutes,
}: CardioQuickStatsProps) {
  const stats = [
    {
      value: totalDistance.toFixed(1),
      label: 'km',
      sublabel: 'this week',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      value: avgSpeed > 0 ? formatPace(avgSpeed) : '--',
      label: 'pace',
      sublabel: 'avg min/km',
      color: 'text-green-600 dark:text-green-400',
    },
    {
      value: totalMinutes.toString(),
      label: 'min',
      sublabel: 'total',
      color: 'text-purple-600 dark:text-purple-400',
    },
  ]

  return (
    <motion.div
      {...variants.slideUp}
      transition={springs.ios}
      className="flex gap-2"
    >
      {stats.map((stat) => (
        <div key={stat.label} className="flex-1 ios-card p-3 text-center">
          <div className={`text-lg font-bold tracking-tight ${stat.color}`}>
            {stat.value}
          </div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {stat.label}
          </div>
        </div>
      ))}
    </motion.div>
  )
}
