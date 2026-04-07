'use client'

import { springs, variants } from '@/lib/motion-system'
import { computeVolumeTrend, computeWeeklyVolume } from '@/lib/workout-stats'
import { motion, useMotionValue, useTransform, animate } from 'motion/react'
import type { Workout } from '@/lib/supabase'
import { useEffect, useRef } from 'react'

interface WorkoutQuickStatsProps {
  weekWorkouts: Workout[]
  prevWeekWorkouts: Workout[]
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (v) => Math.round(v))

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.6 })
    return controls.stop
  }, [value, motionValue])

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => {
      if (ref.current) ref.current.textContent = `${v}${suffix}`
    })
    return unsubscribe
  }, [rounded, suffix])

  return <span ref={ref}>0{suffix}</span>
}

function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}k`
  return kg.toString()
}

export function WorkoutQuickStats({
  weekWorkouts,
  prevWeekWorkouts,
}: WorkoutQuickStatsProps) {
  const totalTime = weekWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0)
  const volume = computeWeeklyVolume(weekWorkouts)
  const prevVolume = computeWeeklyVolume(prevWeekWorkouts)
  const trend = computeVolumeTrend(volume, prevVolume)

  const stats = [
    {
      value: weekWorkouts.length,
      label: 'Workouts',
      color: 'text-blue-600 dark:text-blue-400',
      suffix: '',
    },
    {
      value: totalTime,
      label: 'Time',
      color: 'text-orange-600 dark:text-orange-400',
      suffix: 'm',
    },
    {
      value: volume,
      label: 'Volume',
      color: 'text-green-600 dark:text-green-400',
      displayValue: formatVolume(volume),
    },
    {
      value: trend,
      label: 'vs Last Wk',
      color: trend >= 0
        ? 'text-purple-600 dark:text-purple-400'
        : 'text-red-600 dark:text-red-400',
      prefix: trend > 0 ? '+' : '',
      suffix: '%',
    },
  ]

  return (
    <motion.div
      {...variants.slideUp}
      transition={springs.ios}
      className="flex gap-2"
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex-1 ios-card p-3 text-center"
        >
          <div className={`text-lg font-bold tracking-tight ${stat.color}`}>
            {stat.displayValue ?? `${stat.prefix ?? ''}${stat.value}${stat.suffix ?? ''}`}
          </div>
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {stat.label}
          </div>
        </div>
      ))}
    </motion.div>
  )
}
