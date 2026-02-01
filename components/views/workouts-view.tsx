'use client'

import { Button } from '@/components/ui/button'
import {
  TemplateDetailSheet,
  TemplateFormDialog,
  WorkoutAnalyticsSheet,
  WorkoutGeneratorSheet,
  WorkoutHero,
  WorkoutRecentActivity,
  WorkoutStats,
  WorkoutStreakBadge,
  WorkoutTemplatesList
} from '@/components/workouts'
import { useTodayScheduledWorkout } from '@/lib/hooks/use-workout-schedule'
import type { Workout, WorkoutTemplate, WorkoutTemplateInsert, WorkoutTemplateUpdate } from '@/lib/supabase'
import type { ExerciseLog } from '@/lib/types/common'
import { hapticFeedback } from '@/lib/utils'
import { isThisWeek, isToday } from 'date-fns'
import { Sparkles } from 'lucide-react'
import { useState } from 'react'

interface WorkoutsViewProps {
  templates: WorkoutTemplate[]
  recentWorkouts: Workout[]
  loading: boolean
  onStartWorkout: (template: WorkoutTemplate) => void
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
  loading,
  onStartWorkout,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  activeWorkout,
  exerciseLogs = [],
  editingWorkoutExercises = false,
  onReturnToWorkout
}: WorkoutsViewProps) {
  // State
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)

  // Show template sheet when explicitly selected OR when editing active workout exercises
  // If editing workout exercises, show the active workout template
  const templateToShow = editingWorkoutExercises && activeWorkout
    ? activeWorkout
    : selectedTemplate
  // isWorkoutActive should be true whenever there's an active workout (including when editing)
  const isWorkoutActive = !!activeWorkout

  // If user explicitly wants to edit an active workout's exercises, use fresh template data
  const templateToShowWithFreshData = templateToShow && activeWorkout && templateToShow.id === activeWorkout.id
    ? templates.find(t => t.id === activeWorkout.id) || templateToShow
    : templateToShow

  // Hooks for scheduled workouts
  const { data: todayWorkout } = useTodayScheduledWorkout()

  if (loading) {
    return <WorkoutSkeleton />
  }

  // Calculate stats
  const todaysWorkouts = recentWorkouts.filter(w =>
    w.completed_at && isToday(new Date(w.completed_at))
  )
  const weekWorkouts = recentWorkouts.filter(w =>
    w.completed_at && isThisWeek(new Date(w.completed_at))
  )

  // Check if today's workout is completed
  const todayCompleted = todaysWorkouts.length > 0 &&
    todayWorkout?.status === 'completed'

  // Handle quick start
  const handleQuickStart = () => {
    if (todayWorkout?.template) {
      onStartWorkout(todayWorkout.template)
      hapticFeedback('medium')
    }
  }

  // Handle template click
  const handleTemplateClick = (template: WorkoutTemplate) => {
    setSelectedTemplate(template)
    // TODO: Show template detail sheet
    hapticFeedback('light')
  }

  // Handle edit template
  const handleEditTemplate = (template: WorkoutTemplate) => {
    setEditingTemplate(template)
    // TODO: Show edit dialog
    hapticFeedback('light')
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Hero Section */}
      <WorkoutHero
        todayWorkout={todayWorkout}
        todayCompleted={todayCompleted}
        completedCount={todaysWorkouts.length}
        onQuickStart={todayWorkout?.template ? handleQuickStart : undefined}
        hasTemplates={templates.length > 0}
      />

      {/* AI Generator Button */}
      <Button
        onClick={() => {
          setShowGenerator(true)
          hapticFeedback('medium')
        }}
        variant="outline"
        className="w-full min-h-touch gap-2 bg-primary/10 border-primary/20 hover:border-primary/40"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        Generate AI Workout
      </Button>

      {/* Streak Badge */}
      <WorkoutStreakBadge />

      {/* Weekly Stats */}
      <WorkoutStats weekWorkouts={weekWorkouts} />

      {/* Templates List */}
      <WorkoutTemplatesList
        templates={templates}
        onTemplateClick={handleTemplateClick}
        onEditTemplate={handleEditTemplate}
        onDeleteTemplate={onDeleteTemplate ? (template) => onDeleteTemplate(template.id) : undefined}
        onCreateTemplate={() => setShowCreateDialog(true)}
        maxVisible={5}
      />

      {/* Recent Activity */}
      <WorkoutRecentActivity
        recentWorkouts={recentWorkouts}
        maxVisible={3}
      />

      {/* Template Detail Sheet */}
      <TemplateDetailSheet
        template={templateToShowWithFreshData}
        onClose={() => {
          if (editingWorkoutExercises && onReturnToWorkout) {
            // User was editing exercises during active workout - return to workout
            onReturnToWorkout()
          } else {
            // User was just viewing a template - close the sheet
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
          setSelectedTemplate(null) // Close the sheet after deletion
        } : undefined}
        isWorkoutActive={isWorkoutActive}
        exerciseLogs={exerciseLogs}
      />

      {/* Create Template Dialog */}
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

      {/* Edit Template Dialog */}
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

      {/* Analytics Sheet */}
      <WorkoutAnalyticsSheet
        isOpen={showAnalytics}
        workouts={recentWorkouts}
        onClose={() => setShowAnalytics(false)}
      />

      {/* AI Workout Generator */}
      <WorkoutGeneratorSheet
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
        onStartWorkout={(workout) => {
          // Convert generated workout to template format and start
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
                reps: ex.reps || 10, // Can be string like "8-12" or number
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

// Loading skeleton
function WorkoutSkeleton() {
  return (
    <div className="space-y-6 pb-24">
      {/* Hero skeleton */}
      <div className="h-40 bg-muted rounded-3xl animate-pulse" />

      {/* Stats skeleton */}
      <div className="ios-card p-5">
        <div className="h-5 w-24 bg-muted rounded mb-4 animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>

      {/* Templates skeleton */}
      <div className="space-y-3">
        <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
