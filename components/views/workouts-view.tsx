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
import { isThisWeek, isToday, subWeeks, startOfWeek, endOfWeek, format } from 'date-fns'
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

  const exerciseMap = useMemo(() => {
    const map = new Map<string, { name: string; muscle_groups: string[] }>()
    for (const ex of exercises) {
      map.set(ex.id, { name: ex.name, muscle_groups: ex.muscle_groups || [] })
    }
    return map
  }, [exercises])

  const templateNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of templates) {
      map.set(t.id, t.name)
    }
    return map
  }, [templates])

  const { thisWeekWorkouts, prevWeekWorkouts, todaysWorkouts } = useMemo(() => {
    const now = new Date()
    const prevWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
    const prevWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
    return {
      thisWeekWorkouts: recentWorkouts.filter(w =>
        w.completed_at && isThisWeek(new Date(w.completed_at), { weekStartsOn: 1 })
      ),
      prevWeekWorkouts: recentWorkouts.filter(w => {
        if (!w.completed_at) return false
        const d = new Date(w.completed_at)
        return d >= prevWeekStart && d <= prevWeekEnd
      }),
      todaysWorkouts: recentWorkouts.filter(w =>
        w.completed_at && isToday(new Date(w.completed_at))
      ),
    }
  }, [recentWorkouts])

  const todayCompleted = todaysWorkouts.length > 0 &&
    todayWorkout?.status === 'completed'

  const templateMap = useMemo(() => {
    const map = new Map<string, WorkoutTemplate>()
    for (const t of templates) map.set(t.id, t)
    return map
  }, [templates])

  const trainedMuscleGroups = useMemo(() => {
    const groups: string[] = []
    for (const w of thisWeekWorkouts) {
      const template = w.template_id ? templateMap.get(w.template_id) : undefined
      if (template) {
        const exs = (template.exercises as unknown as Array<{ exercise_id: string }>) || []
        for (const ex of exs) {
          const exData = exerciseMap.get(ex.exercise_id)
          if (exData) groups.push(...exData.muscle_groups)
        }
      }
    }
    return groups
  }, [thisWeekWorkouts, templateMap, exerciseMap])

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

      <WorkoutWeekStrip
        recentWorkouts={recentWorkouts}
        onOpenCalendar={() => {
          setShowCalendar(true)
          hapticFeedback('light')
        }}
      />

      <WorkoutQuickStats
        weekWorkouts={thisWeekWorkouts}
        prevWeekWorkouts={prevWeekWorkouts}
      />

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

      <div className="flex gap-3">
        <WorkoutMuscleMap trainedMuscleGroups={trainedMuscleGroups} />
        <WorkoutRecentPRs onViewAll={() => setShowAnalytics(true)} />
      </div>

      <WorkoutRecentActivity
        recentWorkouts={recentWorkouts}
        templateNameMap={templateNameMap}
        maxVisible={3}
        onViewAll={() => setShowAnalytics(true)}
      />

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
                    .map(w => format(new Date(w.completed_at!), 'yyyy-MM-dd'))}
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
      <div className="rounded-2xl bg-muted h-44 animate-pulse" />
      <div className="ios-card h-24 animate-pulse" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 ios-card h-16 animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-5 w-32 bg-muted rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="ios-card h-20 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
