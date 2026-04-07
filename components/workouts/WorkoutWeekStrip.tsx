'use client'

import { useThisWeekScheduledWorkouts } from '@/lib/hooks/use-workout-schedule'
import { getStaggerDelay, springs, variants } from '@/lib/motion-system'
import { hapticFeedback } from '@/lib/utils'
import { format, isToday, isBefore, startOfDay } from 'date-fns'
import { motion } from 'motion/react'
import type { Workout } from '@/lib/supabase'

interface WorkoutWeekStripProps {
  recentWorkouts: Workout[]
  onOpenCalendar: () => void
}

type DayStatus = 'completed' | 'today-scheduled' | 'upcoming' | 'rest'

function getDayStatus(
  dateStr: string,
  scheduledTemplateNames: Map<string, string>,
  completedDates: Set<string>
): { status: DayStatus; label?: string } {
  const date = new Date(dateStr + 'T00:00:00')
  const dateKey = dateStr
  const today = isToday(date)
  const past = isBefore(date, startOfDay(new Date())) && !today

  if (completedDates.has(dateKey)) {
    return { status: 'completed' }
  }

  const templateName = scheduledTemplateNames.get(dateKey)

  if (today && templateName) {
    return { status: 'today-scheduled', label: templateName }
  }

  if (!past && templateName) {
    return { status: 'upcoming', label: templateName }
  }

  return { status: 'rest' }
}

export function WorkoutWeekStrip({
  recentWorkouts,
  onOpenCalendar,
}: WorkoutWeekStripProps) {
  const { data: weekSchedule = [] } = useThisWeekScheduledWorkouts()

  const scheduledTemplateNames = new Map<string, string>()
  for (const sw of weekSchedule) {
    scheduledTemplateNames.set(
      sw.scheduled_date,
      sw.template?.name?.split(' ')[0] || 'Workout'
    )
  }

  const completedDates = new Set<string>()
  for (const w of recentWorkouts) {
    if (w.completed_at) {
      completedDates.add(format(new Date(w.completed_at), 'yyyy-MM-dd'))
    }
  }
  for (const sw of weekSchedule) {
    if (sw.status === 'completed') {
      completedDates.add(sw.scheduled_date)
    }
  }

  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))

  const weekDates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    weekDates.push(format(d, 'yyyy-MM-dd'))
  }

  return (
    <motion.div
      {...variants.slideUp}
      transition={springs.ios}
      className="ios-card p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">This Week</h3>
        <button
          onClick={() => {
            onOpenCalendar()
            hapticFeedback('light')
          }}
          className="text-xs text-primary font-medium"
        >
          Full Calendar
        </button>
      </div>

      <div className="flex gap-1.5">
        {weekDates.map((dateStr, i) => {
          const date = new Date(dateStr + 'T00:00:00')
          const today = isToday(date)
          const { status, label } = getDayStatus(dateStr, scheduledTemplateNames, completedDates)

          const bgClass =
            status === 'completed'
              ? 'bg-green-500 text-white'
              : status === 'today-scheduled'
                ? 'bg-primary text-white shadow-md shadow-primary/30'
                : status === 'upcoming'
                  ? 'bg-primary/10 dark:bg-primary/20'
                  : 'bg-muted/50'

          const textClass =
            status === 'completed' || status === 'today-scheduled'
              ? 'text-white'
              : status === 'upcoming'
                ? 'text-primary'
                : 'text-muted-foreground'

          return (
            <motion.div
              key={dateStr}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: getStaggerDelay(i), ...springs.ios }}
              className={`flex-1 text-center rounded-xl py-2 px-1 ${bgClass} ${today ? 'ring-2 ring-primary/20' : ''}`}
            >
              <div className={`text-[10px] font-semibold ${textClass}`}>
                {format(date, 'EEE').toUpperCase()}
              </div>
              <div className={`text-sm font-bold ${status === 'completed' || status === 'today-scheduled' ? 'text-white' : 'text-foreground'}`}>
                {format(date, 'd')}
              </div>
              <div className={`text-[8px] mt-0.5 ${textClass} truncate`}>
                {status === 'completed' ? '\u2713' : label || 'Rest'}
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
