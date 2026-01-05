'use client'

import {
  TemplateDetailSheet,
  TemplateFormDialog,
  WorkoutAnalyticsSheet,
  WorkoutHero,
  WorkoutRecentActivity,
  WorkoutStats,
  WorkoutTemplatesList
} from '@/components/workouts'
import { useTodayScheduledWorkout } from '@/lib/hooks/use-workout-schedule'
import type { Workout, WorkoutTemplate, WorkoutTemplateInsert, WorkoutTemplateUpdate } from '@/lib/supabase'
import { hapticFeedback } from '@/lib/utils'
import { isThisWeek, isToday } from 'date-fns'
import { useState } from 'react'

interface ExerciseLog {
  exercise_id: string
  sets: { completed: boolean }[]
  target_sets: number
}

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

      {/* Weekly Stats */}
      <WorkoutStats weekWorkouts={weekWorkouts} />

      {/* Templates List */}
      <WorkoutTemplatesList
        templates={templates}
        onTemplateClick={handleTemplateClick}
        onEditTemplate={handleEditTemplate}
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
