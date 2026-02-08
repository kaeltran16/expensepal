'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, TrendingUp, Calendar, Award, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { hapticFeedback } from '@/lib/utils'
import { format, subDays, eachDayOfInterval } from 'date-fns'
import type { Workout } from '@/lib/supabase'

interface WorkoutAnalyticsSheetProps {
  isOpen: boolean
  workouts: Workout[]
  onClose: () => void
}

type TabType = 'overview' | 'progress' | 'records'

export function WorkoutAnalyticsSheet({
  isOpen,
  workouts,
  onClose
}: WorkoutAnalyticsSheetProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  const handleClose = () => {
    onClose()
    hapticFeedback('light')
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 40, stiffness: 400, mass: 0.8 }}
            className="fixed inset-x-0 bottom-0 z-[70] bg-background rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="safe-top p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="ios-title1">Analytics</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Tab Switcher */}
              <div className="ios-card p-1 flex gap-1">
                {[
                  { id: 'overview' as const, label: 'Overview' },
                  { id: 'progress' as const, label: 'Progress' },
                  { id: 'records' as const, label: 'Records' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      hapticFeedback('light')
                    }}
                    className={`
                      flex-1 py-2.5 px-4 rounded-xl transition-all text-sm font-medium
                      ${activeTab === tab.id
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: activeTab === 'overview' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: activeTab === 'overview' ? 20 : -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'overview' && <OverviewTab workouts={workouts} />}
                  {activeTab === 'progress' && <ProgressTab workouts={workouts} />}
                  {activeTab === 'records' && <RecordsTab workouts={workouts} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

function OverviewTab({ workouts }: { workouts: Workout[] }) {
  // Calculate stats for last 30 days
  const thirtyDaysAgo = subDays(new Date(), 30)
  const recentWorkouts = workouts.filter(w =>
    w.completed_at && new Date(w.completed_at) >= thirtyDaysAgo
  )

  const totalWorkouts = recentWorkouts.length
  const totalMinutes = recentWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0)
  const avgDuration = totalWorkouts > 0 ? Math.round(totalMinutes / totalWorkouts) : 0

  // Workout frequency heatmap (last 30 days)
  const days = eachDayOfInterval({ start: thirtyDaysAgo, end: new Date() })
  const workoutsByDate = new Map(
    recentWorkouts.map(w => [
      format(new Date(w.completed_at!), 'yyyy-MM-dd'),
      true
    ])
  )

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="ios-card p-4 text-center">
          <TrendingUp className="h-5 w-5 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold">{totalWorkouts}</div>
          <div className="text-xs text-muted-foreground">Workouts</div>
        </div>
        <div className="ios-card p-4 text-center">
          <Calendar className="h-5 w-5 text-orange-500 mx-auto mb-2" />
          <div className="text-2xl font-bold">{totalMinutes}</div>
          <div className="text-xs text-muted-foreground">Minutes</div>
        </div>
        <div className="ios-card p-4 text-center">
          <Target className="h-5 w-5 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold">{avgDuration}</div>
          <div className="text-xs text-muted-foreground">Avg Time</div>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="ios-card p-4">
        <h3 className="ios-headline mb-4">30-Day Activity</h3>
        <div className="grid grid-cols-10 gap-1">
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const hasWorkout = workoutsByDate.has(dateStr)

            return (
              <div
                key={dateStr}
                className={`
                  aspect-square rounded-sm
                  ${hasWorkout
                    ? 'bg-primary'
                    : 'bg-muted'
                  }
                `}
                title={format(day, 'MMM d')}
              />
            )
          })}
        </div>
        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted" />
            <div className="w-3 h-3 rounded-sm bg-primary/30" />
            <div className="w-3 h-3 rounded-sm bg-primary/60" />
            <div className="w-3 h-3 rounded-sm bg-primary" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  )
}

function ProgressTab({ workouts }: { workouts: Workout[] }) {
  // Group by week
  const weeklyData = workouts
    .filter(w => w.completed_at)
    .reduce((acc, w) => {
      const weekStart = format(new Date(w.completed_at!), 'yyyy-MM-dd')
      if (!acc[weekStart]) {
        acc[weekStart] = { count: 0, minutes: 0 }
      }
      acc[weekStart].count++
      acc[weekStart].minutes += w.duration_minutes || 0
      return acc
    }, {} as Record<string, { count: number; minutes: number }>)

  const weeks = Object.entries(weeklyData)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 8)
    .reverse()

  return (
    <div className="space-y-6">
      <div className="ios-card p-4">
        <h3 className="ios-headline mb-4">Weekly Volume</h3>
        <div className="space-y-3">
          {weeks.map(([week, data]) => (
            <div key={week}>
              <div className="flex items-center justify-between mb-1 text-sm">
                <span className="text-muted-foreground">{format(new Date(week), 'MMM d')}</span>
                <span className="font-medium">{data.count} workouts</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min((data.count / 7) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {workouts.length === 0 && (
        <div className="text-center py-12">
          <p className="ios-body text-muted-foreground">
            Complete workouts to see your progress
          </p>
        </div>
      )}
    </div>
  )
}

function RecordsTab({ workouts }: { workouts: Workout[] }) {
  // Calculate records
  const totalWorkouts = workouts.length
  const totalMinutes = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0)
  const longestWorkout = Math.max(...workouts.map(w => w.duration_minutes || 0), 0)
  const currentStreak = calculateStreak(workouts)

  return (
    <div className="space-y-3">
      <RecordCard
        icon={<Award className="h-6 w-6 text-blue-500" />}
        label="Total Workouts"
        value={totalWorkouts.toString()}
        color="bg-blue-50 dark:bg-blue-950/30"
      />
      <RecordCard
        icon={<Calendar className="h-6 w-6 text-orange-500" />}
        label="Total Time"
        value={`${totalMinutes} min`}
        color="bg-orange-50 dark:bg-orange-950/30"
      />
      <RecordCard
        icon={<TrendingUp className="h-6 w-6 text-green-500" />}
        label="Longest Workout"
        value={`${longestWorkout} min`}
        color="bg-green-50 dark:bg-green-950/30"
      />
      <RecordCard
        icon={<Target className="h-6 w-6 text-purple-500" />}
        label="Current Streak"
        value={`${currentStreak} days`}
        color="bg-purple-50 dark:bg-purple-950/30"
      />
    </div>
  )
}

function RecordCard({
  icon,
  label,
  value,
  color
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className={`${color} rounded-2xl p-4 flex items-center gap-4`}>
      <div className="shrink-0">{icon}</div>
      <div className="flex-1">
        <div className="ios-caption text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  )
}

function calculateStreak(workouts: Workout[]): number {
  if (workouts.length === 0) return 0

  const sortedDates = workouts
    .filter(w => w.completed_at)
    .map(w => format(new Date(w.completed_at!), 'yyyy-MM-dd'))
    .sort()
    .reverse()

  let streak = 0
  let currentDate = new Date()

  for (const dateStr of sortedDates) {
    const workoutDate = new Date(dateStr)
    const diffDays = Math.floor((currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays <= 1) {
      streak++
      currentDate = workoutDate
    } else {
      break
    }
  }

  return streak
}
