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
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 0.15,
        type: "spring",
        stiffness: 300,
        damping: 25
      }}
      className="ios-card p-4"
    >
      {/* Header with week navigation */}
      <motion.div
        className="flex items-center justify-between mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevWeek}
            className="h-10 w-10 min-h-touch"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </motion.div>

        <motion.h3
          className="ios-headline text-center flex-1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, type: "spring", stiffness: 300 }}
          key={weekOffset}
        >
          {weekOffset === 0 ? 'This Week' : format(weekDates[0], 'MMM d')} - {format(weekDates[6], 'MMM d')}
        </motion.h3>

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextWeek}
            className="h-10 w-10 min-h-touch"
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </motion.div>
      </motion.div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date, index) => {
          const { isScheduled, isCompleted } = getDateStatus(date)
          const today = isToday(date)

          return (
            <motion.button
              key={date.toISOString()}
              initial={{ opacity: 0, scale: 0.6, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                delay: 0.3 + index * 0.04,
                type: "spring",
                stiffness: 400,
                damping: 20
              }}
              whileHover={{
                scale: 1.1,
                y: -4,
                transition: { type: "spring", stiffness: 500, damping: 15 }
              }}
              whileTap={{
                scale: 0.95,
                transition: { duration: 0.1 }
              }}
              onClick={() => handleDateClick(date)}
              className={`
                relative flex flex-col items-center justify-center p-2 rounded-xl
                transition-all duration-200
                ${today ? 'bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30' : 'hover:bg-muted'}
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

              {/* Status indicator with animation */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{
                      scale: 1,
                      rotate: 0
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 15,
                      delay: 0.4 + index * 0.04
                    }}
                  >
                    <CheckCircle2 className="h-3 w-3 text-green-500 fill-green-500" />
                  </motion.div>
                ) : isScheduled ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{
                      scale: [1, 1.2, 1]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: 0.4 + index * 0.04
                    }}
                  >
                    <Circle className="h-2 w-2 text-blue-500 fill-blue-500" />
                  </motion.div>
                ) : null}
              </div>
            </motion.button>
          )
        })}
      </div>

      {/* Legend */}
      <motion.div
        className="flex items-center justify-center gap-4 mt-4 pt-3 border-t"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
      >
        <motion.div
          className="flex items-center gap-1.5"
          whileHover={{ scale: 1.05 }}
        >
          <Circle className="h-2 w-2 text-blue-500 fill-blue-500" />
          <span className="ios-caption text-muted-foreground">Scheduled</span>
        </motion.div>
        <motion.div
          className="flex items-center gap-1.5"
          whileHover={{ scale: 1.05 }}
        >
          <CheckCircle2 className="h-3 w-3 text-green-500 fill-green-500" />
          <span className="ios-caption text-muted-foreground">Completed</span>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
