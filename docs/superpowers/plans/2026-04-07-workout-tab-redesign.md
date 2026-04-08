# Workout Tab Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the workout tab from a flat stack of equally-weighted cards into a fitness dashboard with clear visual hierarchy, contextual AI integration, week calendar, muscle map, progress tracking, and empty workout support.

**Architecture:** Replace the current vertical stack (Hero, AI Button, Streak, Stats, Templates, Activity) with a new layout: Today Header (3 states with AI/progress ring/streak inlined), Week Strip, Quick Stats (4 metrics), redesigned Templates, Muscle Map + Recent PRs side-by-side, and compact Recent Activity. Add utility functions for volume/trend/muscle-group computations. Modify workout-logger to support starting without a template.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion (`motion/react`), TanStack React Query v5, Supabase, Vitest + React Testing Library, Lucide icons, date-fns.

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `lib/workout-stats.ts` | Pure functions: weekly volume, week-over-week trend, muscle group mapping |
| `__tests__/lib/workout-stats.test.ts` | Tests for workout-stats helpers |
| `components/workouts/WorkoutTodayHeader.tsx` | Today header with 3 states (scheduled/unscheduled/completed), progress ring, inline streak, AI entry |
| `components/workouts/WorkoutWeekStrip.tsx` | 7-day horizontal calendar showing scheduled/completed/rest days |
| `components/workouts/WorkoutQuickStats.tsx` | Compact 4-column stats row (workouts, time, volume, trend) |
| `components/workouts/WorkoutMuscleMap.tsx` | Muscle group tag cloud showing which groups hit this week |
| `components/workouts/WorkoutRecentPRs.tsx` | Compact list of 3 most recent personal records |

### Modified Files
| File | Changes |
|------|---------|
| `components/workouts/WorkoutTemplatesList.tsx` | Redesign TemplateCard: add gradient icon, muscle group subtitle, remove left border accent |
| `components/workouts/WorkoutRecentActivity.tsx` | Convert from standalone cards to compact rows inside single card |
| `components/views/workouts-view.tsx` | New layout composition: replace Hero/AI button/Streak/Stats with new components, add new props |
| `components/workouts/index.ts` | Add exports for 5 new components |
| `components/workout-logger.tsx` | Make `template` prop optional, support empty exercise list |
| `app/page.tsx` | Add `onStartEmptyWorkout` handler, extend workout data fetch to 2 weeks, pass exercises to workouts-view |

---

## Task 1: Workout Stats Utility Functions

**Files:**
- Create: `lib/workout-stats.ts`
- Create: `__tests__/lib/workout-stats.test.ts`

- [ ] **Step 1: Write failing tests for muscle group mapping**

```typescript
// __tests__/lib/workout-stats.test.ts
import { describe, it, expect } from 'vitest'
import {
  MUSCLE_GROUP_MAP,
  getMuscleGroupsHitThisWeek,
  computeWeeklyVolume,
  computeVolumeTrend,
} from '@/lib/workout-stats'

describe('getMuscleGroupsHitThisWeek', () => {
  it('should map granular muscle groups to display categories', () => {
    const exerciseMuscleGroups = ['chest', 'triceps', 'quadriceps']
    const result = getMuscleGroupsHitThisWeek(exerciseMuscleGroups)
    expect(result).toEqual(
      expect.arrayContaining(['Chest', 'Arms', 'Legs'])
    )
    expect(result).toHaveLength(3)
  })

  it('should deduplicate when multiple sub-groups map to same category', () => {
    const exerciseMuscleGroups = ['quadriceps', 'hamstrings', 'glutes', 'calves']
    const result = getMuscleGroupsHitThisWeek(exerciseMuscleGroups)
    expect(result).toEqual(['Legs'])
  })

  it('should return empty array for no muscle groups', () => {
    const result = getMuscleGroupsHitThisWeek([])
    expect(result).toEqual([])
  })

  it('should handle unknown muscle groups gracefully', () => {
    const result = getMuscleGroupsHitThisWeek(['unknown_muscle'])
    expect(result).toEqual([])
  })
})

describe('computeWeeklyVolume', () => {
  it('should sum total_volume from workouts', () => {
    const workouts = [
      { total_volume: 5000 },
      { total_volume: 3000 },
      { total_volume: null },
    ] as Array<{ total_volume: number | null }>
    expect(computeWeeklyVolume(workouts)).toBe(8000)
  })

  it('should return 0 for empty array', () => {
    expect(computeWeeklyVolume([])).toBe(0)
  })

  it('should return 0 when all volumes are null', () => {
    const workouts = [
      { total_volume: null },
      { total_volume: null },
    ] as Array<{ total_volume: number | null }>
    expect(computeWeeklyVolume(workouts)).toBe(0)
  })
})

describe('computeVolumeTrend', () => {
  it('should compute positive percentage change', () => {
    expect(computeVolumeTrend(11000, 10000)).toBe(10)
  })

  it('should compute negative percentage change', () => {
    expect(computeVolumeTrend(9000, 10000)).toBe(-10)
  })

  it('should return 0 when previous is 0', () => {
    expect(computeVolumeTrend(5000, 0)).toBe(0)
  })

  it('should return 0 when both are 0', () => {
    expect(computeVolumeTrend(0, 0)).toBe(0)
  })

  it('should round to nearest integer', () => {
    expect(computeVolumeTrend(10333, 10000)).toBe(3)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/workout-stats.test.ts`
Expected: FAIL -- module `@/lib/workout-stats` not found

- [ ] **Step 3: Implement workout-stats.ts**

```typescript
// lib/workout-stats.ts

/**
 * muscle group mapping from granular exercise muscle_groups
 * to 6 display categories for the workout dashboard
 */

export const DISPLAY_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core',
] as const

export type DisplayGroup = (typeof DISPLAY_GROUPS)[number]

export const MUSCLE_GROUP_MAP: Record<string, DisplayGroup> = {
  chest: 'Chest',
  pectorals: 'Chest',
  back: 'Back',
  lats: 'Back',
  traps: 'Back',
  rhomboids: 'Back',
  shoulders: 'Shoulders',
  deltoids: 'Shoulders',
  biceps: 'Arms',
  triceps: 'Arms',
  forearms: 'Arms',
  quadriceps: 'Legs',
  hamstrings: 'Legs',
  glutes: 'Legs',
  calves: 'Legs',
  abs: 'Core',
  obliques: 'Core',
  core: 'Core',
  'lower back': 'Core',
}

/**
 * given a flat array of granular muscle group strings (from exercises trained this week),
 * return deduplicated display category names
 */
export function getMuscleGroupsHitThisWeek(
  exerciseMuscleGroups: string[]
): DisplayGroup[] {
  const hit = new Set<DisplayGroup>()
  for (const group of exerciseMuscleGroups) {
    const mapped = MUSCLE_GROUP_MAP[group.toLowerCase()]
    if (mapped) hit.add(mapped)
  }
  return Array.from(hit)
}

/**
 * sum total_volume from an array of workout records
 */
export function computeWeeklyVolume(
  workouts: Array<{ total_volume: number | null }>
): number {
  return workouts.reduce((sum, w) => sum + (w.total_volume || 0), 0)
}

/**
 * compute week-over-week volume trend as a rounded percentage
 * returns 0 if previous week had no volume
 */
export function computeVolumeTrend(
  currentVolume: number,
  previousVolume: number
): number {
  if (previousVolume === 0) return 0
  return Math.round(((currentVolume - previousVolume) / previousVolume) * 100)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/workout-stats.test.ts`
Expected: All 10 tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/workout-stats.ts __tests__/lib/workout-stats.test.ts
git commit -m "feat(workouts): add workout stats utility functions

Add muscle group mapping, weekly volume computation, and
volume trend calculation helpers for the workout dashboard."
```

---

## Task 2: WorkoutTodayHeader Component

**Files:**
- Create: `components/workouts/WorkoutTodayHeader.tsx`

This is the most complex new component. It has 3 states (scheduled, unscheduled, completed), a progress ring, inline streak, and contextual action buttons.

- [ ] **Step 1: Create WorkoutTodayHeader component**

```tsx
// components/workouts/WorkoutTodayHeader.tsx
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

  // determine state
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

      {/* muscle focus tags (unscheduled state only) */}
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

      {/* action buttons */}
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

      {/* inline streak */}
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
```

- [ ] **Step 2: Verify component renders without errors**

Run: `npx vitest run --passWithNoTests` (sanity check the build doesn't break)

- [ ] **Step 3: Commit**

```bash
git add components/workouts/WorkoutTodayHeader.tsx
git commit -m "feat(workouts): add WorkoutTodayHeader component

Three-state header (scheduled/unscheduled/completed) with
progress ring, inline streak, AI muscle focus tags, and
empty workout button."
```

---

## Task 3: WorkoutWeekStrip Component

**Files:**
- Create: `components/workouts/WorkoutWeekStrip.tsx`

- [ ] **Step 1: Create WorkoutWeekStrip component**

```tsx
// components/workouts/WorkoutWeekStrip.tsx
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

  // build lookup maps
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

  // generate week dates (Mon-Sun)
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
```

- [ ] **Step 2: Commit**

```bash
git add components/workouts/WorkoutWeekStrip.tsx
git commit -m "feat(workouts): add WorkoutWeekStrip component

7-day horizontal calendar showing completed, scheduled,
and rest days for the current week."
```

---

## Task 4: WorkoutQuickStats Component

**Files:**
- Create: `components/workouts/WorkoutQuickStats.tsx`

- [ ] **Step 1: Create WorkoutQuickStats component**

```tsx
// components/workouts/WorkoutQuickStats.tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/workouts/WorkoutQuickStats.tsx
git commit -m "feat(workouts): add WorkoutQuickStats component

Compact 4-column stats row showing workouts, time, volume,
and week-over-week trend with animated numbers."
```

---

## Task 5: WorkoutMuscleMap Component

**Files:**
- Create: `components/workouts/WorkoutMuscleMap.tsx`

- [ ] **Step 1: Create WorkoutMuscleMap component**

```tsx
// components/workouts/WorkoutMuscleMap.tsx
'use client'

import { springs, variants } from '@/lib/motion-system'
import { DISPLAY_GROUPS, getMuscleGroupsHitThisWeek } from '@/lib/workout-stats'
import type { DisplayGroup } from '@/lib/workout-stats'
import { motion } from 'motion/react'

interface WorkoutMuscleMapProps {
  /** flat array of all muscle_groups from exercises completed this week */
  trainedMuscleGroups: string[]
}

export function WorkoutMuscleMap({ trainedMuscleGroups }: WorkoutMuscleMapProps) {
  const hitGroups = new Set<DisplayGroup>(
    getMuscleGroupsHitThisWeek(trainedMuscleGroups)
  )

  const hitCount = hitGroups.size

  return (
    <motion.div
      {...variants.slideUp}
      transition={springs.ios}
      className="flex-1 ios-card p-4"
    >
      <h3 className="text-sm font-semibold mb-2">Muscle Map</h3>

      <div className="flex flex-wrap gap-1.5">
        {DISPLAY_GROUPS.map((group) => {
          const isHit = hitGroups.has(group)
          return (
            <motion.span
              key={group}
              initial={isHit ? { scale: 0.95 } : false}
              animate={isHit ? { scale: 1 } : undefined}
              transition={springs.touch}
              className={`text-[10px] font-medium px-2 py-1 rounded-md ${
                isHit
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {group} {isHit && '\u2713'}
            </motion.span>
          )
        })}
      </div>

      <p className="text-[10px] text-muted-foreground mt-2">
        {hitCount}/{DISPLAY_GROUPS.length} groups this week
      </p>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/workouts/WorkoutMuscleMap.tsx
git commit -m "feat(workouts): add WorkoutMuscleMap component

Tag cloud showing which of 6 muscle groups have been trained
this week with hit/unhit visual states."
```

---

## Task 6: WorkoutRecentPRs Component

**Files:**
- Create: `components/workouts/WorkoutRecentPRs.tsx`

- [ ] **Step 1: Create WorkoutRecentPRs component**

```tsx
// components/workouts/WorkoutRecentPRs.tsx
'use client'

import { usePersonalRecords } from '@/lib/hooks/use-workouts'
import { getStaggerDelay, springs, variants } from '@/lib/motion-system'
import { hapticFeedback } from '@/lib/utils'
import { motion } from 'motion/react'
import { Star } from 'lucide-react'

interface WorkoutRecentPRsProps {
  onViewAll: () => void
}

export function WorkoutRecentPRs({ onViewAll }: WorkoutRecentPRsProps) {
  const { data: records = [] } = usePersonalRecords()

  const recentPRs = records
    .sort((a, b) => new Date(b.achieved_at).getTime() - new Date(a.achieved_at).getTime())
    .slice(0, 3)

  return (
    <motion.div
      {...variants.slideUp}
      transition={springs.ios}
      className="flex-1 ios-card p-4"
    >
      <h3 className="text-sm font-semibold mb-2">Recent PRs</h3>

      {recentPRs.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No records yet. Keep training!
        </p>
      ) : (
        <div className="space-y-1.5">
          {recentPRs.map((pr, i) => (
            <motion.div
              key={pr.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: getStaggerDelay(i), ...springs.ios }}
              className="flex items-center gap-1.5 text-xs"
            >
              <motion.div
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ delay: getStaggerDelay(i) + 0.1, ...springs.ios }}
              >
                <Star className="h-3 w-3 text-orange-500 fill-orange-500" />
              </motion.div>
              <span className="truncate flex-1">{pr.exercise_name}</span>
              <span className="font-semibold shrink-0">
                {pr.value}{pr.unit ? ` ${pr.unit}` : ''}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {recentPRs.length > 0 && (
        <button
          onClick={() => {
            onViewAll()
            hapticFeedback('light')
          }}
          className="text-[10px] text-primary font-medium mt-2 block"
        >
          View all &rarr;
        </button>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/workouts/WorkoutRecentPRs.tsx
git commit -m "feat(workouts): add WorkoutRecentPRs component

Compact list of 3 most recent personal records with
animated star icons and view-all link."
```

---

## Task 7: Redesign WorkoutTemplatesList Cards

**Files:**
- Modify: `components/workouts/WorkoutTemplatesList.tsx`

The card gets a gradient icon on the left, muscle group subtitle, and the left-border accent is removed. The section header gets an AI Generate link. Swipe-to-delete and "View all" sheet are preserved.

- [ ] **Step 1: Add difficulty-to-gradient config and update props**

In `components/workouts/WorkoutTemplatesList.tsx`, replace the existing `difficultyConfig` and update the `WorkoutTemplatesListProps` interface:

Replace lines 33-46 (the `difficultyConfig` object):

```typescript
const difficultyGradients: Record<string, string> = {
  beginner: 'from-green-400 to-emerald-500',
  intermediate: 'from-blue-400 to-indigo-500',
  advanced: 'from-red-400 to-purple-500',
}

const difficultyBadgeColors: Record<string, string> = {
  beginner: 'text-green-600 dark:text-green-400',
  intermediate: 'text-blue-600 dark:text-blue-400',
  advanced: 'text-red-600 dark:text-red-400',
}
```

Update the `WorkoutTemplatesListProps` interface to add:

```typescript
interface WorkoutTemplatesListProps {
  templates: WorkoutTemplate[]
  exerciseMap?: Map<string, { name: string; muscle_groups: string[] }>
  onTemplateClick: (template: WorkoutTemplate) => void
  onEditTemplate?: (template: WorkoutTemplate) => void
  onDeleteTemplate?: (template: WorkoutTemplate) => void
  onCreateTemplate: () => void
  onGenerateWorkout?: () => void
  maxVisible?: number
}
```

- [ ] **Step 2: Rewrite TemplateCard with gradient icon and muscle groups**

Replace the inner card JSX of `TemplateCard` (the `<div>` with class `ios-card p-4 border-l-4...`). The swipeable wrapper and delete logic remain unchanged. Replace the card content (the div starting at line 157 `className={...ios-card p-4 border-l-4...}`):

```tsx
<div
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
  style={{
    transform: `translate3d(${translateX}px, 0, 0)`,
    transition: isAnimating ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
    willChange: 'transform',
  }}
  className="w-full ios-card p-3.5 group cursor-pointer relative z-10 bg-background"
>
  <button
    onClick={() => {
      if (!isDraggingRef.current) {
        onClick()
        hapticFeedback('light')
      }
    }}
    className="w-full flex items-center gap-3"
  >
    {/* gradient icon */}
    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
      <Dumbbell className="h-5 w-5 text-white" />
    </div>

    <div className="flex-1 min-w-0 text-left">
      <h4 className="text-sm font-semibold truncate">{template.name}</h4>
      {muscleGroupText && (
        <p className="text-[11px] text-muted-foreground truncate">{muscleGroupText}</p>
      )}
      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
        <span>{exercises.length} exercises</span>
        <span>&middot;</span>
        <span>{template.duration_minutes}min</span>
        <span className={badgeColor}>{template.difficulty}</span>
      </div>
    </div>

    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
  </button>

  {/* edit button - hover only */}
  {onEdit && !template.is_default && (
    <Button
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.stopPropagation()
        onEdit()
        hapticFeedback('light')
      }}
      className="absolute top-2 right-8 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
      aria-label="Edit template"
    >
      <Edit className="h-3.5 w-3.5" />
    </Button>
  )}
</div>
```

Add these variables at the top of the `TemplateCard` component function (after the existing variables):

```typescript
const gradient = difficultyGradients[template.difficulty as string] || difficultyGradients.beginner
const badgeColor = difficultyBadgeColors[template.difficulty as string] || difficultyBadgeColors.beginner

// derive muscle groups from template exercises
const muscleGroupText = (() => {
  if (!exerciseMap) return ''
  const groups = new Set<string>()
  for (const ex of exercises) {
    const exData = exerciseMap.get(ex.exercise_id)
    if (exData) {
      for (const mg of exData.muscle_groups) {
        const mapped = mg.charAt(0).toUpperCase() + mg.slice(1)
        groups.add(mapped)
      }
    }
  }
  return Array.from(groups).slice(0, 3).join(', ')
})()
```

Note: `TemplateCard` needs `exerciseMap` threaded through. Add it as a prop to `TemplateCard`:

```typescript
function TemplateCard({
  template,
  index,
  exerciseMap,
  onClick,
  onEdit,
  onDelete
}: {
  template: WorkoutTemplate
  index: number
  exerciseMap?: Map<string, { name: string; muscle_groups: string[] }>
  onClick: () => void
  onEdit?: () => void
  onDelete?: () => void
})
```

- [ ] **Step 3: Update section header with AI Generate link**

Replace the header section in `WorkoutTemplatesList` (the div with `flex items-center justify-between`):

```tsx
<div className="flex items-center justify-between px-1">
  <h3 className="ios-headline">My Templates</h3>
  <div className="flex items-center gap-3">
    {onGenerateWorkout && (
      <button
        onClick={() => {
          onGenerateWorkout()
          hapticFeedback('light')
        }}
        className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium"
      >
        <Sparkles className="h-3.5 w-3.5" />
        AI Generate
      </button>
    )}
    <Button
      variant="ghost"
      size="sm"
      className="text-primary gap-1"
      onClick={() => {
        onCreateTemplate()
        hapticFeedback('light')
      }}
    >
      <Plus className="h-4 w-4" />
      New
    </Button>
  </div>
</div>
```

Add `Sparkles` and `Dumbbell` to the lucide-react imports at the top of the file.

- [ ] **Step 4: Thread exerciseMap and onGenerateWorkout through TemplateCard renders**

Update both `TemplateCard` usages (in the main list and in the "All Templates" sheet) to pass `exerciseMap`:

```tsx
<TemplateCard
  key={template.id}
  template={template}
  index={index}
  exerciseMap={exerciseMap}
  onClick={() => onTemplateClick(template)}
  onEdit={...}
  onDelete={...}
/>
```

Update the component's function signature to destructure the new props:

```typescript
export function WorkoutTemplatesList({
  templates,
  exerciseMap,
  onTemplateClick,
  onEditTemplate,
  onDeleteTemplate,
  onCreateTemplate,
  onGenerateWorkout,
  maxVisible = 5
}: WorkoutTemplatesListProps)
```

- [ ] **Step 5: Commit**

```bash
git add components/workouts/WorkoutTemplatesList.tsx
git commit -m "feat(workouts): redesign template cards with gradient icons

Replace left-border accent with gradient icons, add muscle
group subtitles, and inline AI Generate link in section header."
```

---

## Task 8: Redesign WorkoutRecentActivity to Compact List

**Files:**
- Modify: `components/workouts/WorkoutRecentActivity.tsx`

- [ ] **Step 1: Rewrite WorkoutRecentActivity as compact list inside single card**

Replace the entire file:

```tsx
// components/workouts/WorkoutRecentActivity.tsx
'use client'

import { getStaggerDelay, springs, variants } from '@/lib/motion-system'
import { hapticFeedback } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'motion/react'
import { CheckCircle2 } from 'lucide-react'
import type { Workout } from '@/lib/supabase'

interface WorkoutRecentActivityProps {
  recentWorkouts: Workout[]
  templateNameMap?: Map<string, string>
  maxVisible?: number
  onViewAll?: () => void
}

export function WorkoutRecentActivity({
  recentWorkouts,
  templateNameMap,
  maxVisible = 3,
  onViewAll,
}: WorkoutRecentActivityProps) {
  if (recentWorkouts.length === 0) {
    return null
  }

  const visibleWorkouts = recentWorkouts.slice(0, maxVisible)

  return (
    <motion.div
      {...variants.slideUp}
      transition={springs.ios}
      className="ios-card p-4"
    >
      <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>

      <div className="space-y-0">
        {visibleWorkouts.map((workout, index) => {
          const completedDate = workout.completed_at ? new Date(workout.completed_at) : null
          const workoutName = workout.notes || (workout.template_id && templateNameMap?.get(workout.template_id)) || 'Quick Workout'
          const isLast = index === visibleWorkouts.length - 1

          return (
            <motion.div
              key={workout.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: getStaggerDelay(index), ...springs.ios }}
              className={`flex items-center gap-3 py-2.5 ${!isLast ? 'border-b border-border/50' : ''}`}
            >
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{workoutName}</p>
                <p className="text-xs text-muted-foreground">
                  {completedDate
                    ? formatDistanceToNow(completedDate, { addSuffix: true })
                    : 'Unknown'}
                  {workout.duration_minutes && ` \u00B7 ${workout.duration_minutes}min`}
                  {workout.total_volume && ` \u00B7 ${Math.round(workout.total_volume).toLocaleString()} kg`}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {recentWorkouts.length > maxVisible && onViewAll && (
        <button
          onClick={() => {
            onViewAll()
            hapticFeedback('light')
          }}
          className="text-xs text-primary font-medium mt-2 block"
        >
          View all &rarr;
        </button>
      )}
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/workouts/WorkoutRecentActivity.tsx
git commit -m "refactor(workouts): compact WorkoutRecentActivity into single card

Replace standalone cards per workout with rows inside a single
card, add relative timestamps and volume display."
```

---

## Task 9: Empty Workout Support in Workout Logger

**Files:**
- Modify: `components/workout-logger.tsx`

> **Note:** All `app/page.tsx` changes (state type, sentinel, handlers) are consolidated in Task 11.

- [ ] **Step 1: Make template prop optional in workout-logger**

In `components/workout-logger.tsx`, update the props interface (line 23-30):

```typescript
interface WorkoutLoggerProps {
  template: WorkoutTemplate | null
  exercises: { id: string; name: string }[]
  onComplete: (workoutData: WorkoutData) => Promise<void>
  onCancel: () => void
  onEditExercises?: () => void
  onExerciseLogsChange?: (logs: ExerciseLog[]) => void
}
```

- [ ] **Step 2: Update useEffect to handle null template**

Replace the `useEffect` that initializes exercise logs (lines 53-68):

```typescript
useEffect(() => {
  if (!template) {
    // empty workout -- start with no exercises
    setExerciseLogs([])
    onExerciseLogsChange?.([])
    return
  }
  const templateExercises = (template.exercises as unknown as TemplateExercise[]) || []
  const logs: ExerciseLog[] = templateExercises.map((te) => {
    const exercise = exercises.find((e) => e.id === te.exercise_id)
    return {
      exercise_id: te.exercise_id,
      exercise_name: exercise?.name || 'unknown',
      sets: [],
      target_sets: te.sets || 3,
      target_reps: String(te.reps || '10'),
      target_rest: te.rest || 60
    }
  })
  setExerciseLogs(logs)
  onExerciseLogsChange?.(logs)
}, [template, exercises, onExerciseLogsChange])
```

- [ ] **Step 3: Update template name references to handle null**

Search the file for uses of `template.name` and guard them. Key locations:

In the `WorkoutProgress` rendering, replace `template.name` with `template?.name || 'Quick Workout'`.

In the `handleComplete` function (where `WorkoutData` is assembled), ensure `template_name` falls back:

```typescript
template_name: template?.name || 'Quick Workout',
template_id: template?.id?.startsWith('generated-') ? null : (template?.id ?? null),
```

- [ ] **Step 4: Commit**

```bash
git add components/workout-logger.tsx
git commit -m "feat(workouts): support null template in workout logger

Make template prop nullable. Guard template.name references
with optional chaining and 'Quick Workout' fallback."
```
---

## Task 10: Wire Up workouts-view with New Layout

**Files:**
- Modify: `components/views/workouts-view.tsx`
- Modify: `components/workouts/index.ts`

- [ ] **Step 1: Update barrel exports**

Replace `components/workouts/index.ts`:

```typescript
export { WorkoutHero } from './WorkoutHero'
export { WorkoutCalendar } from './WorkoutCalendar'
export { WorkoutStats } from './WorkoutStats'
export { WorkoutTemplatesList } from './WorkoutTemplatesList'
export { WorkoutRecentActivity } from './WorkoutRecentActivity'
export { WorkoutScheduleSheet } from './WorkoutScheduleSheet'
export { TemplateDetailSheet } from './TemplateDetailSheet'
export { TemplateFormDialog } from './TemplateFormDialog'
export { WorkoutAnalyticsSheet } from './WorkoutAnalyticsSheet'
export { ExerciseProgressView } from './ExerciseProgressView'
export { WorkoutStreakBadge } from './WorkoutStreakBadge'
export { WorkoutGeneratorSheet } from './WorkoutGeneratorSheet'
export { WorkoutTodayHeader } from './WorkoutTodayHeader'
export { WorkoutWeekStrip } from './WorkoutWeekStrip'
export { WorkoutQuickStats } from './WorkoutQuickStats'
export { WorkoutMuscleMap } from './WorkoutMuscleMap'
export { WorkoutRecentPRs } from './WorkoutRecentPRs'
```

- [ ] **Step 2: Rewrite workouts-view.tsx with new layout**

Replace the entire `components/views/workouts-view.tsx`:

```tsx
'use client'

import {
  TemplateDetailSheet,
  TemplateFormDialog,
  WorkoutAnalyticsSheet,
  WorkoutCalendar,
  WorkoutGeneratorSheet,
  WorkoutMuscleMap,
  WorkoutQuickStats,
  WorkoutRecentActivity,
  WorkoutRecentPRs,
  WorkoutTemplatesList,
  WorkoutTodayHeader,
  WorkoutWeekStrip,
} from '@/components/workouts'
import { useTodayScheduledWorkout, useThisWeekScheduledWorkouts } from '@/lib/hooks/use-workout-schedule'
import type { Exercise, Workout, WorkoutTemplate, WorkoutTemplateInsert, WorkoutTemplateUpdate } from '@/lib/supabase'
import type { ExerciseLog } from '@/lib/types/common'
import { hapticFeedback } from '@/lib/utils'
import { isThisWeek, isToday, subWeeks, startOfWeek, endOfWeek } from 'date-fns'
import { AnimatePresence, motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { Button } from '@/components/ui/button'
import { createPortal } from 'react-dom'
import { useState, useMemo } from 'react'

const DEFAULT_WEEKLY_GOAL = 3

interface WorkoutsViewProps {
  templates: WorkoutTemplate[]
  recentWorkouts: Workout[]
  exercises: Exercise[]
  loading: boolean
  onStartWorkout: (template: WorkoutTemplate) => void
  onStartEmptyWorkout: () => void
  onCreateTemplate?: (template: Partial<WorkoutTemplateInsert>) => Promise<void>
  onUpdateTemplate?: (id: string, template: Partial<WorkoutTemplateUpdate>) => Promise<void>
  onDeleteTemplate?: (id: string) => Promise<void>
  activeWorkout?: WorkoutTemplate | null
  exerciseLogs?: ExerciseLog[]
  editingWorkoutExercises?: boolean
  onReturnToWorkout?: () => void
}

export function WorkoutsView({
  templates,
  recentWorkouts,
  exercises,
  loading,
  onStartWorkout,
  onStartEmptyWorkout,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  activeWorkout,
  exerciseLogs = [],
  editingWorkoutExercises = false,
  onReturnToWorkout
}: WorkoutsViewProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [generatorFocus, setGeneratorFocus] = useState<string | undefined>()

  const templateToShow = editingWorkoutExercises && activeWorkout
    ? activeWorkout
    : selectedTemplate
  const isWorkoutActive = !!activeWorkout

  const templateToShowWithFreshData = templateToShow && activeWorkout && templateToShow.id === activeWorkout.id
    ? templates.find(t => t.id === activeWorkout.id) || templateToShow
    : templateToShow

  const { data: todayWorkout } = useTodayScheduledWorkout()
  const { data: weekSchedule = [] } = useThisWeekScheduledWorkouts()

  // exercise lookup map for template cards
  const exerciseMap = useMemo(() => {
    const map = new Map<string, { name: string; muscle_groups: string[] }>()
    for (const ex of exercises) {
      map.set(ex.id, { name: ex.name, muscle_groups: ex.muscle_groups || [] })
    }
    return map
  }, [exercises])

  // template name lookup for recent activity display
  const templateNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of templates) {
      map.set(t.id, t.name)
    }
    return map
  }, [templates])

  // split workouts into current week and previous week
  const now = new Date()
  const thisWeekWorkouts = recentWorkouts.filter(w =>
    w.completed_at && isThisWeek(new Date(w.completed_at), { weekStartsOn: 1 })
  )
  const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const prevWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
  const prevWeekWorkouts = recentWorkouts.filter(w => {
    if (!w.completed_at) return false
    const d = new Date(w.completed_at)
    return d >= prevWeekStart && d <= prevWeekEnd
  })

  const todaysWorkouts = recentWorkouts.filter(w =>
    w.completed_at && isToday(new Date(w.completed_at))
  )

  const todayCompleted = todaysWorkouts.length > 0 &&
    todayWorkout?.status === 'completed'

  // muscle groups trained this week
  // NOTE: approximation -- uses template exercises, not actual logged exercises.
  // custom/empty workouts or mid-workout exercise changes won't be reflected.
  const trainedMuscleGroups = useMemo(() => {
    const groups: string[] = []
    for (const w of thisWeekWorkouts) {
      const template = templates.find(t => t.id === w.template_id)
      if (template) {
        const exs = (template.exercises as unknown as Array<{ exercise_id: string }>) || []
        for (const ex of exs) {
          const exData = exerciseMap.get(ex.exercise_id)
          if (exData) groups.push(...exData.muscle_groups)
        }
      }
    }
    return groups
  }, [thisWeekWorkouts, templates, exerciseMap])

  const handleQuickStart = () => {
    if (todayWorkout?.template) {
      onStartWorkout(todayWorkout.template)
      hapticFeedback('medium')
    }
  }

  const handleGenerateWorkout = (focus?: string) => {
    setGeneratorFocus(focus)
    setShowGenerator(true)
    hapticFeedback('medium')
  }

  const handleTemplateClick = (template: WorkoutTemplate) => {
    setSelectedTemplate(template)
    hapticFeedback('light')
  }

  const handleEditTemplate = (template: WorkoutTemplate) => {
    setEditingTemplate(template)
    hapticFeedback('light')
  }

  if (loading) {
    return <WorkoutSkeleton />
  }

  return (
    <div className="space-y-3 pb-24">
      {/* 1. Today Header */}
      <WorkoutTodayHeader
        todayWorkout={todayWorkout}
        todayCompleted={todayCompleted}
        completedCount={todaysWorkouts.length}
        weeklyWorkoutCount={thisWeekWorkouts.length}
        weeklyGoal={DEFAULT_WEEKLY_GOAL}
        onStartWorkout={todayWorkout?.template ? handleQuickStart : undefined}
        onStartEmptyWorkout={onStartEmptyWorkout}
        onGenerateWorkout={handleGenerateWorkout}
        hasTemplates={templates.length > 0}
      />

      {/* 2. Week Strip */}
      <WorkoutWeekStrip
        recentWorkouts={recentWorkouts}
        onOpenCalendar={() => {
          setShowCalendar(true)
          hapticFeedback('light')
        }}
      />

      {/* 3. Quick Stats */}
      <WorkoutQuickStats
        weekWorkouts={thisWeekWorkouts}
        prevWeekWorkouts={prevWeekWorkouts}
      />

      {/* 4. Templates */}
      <WorkoutTemplatesList
        templates={templates}
        exerciseMap={exerciseMap}
        onTemplateClick={handleTemplateClick}
        onEditTemplate={handleEditTemplate}
        onDeleteTemplate={onDeleteTemplate ? (template) => onDeleteTemplate(template.id) : undefined}
        onCreateTemplate={() => setShowCreateDialog(true)}
        onGenerateWorkout={() => handleGenerateWorkout()}
        maxVisible={5}
      />

      {/* 5. Muscle Map + Recent PRs */}
      <div className="flex gap-3">
        <WorkoutMuscleMap trainedMuscleGroups={trainedMuscleGroups} />
        <WorkoutRecentPRs onViewAll={() => setShowAnalytics(true)} />
      </div>

      {/* 6. Recent Activity */}
      <WorkoutRecentActivity
        recentWorkouts={recentWorkouts}
        templateNameMap={templateNameMap}
        maxVisible={3}
        onViewAll={() => setShowAnalytics(true)}
      />

      {/* --- Sheets/Dialogs (unchanged behavior) --- */}

      <TemplateDetailSheet
        template={templateToShowWithFreshData}
        onClose={() => {
          if (editingWorkoutExercises && onReturnToWorkout) {
            onReturnToWorkout()
          } else {
            setSelectedTemplate(null)
          }
        }}
        onStart={() => {
          if (templateToShow) {
            onStartWorkout(templateToShow)
            setSelectedTemplate(null)
          }
        }}
        onUpdateTemplate={onUpdateTemplate}
        onDeleteTemplate={onDeleteTemplate ? async (id: string) => {
          await onDeleteTemplate(id)
          setSelectedTemplate(null)
        } : undefined}
        isWorkoutActive={isWorkoutActive}
        exerciseLogs={exerciseLogs}
      />

      <TemplateFormDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSave={async (template) => {
          if (onCreateTemplate) {
            await onCreateTemplate(template)
            setShowCreateDialog(false)
          }
        }}
        title="Create Workout Template"
      />

      <TemplateFormDialog
        isOpen={!!editingTemplate}
        template={editingTemplate || undefined}
        onClose={() => setEditingTemplate(null)}
        onSave={async (template) => {
          if (editingTemplate && onUpdateTemplate) {
            await onUpdateTemplate(editingTemplate.id, template)
            setEditingTemplate(null)
          }
        }}
        title="Edit Workout Template"
      />

      <WorkoutAnalyticsSheet
        isOpen={showAnalytics}
        workouts={recentWorkouts}
        onClose={() => setShowAnalytics(false)}
      />

      {/* Full Calendar Sheet */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showCalendar && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={springs.sheet}
              className="fixed inset-0 z-[60] bg-background flex flex-col !mt-0"
            >
              <div className="safe-top border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="px-4 py-3 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCalendar(false)
                      hapticFeedback('light')
                    }}
                  >
                    Close
                  </Button>
                  <h2 className="ios-headline">Calendar</h2>
                  <div className="w-14" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <WorkoutCalendar
                  scheduledWorkouts={weekSchedule}
                  completedDates={recentWorkouts
                    .filter(w => w.completed_at)
                    .map(w => w.completed_at!.split('T')[0])}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <WorkoutGeneratorSheet
        isOpen={showGenerator}
        onClose={() => {
          setShowGenerator(false)
          setGeneratorFocus(undefined)
        }}
        onStartWorkout={(workout) => {
          const template: WorkoutTemplate = {
            id: `generated-${Date.now()}`,
            user_id: null,
            name: workout.name,
            description: workout.description,
            difficulty: workout.difficulty as 'beginner' | 'intermediate' | 'advanced',
            duration_minutes: workout.estimated_duration,
            exercises: workout.exercises.map((ex, idx) => ({
              exercise_id: ex.exercise_id,
              name: ex.name,
              sets: ex.sets,
              reps: ex.reps,
              rest: ex.rest,
              order: idx,
              image_url: ex.image_url,
              gif_url: ex.gif_url,
            })),
            is_default: false,
            tags: null,
            target_goal: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          onStartWorkout(template)
          setShowGenerator(false)
          setGeneratorFocus(undefined)
        }}
        onSaveAsTemplate={async (workout) => {
          if (onCreateTemplate) {
            await onCreateTemplate({
              name: workout.name,
              description: workout.description,
              difficulty: workout.difficulty as 'beginner' | 'intermediate' | 'advanced',
              duration_minutes: workout.estimated_duration,
              exercises: workout.exercises.map((ex, idx) => ({
                exercise_id: ex.exercise_id,
                name: ex.name,
                sets: ex.sets || 3,
                reps: ex.reps || 10,
                rest: ex.rest || 60,
                image_url: ex.image_url,
                gif_url: ex.gif_url,
                order: idx,
              })),
            })
          }
        }}
      />
    </div>
  )
}

function WorkoutSkeleton() {
  return (
    <div className="space-y-3 pb-24">
      {/* header skeleton */}
      <div className="rounded-2xl bg-muted h-44 animate-pulse" />
      {/* week strip skeleton */}
      <div className="ios-card h-24 animate-pulse" />
      {/* stats skeleton */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 ios-card h-16 animate-pulse" />
        ))}
      </div>
      {/* templates skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-32 bg-muted rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="ios-card h-20 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/workouts/index.ts components/views/workouts-view.tsx
git commit -m "feat(workouts): wire up new dashboard layout

New layout: TodayHeader, WeekStrip, QuickStats, Templates,
MuscleMap + RecentPRs, RecentActivity. Remove standalone
Hero, AI button, and StreakBadge from main view."
```

---

## Task 11: Update app/page.tsx Props and Empty Workout State

**Files:**
- Modify: `app/page.tsx`

The workouts-view now requires `exercises` and `onStartEmptyWorkout` props. This task also consolidates all `app/page.tsx` changes for the empty workout flow (state type, sentinel, show condition, cancel/complete handlers) that support the null-template workout logger from Task 9.

- [ ] **Step 1: Extend workout data fetch to 2 weeks**

In `app/page.tsx`, find where `weekAgo` is computed (used for the `useWorkouts` startDate filter) and change it to 2 weeks:

```typescript
const twoWeeksAgo = format(subWeeks(new Date(), 2), 'yyyy-MM-dd')
```

Update the `useWorkouts` call to use `twoWeeksAgo` instead of `weekAgo`:

```typescript
const { data: workouts = [] } = useWorkouts(
  { startDate: twoWeeksAgo },
  { enabled: activeView === 'workouts' }
)
```

Import `subWeeks` from `date-fns` if not already imported.

- [ ] **Step 2: Pass new props to WorkoutsView**

Update the `<WorkoutsView>` JSX to include the new props:

```tsx
<WorkoutsView
  templates={workoutTemplates}
  recentWorkouts={workouts}
  exercises={exercises}
  loading={templatesLoading}
  onStartWorkout={(template) => {
    setActiveWorkout(template)
    setExerciseLogs([])
    setEditingWorkoutExercises(false)
    setActiveView('summary')
    hapticFeedback('medium')
  }}
  onStartEmptyWorkout={() => {
    setActiveWorkout(null)
    setExerciseLogs([])
    setEditingWorkoutExercises(false)
    setActiveView('summary')
    hapticFeedback('medium')
  }}
  onCreateTemplate={async (templateData) => {
    await createTemplate(templateData as any)
  }}
  onUpdateTemplate={async (id, templateData) => {
    await updateTemplate({ id, ...templateData } as any)
  }}
  onDeleteTemplate={async (id) => {
    await deleteTemplate(id)
  }}
  activeWorkout={activeWorkout}
  exerciseLogs={exerciseLogs}
  editingWorkoutExercises={editingWorkoutExercises}
  onReturnToWorkout={() => {
    setEditingWorkoutExercises(false)
    setActiveView('summary')
  }}
/>
```

- [ ] **Step 3: Update WorkoutLogger condition for null template**

Update the `activeWorkout` state type and the condition for showing the logger.

Change the state declaration from:
```typescript
const [activeWorkout, setActiveWorkout] = useState<WorkoutTemplate | null>(null)
```
to:
```typescript
const [activeWorkout, setActiveWorkout] = useState<WorkoutTemplate | null | undefined>(undefined)
```

Update the workout logger show condition (around line 708-709):
```typescript
const shouldShow = activeWorkout !== undefined && activeView !== 'workouts'
```

Update the `onCancel` and `onComplete` callbacks to reset to `undefined`:
```typescript
onCancel={() => {
  setActiveWorkout(undefined)
  setExerciseLogs([])
}}
```

And in `onComplete`:
```typescript
setActiveWorkout(undefined)
```

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat(workouts): connect new dashboard props and empty workout flow

Pass exercises and onStartEmptyWorkout to WorkoutsView.
Extend workout fetch to 2 weeks for trend calculation.
Use undefined sentinel for inactive workout state."
```

---

## Task 12: Component Tests for New UI Components

**Files:**
- Create: `__tests__/components/workouts/workout-today-header.test.tsx`
- Create: `__tests__/components/workouts/workout-week-strip.test.tsx`
- Create: `__tests__/components/workouts/workout-quick-stats.test.tsx`

These tests cover the three most stateful new components. WorkoutMuscleMap and WorkoutRecentPRs are simpler (data-in, render-out) and can be tested later if needed.

- [ ] **Step 1: Write WorkoutTodayHeader state rendering tests**

```tsx
// __tests__/components/workouts/workout-today-header.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WorkoutTodayHeader } from '@/components/workouts/WorkoutTodayHeader'

vi.mock('@/lib/hooks/use-achievements', () => ({
  useWorkoutStreak: vi.fn(() => ({
    data: { current_streak: 3, longest_streak: 7 },
    isLoading: false,
  })),
}))

vi.mock('@/lib/utils', () => ({
  hapticFeedback: vi.fn(),
}))

const baseProps = {
  todayWorkout: null,
  todayCompleted: false,
  completedCount: 0,
  weeklyWorkoutCount: 2,
  weeklyGoal: 3,
  onStartEmptyWorkout: vi.fn(),
  onGenerateWorkout: vi.fn(),
}

describe('WorkoutTodayHeader', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should render unscheduled state when no workout is scheduled', () => {
    render(<WorkoutTodayHeader {...baseProps} />)
    expect(screen.getByText('What are we training?')).toBeInTheDocument()
    expect(screen.getByText(/Generate Workout/)).toBeInTheDocument()
  })

  it('should render scheduled state when today has a workout', () => {
    const template = { name: 'Push Day', exercises: [{}, {}, {}], duration_minutes: 45 }
    render(
      <WorkoutTodayHeader
        {...baseProps}
        todayWorkout={{ template, scheduled_date: '2026-04-07', status: 'scheduled' } as any}
        onStartWorkout={vi.fn()}
      />
    )
    expect(screen.getByText('Push Day')).toBeInTheDocument()
    expect(screen.getByText(/3 exercises/)).toBeInTheDocument()
    expect(screen.getByText(/Start Workout/)).toBeInTheDocument()
  })

  it('should render completed state', () => {
    render(
      <WorkoutTodayHeader
        {...baseProps}
        todayCompleted={true}
        completedCount={1}
      />
    )
    expect(screen.getByText('Workout Complete!')).toBeInTheDocument()
  })

  it('should show progress ring with correct counts', () => {
    render(<WorkoutTodayHeader {...baseProps} weeklyWorkoutCount={2} weeklyGoal={3} />)
    expect(screen.getByText('2/3')).toBeInTheDocument()
  })

  it('should call onStartEmptyWorkout when Empty button is clicked', () => {
    render(<WorkoutTodayHeader {...baseProps} />)
    fireEvent.click(screen.getByText('Empty'))
    expect(baseProps.onStartEmptyWorkout).toHaveBeenCalled()
  })

  it('should show streak when present', () => {
    render(<WorkoutTodayHeader {...baseProps} />)
    expect(screen.getByText(/3 day streak/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Write WorkoutWeekStrip day-status logic tests**

Test the pure `getDayStatus` function. Since it's currently inline in the component, extract it or test through rendering:

```tsx
// __tests__/components/workouts/workout-week-strip.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkoutWeekStrip } from '@/components/workouts/WorkoutWeekStrip'

vi.mock('@/lib/hooks/use-workout-schedule', () => ({
  useThisWeekScheduledWorkouts: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}))

vi.mock('@/lib/utils', () => ({
  hapticFeedback: vi.fn(),
}))

describe('WorkoutWeekStrip', () => {
  it('should render 7 days of the week', () => {
    render(
      <WorkoutWeekStrip
        recentWorkouts={[]}
        onOpenCalendar={vi.fn()}
      />
    )
    expect(screen.getByText('This Week')).toBeInTheDocument()
    // should show all 7 day abbreviations
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    for (const day of days) {
      expect(screen.getByText(day)).toBeInTheDocument()
    }
  })

  it('should show Full Calendar link', () => {
    const onOpenCalendar = vi.fn()
    render(
      <WorkoutWeekStrip
        recentWorkouts={[]}
        onOpenCalendar={onOpenCalendar}
      />
    )
    expect(screen.getByText('Full Calendar')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Write WorkoutQuickStats display tests**

```tsx
// __tests__/components/workouts/workout-quick-stats.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkoutQuickStats } from '@/components/workouts/WorkoutQuickStats'
import type { Workout } from '@/lib/supabase'

const makeWorkout = (overrides: Partial<Workout>): Workout =>
  ({
    id: '1',
    completed_at: '2026-04-07T10:00:00Z',
    duration_minutes: 45,
    total_volume: 5000,
    ...overrides,
  } as Workout)

describe('WorkoutQuickStats', () => {
  it('should display workout count', () => {
    const workouts = [makeWorkout({}), makeWorkout({ id: '2' })]
    render(<WorkoutQuickStats weekWorkouts={workouts} prevWeekWorkouts={[]} />)
    expect(screen.getByText('Workouts')).toBeInTheDocument()
  })

  it('should display volume label', () => {
    render(<WorkoutQuickStats weekWorkouts={[makeWorkout({})]} prevWeekWorkouts={[]} />)
    expect(screen.getByText('Volume')).toBeInTheDocument()
  })

  it('should display trend label', () => {
    render(<WorkoutQuickStats weekWorkouts={[]} prevWeekWorkouts={[]} />)
    expect(screen.getByText('vs Last Wk')).toBeInTheDocument()
  })

  it('should handle empty workouts', () => {
    render(<WorkoutQuickStats weekWorkouts={[]} prevWeekWorkouts={[]} />)
    expect(screen.getByText('Workouts')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/components/workouts/workout-today-header.test.tsx __tests__/components/workouts/workout-week-strip.test.tsx __tests__/components/workouts/workout-quick-stats.test.tsx`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add __tests__/components/workouts/workout-today-header.test.tsx __tests__/components/workouts/workout-week-strip.test.tsx __tests__/components/workouts/workout-quick-stats.test.tsx
git commit -m "test(workouts): add tests for TodayHeader, WeekStrip, QuickStats

Cover three-state header rendering, week day display,
progress ring, empty button, and stats labels."
```

---

## Task 13: Run Full Test Suite and Fix Issues

**Files:**
- Potentially fix: any files with type errors or test failures

- [ ] **Step 1: Run TypeScript type checking**

Run: `npx tsc --noEmit`
Expected: No type errors. Fix any that appear.

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass. Fix any failures.

Common issues to watch for:
- Existing tests for `WorkoutsView` may need updated props (add `exercises` and `onStartEmptyWorkout`)
- Tests for `WorkoutTemplatesList` may need `exerciseMap` prop
- Tests for `WorkoutRecentActivity` may expect the old card structure
- The `workout-logger` tests may need to handle `null` template

- [ ] **Step 3: Run dev server and manual smoke test**

Run: `npm run dev`

Verify in browser:
- Workout tab loads without errors
- Today Header shows correct state (scheduled/unscheduled/completed)
- Week strip shows current week with correct day states
- Quick stats row shows 4 metrics
- Template cards show gradient icons and muscle group subtitles
- Muscle map shows tag cloud
- Recent PRs shows entries (or empty state)
- Recent activity is compact list format
- "+ Empty" button opens workout logger with no exercises
- "Generate Workout" opens AI generator sheet
- All animations play smoothly
- Dark mode works correctly

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(workouts): resolve type errors and test failures from redesign"
```
