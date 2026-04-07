'use client'

import { Button } from '@/components/ui/button'
import { useWorkoutStreak } from '@/lib/hooks/use-achievements'
import type { ScheduledWorkout } from '@/lib/hooks/use-workout-schedule'
import { springs, variants } from '@/lib/motion-system'
import { hapticFeedback } from '@/lib/utils'
import { AnimatePresence, motion } from 'motion/react'
import { Flame, PlayCircle, Plus, Sparkles } from 'lucide-react'

interface WorkoutTodayHeaderProps {
  todayWorkout?: ScheduledWorkout | null
  todayCompleted: boolean
  completedCount: number
  weeklyWorkoutCount: number
  weeklyGoal: number
  onStartWorkout?: () => void
  onStartEmptyWorkout: () => void
  onGenerateWorkout: (focus?: string) => void
  hasTemplates?: boolean
}

const MUSCLE_FOCUS_TAGS = ['Upper Body', 'Lower Body', 'Full Body', 'Core']

function ProgressRing({
  completed,
  total,
}: {
  completed: number
  total: number
}) {
  const radius = 24
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(completed / Math.max(total, 1), 1)
  const offset = circumference * (1 - progress)

  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle
          cx="28" cy="28" r={radius}
          fill="none"
          className="stroke-white/20"
          strokeWidth="4"
        />
        <motion.circle
          cx="28" cy="28" r={radius}
          fill="none"
          className="stroke-white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ...springs.ios }}
          transform="rotate(-90 28 28)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
        {completed}/{total}
      </div>
    </div>
  )
}

export function WorkoutTodayHeader({
  todayWorkout,
  todayCompleted,
  completedCount,
  weeklyWorkoutCount,
  weeklyGoal,
  onStartWorkout,
  onStartEmptyWorkout,
  onGenerateWorkout,
  hasTemplates = false,
}: WorkoutTodayHeaderProps) {
  const { data: streak, isLoading: streakLoading } = useWorkoutStreak()

  const handleStartWorkout = () => {
    onStartWorkout?.()
    hapticFeedback('medium')
  }

  const handleStartEmpty = () => {
    onStartEmptyWorkout()
    hapticFeedback('medium')
  }

  const handleGenerate = (focus?: string) => {
    onGenerateWorkout(focus)
    hapticFeedback('medium')
  }

  const state: 'completed' | 'scheduled' | 'unscheduled' = todayCompleted
    ? 'completed'
    : todayWorkout?.template
      ? 'scheduled'
      : 'unscheduled'

  const gradientClass =
    state === 'completed'
      ? 'from-green-600 to-emerald-500 dark:from-green-700 dark:to-emerald-600'
      : state === 'scheduled'
        ? 'from-primary to-blue-600 dark:from-primary dark:to-blue-700'
        : 'from-violet-600 to-purple-500 dark:from-violet-700 dark:to-purple-600'

  const template = todayWorkout?.template
  const exerciseCount = Array.isArray(template?.exercises) ? template.exercises.length : 0

  return (
    <motion.div
      {...variants.slideUp}
      transition={springs.ios}
      className={`rounded-2xl bg-gradient-to-br ${gradientClass} p-5 text-white overflow-hidden`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
            Today
          </p>

          <AnimatePresence mode="wait">
            {state === 'completed' ? (
              <motion.div key="completed" {...variants.fade}>
                <h2 className="text-xl font-bold mt-1">Workout Complete!</h2>
                <p className="text-sm text-white/70 mt-0.5">
                  {completedCount} workout{completedCount > 1 ? 's' : ''} done today
                </p>
              </motion.div>
            ) : state === 'scheduled' ? (
              <motion.div key="scheduled" {...variants.fade}>
                <h2 className="text-xl font-bold mt-1 truncate">
                  {template?.name || 'Scheduled Workout'}
                </h2>
                <p className="text-sm text-white/70 mt-0.5">
                  {exerciseCount} exercises &middot; ~{template?.duration_minutes || 30} min
                </p>
              </motion.div>
            ) : (
              <motion.div key="unscheduled" {...variants.fade}>
                <h2 className="text-xl font-bold mt-1">
                  What are we training?
                </h2>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ProgressRing completed={weeklyWorkoutCount} total={weeklyGoal} />
      </div>

      {state === 'unscheduled' && (
        <div className="flex flex-wrap gap-2 mt-3">
          {MUSCLE_FOCUS_TAGS.map((tag, i) => (
            <motion.button
              key={tag}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03, ...springs.ios }}
              onClick={() => handleGenerate(tag)}
              className="bg-white/20 rounded-lg px-3 py-1.5 text-xs font-medium text-white active:bg-white/30 min-h-touch"
            >
              {tag}
            </motion.button>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        {state === 'scheduled' && onStartWorkout ? (
          <Button
            onClick={handleStartWorkout}
            className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0 min-h-touch"
          >
            <PlayCircle className="h-4 w-4 mr-1.5" />
            Start Workout
          </Button>
        ) : state === 'unscheduled' ? (
          <Button
            onClick={() => handleGenerate()}
            className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0 min-h-touch"
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            Generate Workout
          </Button>
        ) : null}

        {state !== 'completed' && (
          <Button
            onClick={handleStartEmpty}
            variant="ghost"
            className="bg-white/15 hover:bg-white/25 text-white border-0 min-h-touch"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Empty
          </Button>
        )}
      </div>

      {!streakLoading && streak && streak.current_streak > 0 && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-white/70">
          <Flame className="h-3.5 w-3.5 text-orange-300" />
          <span>{streak.current_streak} day streak</span>
          <span className="text-white/40">&middot;</span>
          <span>Best: {streak.longest_streak}</span>
        </div>
      )}
    </motion.div>
  )
}
