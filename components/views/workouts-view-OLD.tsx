'use client'

import { ExerciseDetailSheet } from '@/components/exercise-detail-sheet'
import { ExercisePickerSheet } from '@/components/exercise-picker-sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Workout, WorkoutTemplate, WorkoutTemplateInsert, WorkoutTemplateUpdate } from '@/lib/supabase'
import { hapticFeedback } from '@/lib/utils'
import { format, isThisWeek, isToday } from 'date-fns'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import {
  Activity,
  ArrowLeft,
  Award,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Dumbbell,
  Edit,
  GripVertical,
  MoreHorizontal,
  Plus,
  Target,
  TrendingUp,
  X
} from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

interface WorkoutsViewProps {
  templates: WorkoutTemplate[]
  recentWorkouts: Workout[]
  loading: boolean
  onStartWorkout: (template: WorkoutTemplate) => void
  onCreateTemplate?: (template: Partial<WorkoutTemplateInsert>) => Promise<void>
  onUpdateTemplate?: (id: string, template: Partial<WorkoutTemplateUpdate>) => Promise<void>
}

export function WorkoutsView({
  templates,
  recentWorkouts,
  loading,
  onStartWorkout,
  onCreateTemplate,
  onUpdateTemplate
}: WorkoutsViewProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null)

  if (loading) {
    return <WorkoutSkeleton />
  }

  const todaysWorkouts = recentWorkouts.filter(w =>
    w.completed_at && isToday(new Date(w.completed_at))
  )
  const weekWorkouts = recentWorkouts.filter(w =>
    w.completed_at && isThisWeek(new Date(w.completed_at))
  )

  const totalTime = weekWorkouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0)
  const avgTime = weekWorkouts.length > 0 ? Math.round(totalTime / weekWorkouts.length) : 0

  return (
    <div className="space-y-6 pb-24">
      {/* Hero Section - Today's Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20"
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Dumbbell className="h-5 w-5 text-primary" />
            <span className="ios-subheadline text-primary">Your Fitness</span>
          </div>
          <h2 className="ios-title1 mb-2">
            {todaysWorkouts.length > 0 ? 'Great work today! 💪' : 'Ready to train?'}
          </h2>
          <p className="ios-body text-muted-foreground">
            {todaysWorkouts.length > 0
              ? `You've completed ${todaysWorkouts.length} workout${todaysWorkouts.length > 1 ? 's' : ''} today`
              : 'Choose a workout and let\'s get started'
            }
          </p>
        </div>

        {/* Decorative circle */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl" />
        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-primary/10 blur-xl" />
      </motion.div>

      {/* Weekly Stats */}
      {weekWorkouts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="ios-card p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="ios-headline">This Week</h3>
            <Badge variant="secondary" className="gap-1">
              <Activity className="h-3 w-3" />
              {weekWorkouts.length} workouts
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<Target className="h-4 w-4 text-blue-500" />}
              label="Workouts"
              value={weekWorkouts.length.toString()}
              bgColor="bg-blue-50 dark:bg-blue-950/30"
            />
            <StatCard
              icon={<Clock className="h-4 w-4 text-orange-500" />}
              label="Total Time"
              value={`${totalTime}m`}
              bgColor="bg-orange-50 dark:bg-orange-950/30"
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4 text-green-500" />}
              label="Avg Time"
              value={`${avgTime}m`}
              bgColor="bg-green-50 dark:bg-green-950/30"
            />
          </div>
        </motion.div>
      )}

      {/* Quick Start Templates */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="ios-headline">Quick Start</h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary gap-1"
            onClick={() => {
              setShowCreateDialog(true)
              hapticFeedback('light')
            }}
          >
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>

        {templates.length === 0 ? (
          <EmptyState onCreateClick={() => setShowCreateDialog(true)} />
        ) : (
          <div className="space-y-3">
            {templates.slice(0, 5).map((template, index) => (
              <TemplateCard
                key={template.id}
                template={template}
                index={index}
                onClick={() => {
                  setSelectedTemplate(template)
                  hapticFeedback('light')
                }}
                onEdit={() => {
                  setEditingTemplate(template)
                  hapticFeedback('light')
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Workouts History */}
      {recentWorkouts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 px-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="ios-headline">Recent Activity</h3>
          </div>

          <div className="space-y-2">
            {recentWorkouts.slice(0, 3).map((workout, index) => (
              <WorkoutHistoryCard
                key={workout.id}
                workout={workout}
                index={index}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Template Detail Bottom Sheet */}
      <TemplateDetailSheet
        template={selectedTemplate}
        onClose={() => {
          setSelectedTemplate(null)
          hapticFeedback('light')
        }}
        onStart={() => {
          if (selectedTemplate) {
            onStartWorkout(selectedTemplate)
            setSelectedTemplate(null)
            hapticFeedback('medium')
          }
        }}
      />

      {/* Create Template Dialog */}
      <TemplateFormDialog
        isOpen={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false)
          hapticFeedback('light')
        }}
        onSave={async (template) => {
          if (onCreateTemplate) {
            await onCreateTemplate(template)
            setShowCreateDialog(false)
            hapticFeedback('medium')
          }
        }}
        title="Create Workout Template"
      />

      {/* Edit Template Dialog */}
      <TemplateFormDialog
        isOpen={!!editingTemplate}
        template={editingTemplate || undefined}
        onClose={() => {
          setEditingTemplate(null)
          hapticFeedback('light')
        }}
        onSave={async (template) => {
          if (onUpdateTemplate && editingTemplate) {
            await onUpdateTemplate(editingTemplate.id, template)
            setEditingTemplate(null)
            hapticFeedback('medium')
          }
        }}
        title="Edit Workout Template"
      />
    </div>
  )
}

// Template Card Component
function TemplateCard({
  template,
  index,
  onClick,
  onEdit
}: {
  template: WorkoutTemplate
  index: number
  onClick: () => void
  onEdit?: () => void
}) {
  const exercises = (template.exercises as any[]) || []

  const difficultyConfig = {
    beginner: {
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      border: 'border-l-green-500'
    },
    intermediate: {
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      border: 'border-l-blue-500'
    },
    advanced: {
      color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      border: 'border-l-red-500'
    }
  }

  const config = difficultyConfig[template.difficulty as keyof typeof difficultyConfig] || difficultyConfig.beginner

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`w-full ios-card p-4 border-l-4 ${config.border} group`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <button
          onClick={onClick}
          className="flex-1 min-w-0 text-left"
        >
          <h4 className="ios-headline mb-1 truncate">{template.name}</h4>
          <p className="ios-caption text-muted-foreground line-clamp-1">
            {template.description}
          </p>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`${config.color} border-0`}>
            {template.difficulty}
          </Badge>
          {onEdit && !template.is_default && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Edit template"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <button
        onClick={onClick}
        className="w-full flex items-center gap-4 text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>{template.duration_minutes}min</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Dumbbell className="h-3.5 w-3.5" />
          <span>{exercises.length} exercises</span>
        </div>
        <div className="ml-auto">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>
    </motion.div>
  )
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  bgColor
}: {
  icon: React.ReactNode
  label: string
  value: string
  bgColor: string
}) {
  return (
    <div className={`${bgColor} rounded-2xl p-3 text-center`}>
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-xl font-bold mb-0.5">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

// Workout History Card
function WorkoutHistoryCard({
  workout,
  index
}: {
  workout: Workout
  index: number
}) {
  const completedDate = workout.completed_at ? new Date(workout.completed_at) : null

  // Get workout name from template_id or use a default
  const workoutName = workout.notes || 'Workout'

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="ios-card p-3 flex items-center gap-3"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Award className="h-6 w-6 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="ios-subheadline mb-0.5 truncate">{workoutName}</h4>
        <p className="ios-caption text-muted-foreground">
          {completedDate ? format(completedDate, 'MMM d, h:mm a') : 'Unknown date'}
          {workout.duration_minutes && ` • ${workout.duration_minutes}min`}
        </p>
      </div>

      {workout.status === 'completed' && (
        <Badge variant="secondary" className="shrink-0 text-xs">
          Completed
        </Badge>
      )}
    </motion.div>
  )
}

// Helper function to get ExerciseDB image URL
function getExerciseImageUrl(exerciseName?: string | null, gifUrl?: string | null): string {
  // If we have a gif_url from database, use it
  if (gifUrl) return gifUrl
  
  // If no name, return empty (will show fallback icon)
  if (!exerciseName) return ''
  
  // Fallback to ExerciseDB API - format the name for URL
  const formattedName = exerciseName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '%20')
  
  // ExerciseDB uses this format for their CDN
  return `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${formattedName}/0.jpg`
}

// Template Detail Full Screen (mobile-optimized with images like screenshot)
function TemplateDetailSheet({
  template,
  onClose,
  onStart
}: {
  template: WorkoutTemplate | null
  onClose: () => void
  onStart: () => void
}) {
  const [exercises, setExercises] = useState<any[]>([])
  const [editingExercise, setEditingExercise] = useState<number | null>(null)
  const [duration] = useState<'short' | 'normal' | 'long'>('normal')
  const [condition] = useState<number>(100)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null)

  useEffect(() => {
    if (template) {
      // Add unique IDs to exercises if they don't have them
      const exercisesWithIds = ((template.exercises as any[]) || []).map((ex, idx) => ({
        ...ex,
        _id: ex._id || `ex-${Date.now()}-${idx}`,
        weight: ex.weight || 0,
      }))
      setExercises(exercisesWithIds)
    }
  }, [template])

  if (!template) return null

  const totalTime = exercises.reduce((sum, ex) => {
    const restTime = (ex.rest || 60) * (ex.sets || 3)
    const workTime = 45 * (ex.sets || 3) // Assume 45s per set
    return sum + restTime + workTime
  }, 0)

  const handleAddExercise = () => {
    setShowExercisePicker(true)
    hapticFeedback('light')
  }

  const handleSelectExercises = (selectedExercises: any[]) => {
    const newExercises = selectedExercises.map((ex, idx) => ({
      _id: `ex-${Date.now()}-${exercises.length + idx}`,
      name: ex.name,
      sets: 3,
      reps: '10-12',
      weight: 0,
      rest: 60,
      image_url: ex.image_url,
      gif_url: ex.gif_url,
    }))
    setExercises([...exercises, ...newExercises])
    hapticFeedback('medium')
  }

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index))
    if (editingExercise === index) {
      setEditingExercise(null)
    }
    hapticFeedback('light')
  }

  const handleUpdateExercise = (index: number, field: string, value: any) => {
    const newExercises = [...exercises]
    newExercises[index] = { ...newExercises[index], [field]: value }
    setExercises(newExercises)
  }

  return (
    <AnimatePresence>
      {template && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 40, stiffness: 400, mass: 0.8 }}
          className="fixed inset-0 z-[70] bg-background flex flex-col"
        >
          {/* Header */}
          <div className="safe-top border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="px-4 py-3 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10 shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 min-w-0 text-center">
                <h2 className="ios-headline truncate">Today's Workout</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </div>

            {/* Duration & Condition Selectors */}
            <div className="px-4 pb-3 flex gap-3">
              <div className="flex-1 bg-muted/50 rounded-xl p-3">
                <div className="text-xs text-muted-foreground mb-1">Duration</div>
                <button className="flex items-center justify-between w-full">
                  <span className="font-medium capitalize">{duration}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 bg-muted/50 rounded-xl p-3">
                <div className="text-xs text-muted-foreground mb-1">Condition</div>
                <button className="flex items-center justify-between w-full">
                  <span className="font-medium">{condition}%</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="px-4 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Total of {exercises.length}</span>
                <span className="text-muted-foreground/50">|</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  <span>{Math.round(totalTime / 60)}min</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                  <GripVertical className="h-3.5 w-3.5" />
                  Reorder
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                  <Target className="h-3.5 w-3.5" />
                  Superset
                </Button>
              </div>
            </div>
          </div>

          {/* Exercise List */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {exercises.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center"
                >
                  <Dumbbell className="h-10 w-10 text-primary" />
                </motion.div>
                <h3 className="ios-headline mb-2">No exercises yet</h3>
                <p className="ios-caption text-muted-foreground mb-6">
                  Tap "Add Exercise" below to get started
                </p>
              </motion.div>
            ) : (
              <Reorder.Group
                axis="y"
                values={exercises}
                onReorder={setExercises}
                className="space-y-3 pb-4"
              >
                {exercises.map((exercise: any, index: number) => (
                  <ExerciseCardWithImage
                    key={exercise._id}
                    exercise={exercise}
                    index={index}
                    isEditing={editingExercise === index}
                    onEdit={() => {
                      setSelectedExerciseIndex(index)
                      hapticFeedback('light')
                    }}
                    onClose={() => setEditingExercise(null)}
                    onUpdate={(field, value) => handleUpdateExercise(index, field, value)}
                    onRemove={() => handleRemoveExercise(index)}
                    onDragStart={() => setEditingExercise(null)}
                  />
                ))}
              </Reorder.Group>
            )}

            {/* Add Exercise Button */}
            <Button
              variant="outline"
              onClick={handleAddExercise}
              className="w-full min-h-touch ripple-effect gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Exercise
            </Button>
          </div>

          {/* Get Started Button - Fixed at Bottom */}
          <div className="safe-bottom p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <Button
              onClick={onStart}
              disabled={exercises.length === 0}
              className="w-full min-h-touch ripple-effect gap-2 bg-primary text-primary-foreground shadow-lg rounded-2xl"
              size="lg"
            >
              Get Started
            </Button>
          </div>
        </motion.div>
      )}

      {/* Exercise Picker Sheet */}
      <ExercisePickerSheet
        isOpen={showExercisePicker}
        onClose={() => setShowExercisePicker(false)}
        onSelectExercises={handleSelectExercises}
      />

      {/* Exercise Detail Sheet */}
      <ExerciseDetailSheet
        isOpen={selectedExerciseIndex !== null}
        exerciseIndex={selectedExerciseIndex}
        exercise={selectedExerciseIndex !== null ? exercises[selectedExerciseIndex] : null}
        onClose={() => setSelectedExerciseIndex(null)}
        onUpdate={(updates) => {
          if (selectedExerciseIndex !== null) {
            handleUpdateExercise(selectedExerciseIndex, 'sets', updates.sets)
            handleUpdateExercise(selectedExerciseIndex, 'weight', updates.weight)
            handleUpdateExercise(selectedExerciseIndex, 'reps', updates.reps)
          }
        }}
        onDelete={() => {
          if (selectedExerciseIndex !== null) {
            handleRemoveExercise(selectedExerciseIndex)
          }
        }}
        onReplace={(newExercise) => {
          if (selectedExerciseIndex !== null) {
            // Replace the exercise at the current index with the new one
            setExercises(prev => prev.map((ex, idx) => 
              idx === selectedExerciseIndex 
                ? {
                    ...ex,
                    _id: `ex-${Date.now()}`,
                    name: newExercise.name,
                    image_url: newExercise.image_url,
                    gif_url: newExercise.gif_url,
                  }
                : ex
            ))
          }
        }}
      />
    </AnimatePresence>
  )
}

// Exercise Card Component with Image (matching screenshot style)
function ExerciseCardWithImage({
  exercise,
  index,
  isEditing,
  onEdit,
  onClose,
  onUpdate,
  onRemove,
  onDragStart
}: {
  exercise: any
  index: number
  isEditing: boolean
  onEdit: () => void
  onClose: () => void
  onUpdate: (field: string, value: any) => void
  onRemove: () => void
  onDragStart: () => void
}) {
  const [isDraggingLocal, setIsDraggingLocal] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Editing mode
  if (isEditing) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95, x: -20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.95, x: -20 }}
        transition={{ 
          type: 'spring', 
          damping: 20, 
          stiffness: 350,
          mass: 0.8
        }}
        className="bg-primary/5 rounded-2xl p-4 space-y-3 border-2 border-primary/20 shadow-lg"
      >
        {/* Name Input */}
        <div>
          <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Exercise Name</Label>
          <Input
            value={exercise.name}
            onChange={(e) => onUpdate('name', e.target.value)}
            placeholder="Exercise name"
            className="h-11 text-base"
            autoFocus
          />
        </div>

        {/* Sets, Reps, Weight, Rest */}
        <div className="grid grid-cols-4 gap-2">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Sets</Label>
            <Input
              type="number"
              value={exercise.sets}
              onChange={(e) => onUpdate('sets', parseInt(e.target.value))}
              className="h-11 text-center text-base"
              min="1"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Weight</Label>
            <Input
              type="number"
              value={exercise.weight || 0}
              onChange={(e) => onUpdate('weight', parseInt(e.target.value))}
              placeholder="kg"
              className="h-11 text-center text-base"
              min="0"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Reps</Label>
            <Input
              value={exercise.reps}
              onChange={(e) => onUpdate('reps', e.target.value)}
              placeholder="10-12"
              className="h-11 text-center text-base"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Rest (s)</Label>
            <Input
              type="number"
              value={exercise.rest || 60}
              onChange={(e) => onUpdate('rest', parseInt(e.target.value))}
              className="h-11 text-center text-base"
              min="0"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={onRemove}
            className="flex-1 min-h-touch"
          >
            Remove
          </Button>
          <Button
            size="sm"
            onClick={onClose}
            className="flex-1 min-h-touch bg-primary"
          >
            Done
          </Button>
        </div>
      </motion.div>
    )
  }

  // Normal card with exercise image (like screenshot)
  return (
    <Reorder.Item
      value={exercise}
      onDragStart={() => {
        setIsDraggingLocal(true)
        onDragStart()
        hapticFeedback('medium')
      }}
      onDragEnd={() => {
        setTimeout(() => setIsDraggingLocal(false), 100)
        hapticFeedback('medium')
      }}
      whileDrag={{
        scale: 1.02,
        zIndex: 50,
        boxShadow: '0 15px 35px -8px rgba(0, 0, 0, 0.25)',
      }}
      transition={{
        layout: {
          type: 'spring',
          damping: 22,
          stiffness: 450,
          mass: 0.9
        }
      }}
      className="relative cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'none' }}
    >
      <div className="ios-card p-3 flex items-center gap-4">
        {/* Exercise Image */}
        <div className="w-16 h-16 rounded-xl bg-muted/50 overflow-hidden shrink-0 relative">
          {!imageError ? (
            <Image
              src={exercise.gif_url || exercise.image_url || getExerciseImageUrl(exercise.name)}
              alt={exercise.name}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
              unoptimized // For external URLs
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Dumbbell className="h-8 w-8 text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Exercise Info */}
        <button
          onClick={() => {
            if (!isDraggingLocal) {
              onEdit()
            }
          }}
          className="flex-1 min-w-0 text-left"
        >
          <h4 className="font-semibold text-base mb-1 truncate">
            {exercise.name || 'Exercise'}
          </h4>
          <p className="text-sm text-muted-foreground">
            {exercise.sets}Sets{exercise.weight > 0 && ` X ${exercise.weight}kg`} X {exercise.reps}Reps
          </p>
        </button>

        {/* More Options */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          className="h-8 w-8 shrink-0"
        >
          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>
    </Reorder.Item>
  )
}

// Empty State
function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="ios-card p-12 text-center"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', bounce: 0.5 }}
        className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center"
      >
        <Dumbbell className="h-10 w-10 text-primary" />
      </motion.div>
      <h3 className="ios-headline mb-2">No Workouts Yet</h3>
      <p className="ios-caption text-muted-foreground mb-6 max-w-xs mx-auto">
        Start your fitness journey by creating your first workout template
      </p>
      <Button onClick={onCreateClick} className="ripple-effect gap-2">
        <Plus className="h-4 w-4" />
        Create Template
      </Button>
    </motion.div>
  )
}

// Loading Skeleton
function WorkoutSkeleton() {
  return (
    <div className="space-y-6 pb-24">
      {/* Hero skeleton */}
      <div className="rounded-3xl h-40 bg-muted/30 animate-pulse" />

      {/* Stats skeleton */}
      <div className="ios-card p-5">
        <div className="h-5 bg-muted rounded w-24 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted/50 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>

      {/* Template cards skeleton */}
      <div className="space-y-3">
        <div className="h-5 bg-muted rounded w-32 mb-3" />
        {[1, 2, 3].map(i => (
          <div key={i} className="ios-card p-4 border-l-4 border-muted animate-pulse">
            <div className="h-5 bg-muted rounded w-3/4 mb-2" />
            <div className="h-4 bg-muted rounded w-full mb-4" />
            <div className="flex gap-4">
              <div className="h-4 bg-muted rounded w-16" />
              <div className="h-4 bg-muted rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Template Form Dialog
function TemplateFormDialog({
  isOpen,
  template,
  onClose,
  onSave,
  title
}: {
  isOpen: boolean
  template?: WorkoutTemplate
  onClose: () => void
  onSave: (template: Partial<WorkoutTemplateInsert>) => Promise<void>
  title: string
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<string>('beginner')
  const [duration, setDuration] = useState('45')
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when template changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      if (template) {
        setName(template.name)
        setDescription(template.description || '')
        setDifficulty(template.difficulty || 'beginner')
        setDuration(template.duration_minutes?.toString() || '45')
      } else {
        // Reset for new template
        setName('')
        setDescription('')
        setDifficulty('beginner')
        setDuration('45')
      }
    }
  }, [isOpen, template])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      await onSave({
        name,
        description,
        difficulty,
        duration_minutes: parseInt(duration),
        exercises: template?.exercises || []
      })
    } catch (error) {
      console.error('Failed to save template:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md"
      />

      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pointer-events-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="bg-background w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[calc(100vh-80px)] sm:max-h-[85vh] flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold">{title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {template ? 'Update your workout template' : 'Create a new workout template'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-9 w-9"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-5">
                {/* Template Name */}
                <div className="space-y-2">
                  <Label htmlFor="template-name" className="text-sm font-medium">
                    Template Name
                  </Label>
                  <Input
                    id="template-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Push Day, Full Body"
                    className="text-lg h-12"
                    required
                    autoFocus
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe this workout..."
                    className="min-h-[80px] resize-none"
                    rows={3}
                  />
                </div>

                {/* Difficulty Pills */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Difficulty Level</Label>
                  <div className="flex gap-2">
                    {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          setDifficulty(level)
                          hapticFeedback('light')
                        }}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          difficulty === level
                            ? 'bg-primary text-primary-foreground shadow-lg'
                            : 'bg-secondary hover:bg-secondary/80'
                        }`}
                      >
                        <span className="capitalize">{level}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-sm font-medium">
                    Estimated Duration (minutes)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="45"
                    className="h-12"
                    min="5"
                    max="180"
                    required
                  />
                </div>

                {/* Info Note */}
                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground">
                    💡 After creating the template, you can add exercises and configure sets, reps, and rest times.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-6">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 min-h-touch"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 min-h-touch"
                  disabled={isSaving || !name.trim()}
                >
                  {isSaving ? 'Saving...' : template ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
