'use client'

import {
  TemplateDetailSheet,
  TemplateFormDialog,
  WorkoutAnalyticsSheet,
  WorkoutCalendar,
  WorkoutHero,
  WorkoutRecentActivity,
  WorkoutScheduleSheet,
  WorkoutStats,
  WorkoutTemplatesList
} from '@/components/workouts'
import { useThisWeekScheduledWorkouts, useTodayScheduledWorkout } from '@/lib/hooks/use-workout-schedule'
import type { Workout, WorkoutTemplate, WorkoutTemplateInsert, WorkoutTemplateUpdate } from '@/lib/supabase'
import { hapticFeedback } from '@/lib/utils'
import { format, isThisWeek, isToday } from 'date-fns'
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
  exerciseLogs?: any[]
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
  onReturnToWorkout
}: WorkoutsViewProps) {
  // State
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null)
  const [showScheduleSheet, setShowScheduleSheet] = useState(false)
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<Date | null>(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [showAnalytics, setShowAnalytics] = useState(false)

  // Only show template sheet when explicitly selected, not automatically for active workouts
  // Active workouts should stay in the WorkoutLogger, not auto-open the template sheet
  const templateToShow = selectedTemplate
  const isWorkoutActive = !!activeWorkout

  // If user explicitly wants to edit an active workout's exercises, use fresh template data
  const templateToShowWithFreshData = templateToShow && activeWorkout && templateToShow.id === activeWorkout.id
    ? templates.find(t => t.id === activeWorkout.id) || templateToShow
    : templateToShow

  console.log('WorkoutsView - activeWorkout:', activeWorkout?.name, 'isWorkoutActive:', isWorkoutActive)

  // Hooks for scheduled workouts
  const { data: todayWorkout } = useTodayScheduledWorkout()
  const { data: weekScheduledWorkouts = [] } = useThisWeekScheduledWorkouts()

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

  // Get completed dates for calendar
  const completedDates = recentWorkouts
    .filter(w => w.completed_at)
    .map(w => format(new Date(w.completed_at!), 'yyyy-MM-dd'))

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

  // Handle calendar date click
  const handleDateClick = (date: Date) => {
    setSelectedScheduleDate(date)
    setShowScheduleSheet(true)
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
      />

      {/* Weekly Stats */}
      <WorkoutStats weekWorkouts={weekWorkouts} />

      {/* Calendar Week View */}
      <WorkoutCalendar
        scheduledWorkouts={weekScheduledWorkouts}
        completedDates={completedDates}
        onDateClick={handleDateClick}
        weekOffset={weekOffset}
        onWeekChange={setWeekOffset}
      />

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

      {/* Schedule Sheet */}
      <WorkoutScheduleSheet
        isOpen={showScheduleSheet}
        selectedDate={selectedScheduleDate}
        templates={templates}
        onClose={() => {
          setShowScheduleSheet(false)
          setSelectedScheduleDate(null)
        }}
        onSuccess={() => {
          // Refetch scheduled workouts happens automatically via TanStack Query
        }}
      />

      {/* Template Detail Sheet */}
      <TemplateDetailSheet
        template={templateToShowWithFreshData}
        onClose={() => {
          setSelectedTemplate(null)
          // Don't automatically navigate away - let user stay on workouts tab
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

      {/* Calendar skeleton */}
      <div className="ios-card p-4">
        <div className="h-5 w-32 bg-muted rounded mb-4 mx-auto animate-pulse" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
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
