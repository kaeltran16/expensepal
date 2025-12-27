'use client'

import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { hapticFeedback } from '@/lib/utils'
import { format, isToday, isSameDay, addDays, startOfWeek } from 'date-fns'
import type { ScheduledWorkout } from '@/lib/hooks/use-workout-schedule'

interface WorkoutCalendarProps {
  scheduledWorkouts: ScheduledWorkout[]
  completedDates: string[] // ISO date strings
  onDateClick?: (date: Date) => void
  weekOffset?: number
  onWeekChange?: (offset: number) => void
}

export function WorkoutCalendar({
  scheduledWorkouts,
  completedDates,
  onDateClick,
  weekOffset = 0,
  onWeekChange
}: WorkoutCalendarProps) {
  // Calculate week dates based on offset
  const getWeekDates = () => {
    const today = new Date()
    const monday = startOfWeek(today, { weekStartsOn: 1 })
    const weekStart = addDays(monday, weekOffset * 7)

    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }

  const weekDates = getWeekDates()

  const getDateStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const isScheduled = scheduledWorkouts.some(
      w => format(new Date(w.scheduled_date), 'yyyy-MM-dd') === dateStr
    )
    const isCompleted = completedDates.includes(dateStr)

    return { isScheduled, isCompleted }
  }

  const handlePrevWeek = () => {
    onWeekChange?.(weekOffset - 1)
    hapticFeedback('light')
  }

  const handleNextWeek = () => {
    onWeekChange?.(weekOffset + 1)
    hapticFeedback('light')
  }

  const handleDateClick = (date: Date) => {
    onDateClick?.(date)
    hapticFeedback('medium')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="ios-card p-4"
    >
      {/* Header with week navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevWeek}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <h3 className="ios-headline">
          {weekOffset === 0 ? 'This Week' : format(weekDates[0], 'MMM d')} - {format(weekDates[6], 'MMM d')}
        </h3>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextWeek}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date, index) => {
          const { isScheduled, isCompleted } = getDateStatus(date)
          const today = isToday(date)

          return (
            <motion.button
              key={date.toISOString()}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleDateClick(date)}
              className={`
                relative flex flex-col items-center justify-center p-2 rounded-xl
                transition-all duration-200
                ${today ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-muted'}
                ${isCompleted ? 'ring-2 ring-green-500' : ''}
                touch-manipulation
              `}
            >
              {/* Day label */}
              <span className="text-xs mb-1 opacity-70">
                {format(date, 'EEE')[0]}
              </span>

              {/* Date number */}
              <span className={`text-sm font-medium mb-1 ${today ? '' : 'text-foreground'}`}>
                {format(date, 'd')}
              </span>

              {/* Status indicator */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                {isCompleted ? (
                  <CheckCircle2 className="h-3 w-3 text-green-500 fill-green-500" />
                ) : isScheduled ? (
                  <Circle className="h-2 w-2 text-blue-500 fill-blue-500" />
                ) : null}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t">
        <div className="flex items-center gap-1.5">
          <Circle className="h-2 w-2 text-blue-500 fill-blue-500" />
          <span className="ios-caption text-muted-foreground">Scheduled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-green-500 fill-green-500" />
          <span className="ios-caption text-muted-foreground">Completed</span>
        </div>
      </div>
    </motion.div>
  )
}
