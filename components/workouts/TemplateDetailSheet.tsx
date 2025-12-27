'use client'

import { ExerciseDetailSheet } from '@/components/exercise-detail-sheet'
import { ExercisePickerSheet } from '@/components/exercise-picker-sheet'
import { Button } from '@/components/ui/button'
import type { WorkoutTemplate } from '@/lib/supabase'
import { hapticFeedback } from '@/lib/utils'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Dumbbell,
  GripVertical,
  MoreHorizontal,
  Plus,
  Target
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface ExerciseLog {
  exercise_id: string
  sets: { completed: boolean }[]
  target_sets: number
}

interface TemplateDetailSheetProps {
  template: WorkoutTemplate | null
  onClose: () => void
  onStart: () => void
  onUpdateTemplate?: (id: string, updates: Partial<WorkoutTemplate>) => Promise<void>
  isWorkoutActive?: boolean
  exerciseLogs?: ExerciseLog[]
}

export function TemplateDetailSheet({
  template,
  onClose,
  onStart,
  onUpdateTemplate,
  isWorkoutActive = false,
  exerciseLogs = []
}: TemplateDetailSheetProps) {
  const instanceId = useState(() => Math.random().toString(36).substring(2, 11))[0]
  console.log(`[${instanceId}] TemplateDetailSheet - isWorkoutActive:`, isWorkoutActive, 'template:', template?.name)
  console.log(`[${instanceId}] TemplateDetailSheet - !isWorkoutActive:`, !isWorkoutActive, 'should render button:', !isWorkoutActive)

  const [exercises, setExercises] = useState<any[]>([])
  const [editingExercise, setEditingExercise] = useState<number | null>(null)
  const [duration, setDuration] = useState<'short' | 'normal' | 'long'>('normal')
  const [condition, setCondition] = useState<number>(100)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null)
  const [isReorderMode, setIsReorderMode] = useState(false)

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

  const saveExercises = async (updatedExercises: any[]) => {
    if (template && onUpdateTemplate) {
      try {
        await onUpdateTemplate(template.id, {
          exercises: updatedExercises as any
        })
      } catch (error) {
        console.error('Failed to save exercises:', error)
      }
    }
  }

  const handleSelectExercises = async (selectedExercises: any[]) => {
    const newExercises = selectedExercises.map((ex, idx) => ({
      _id: `ex-${Date.now()}-${exercises.length + idx}`,
      exercise_id: ex.id,
      name: ex.name,
      sets: 3,
      reps: '10-12',
      weight: 0,
      rest: 60,
      image_url: ex.image_url,
      gif_url: ex.gif_url,
    }))
    const updated = [...exercises, ...newExercises]
    setExercises(updated)
    await saveExercises(updated)
    hapticFeedback('medium')
  }

  const handleRemoveExercise = async (index: number) => {
    const updated = exercises.filter((_, i) => i !== index)
    setExercises(updated)
    await saveExercises(updated)
    if (editingExercise === index) {
      setEditingExercise(null)
    }
    hapticFeedback('light')
  }

  const handleUpdateExercise = async (index: number, field: string, value: any) => {
    const newExercises = [...exercises]
    newExercises[index] = { ...newExercises[index], [field]: value }
    setExercises(newExercises)
    await saveExercises(newExercises)
  }

  return (
    <AnimatePresence mode="wait">
      {template && (
        <>
          <motion.div
            key={`template-${template.id}-${isWorkoutActive ? 'active' : 'inactive'}`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 40, stiffness: 400, mass: 0.8 }}
            className="fixed inset-0 z-[70] bg-background flex flex-col !mt-0"
          >
            {/* Header */}
            <div className="safe-top border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="px-4 py-3 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    onClose()
                    hapticFeedback('light')
                  }}
                  className="h-10 w-10 shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-w-0 text-center">
                  <h2 className="ios-headline truncate">{template.name}</h2>
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
                  <Button 
                    variant={isReorderMode ? "default" : "outline"} 
                    size="sm" 
                    className="gap-1.5 h-8 text-xs"
                    onClick={() => {
                      setIsReorderMode(!isReorderMode)
                      hapticFeedback('light')
                    }}
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                    {isReorderMode ? 'Done' : 'Reorder'}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                    <Target className="h-3.5 w-3.5" />
                    Superset
                  </Button>
                </div>
              </div>
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto px-4 flex flex-col min-h-0">
              <div className="flex-1 flex flex-col py-4">
                {exercises.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center flex-1 flex flex-col items-center justify-center"
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
                    <p className="ios-caption text-muted-foreground">
                      Tap "Add Exercise" below to get started
                    </p>
                  </motion.div>
                ) : (
                  <>
                    <Reorder.Group
                      axis="y"
                      values={exercises}
                      onReorder={(newOrder) => {
                        setExercises(newOrder)
                        saveExercises(newOrder)
                      }}
                      className="space-y-3 mb-4"
                    >
                      {exercises.map((exercise: any, index: number) => {
                        // Find completion info for this exercise
                        const exerciseLog = exerciseLogs.find(log => log.exercise_id === exercise.exercise_id)
                        const completedSets = exerciseLog?.sets?.length || 0
                        const targetSets = exercise.sets || 3
                        const isComplete = completedSets >= targetSets
                        
                        return (
                          <ExerciseCardSimple
                            key={exercise._id}
                            exercise={exercise}
                            index={index}
                            isReorderMode={isReorderMode}
                            completedSets={completedSets}
                            targetSets={targetSets}
                            isComplete={isComplete}
                            onEdit={() => {
                              if (!isReorderMode) {
                                setSelectedExerciseIndex(index)
                                hapticFeedback('light')
                              }
                            }}
                          />
                        )
                      })}
                    </Reorder.Group>

                    {/* Workout Summary Card */}
                 
                  </>
                )}
              </div>

              {/* Add Exercise Button - Sticks to bottom of scrollable area */}
              <div className="pb-4 sticky bottom-0 bg-background">
                <Button
                  variant="outline"
                  onClick={handleAddExercise}
                  className="w-full min-h-touch ripple-effect gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Exercise
                </Button>
              </div>
            </div>

            {/* Get Started Button - Fixed at Bottom (hidden during active workout) */}
            {(() => {
              console.log(`[${instanceId}] Rendering button area - isWorkoutActive:`, isWorkoutActive, '!isWorkoutActive:', !isWorkoutActive)
              if (!isWorkoutActive) {
                console.log(`[${instanceId}] RENDERING START WORKOUT BUTTON`)
                return (
                  <div className="safe-bottom p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <Button
                      onClick={() => {
                        console.log(`[${instanceId}] Start Workout button clicked!`)
                        if (!isWorkoutActive) {
                          onStart()
                          hapticFeedback('medium')
                        } else {
                          console.log(`[${instanceId}] Prevented starting workout - already active!`)
                        }
                      }}
                      disabled={exercises.length === 0 || isWorkoutActive}
                      className="w-full min-h-touch ripple-effect gap-2 bg-primary text-primary-foreground shadow-lg rounded-2xl"
                      size="lg"
                    >
                      Start Workout
                    </Button>
                  </div>
                )
              } else {
                console.log(`[${instanceId}] HIDING START WORKOUT BUTTON (workout is active)`)
                return null
              }
            })()}
          </motion.div>

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
                setSelectedExerciseIndex(null)
              }
            }}
            onReplace={(newExercise) => {
              if (selectedExerciseIndex !== null) {
                setExercises(prev => prev.map((ex, idx) =>
                  idx === selectedExerciseIndex
                    ? {
                        ...ex,
                        _id: `ex-${Date.now()}`,
                        id: newExercise.id,
                        name: newExercise.name,
                        image_url: newExercise.image_url,
                        gif_url: newExercise.gif_url,
                      }
                    : ex
                ))
              }
            }}
          />
        </>
      )}
    </AnimatePresence>
  )
}

// Simple Exercise Card for display
function ExerciseCardSimple({
  exercise,
  index,
  isReorderMode = false,
  completedSets = 0,
  targetSets = 3,
  isComplete = false,
  onEdit
}: {
  exercise: any
  index: number
  isReorderMode?: boolean
  completedSets?: number
  targetSets?: number
  isComplete?: boolean
  onEdit: () => void
}) {
  const [isDragging, setIsDragging] = useState(false)

  return (
    <Reorder.Item
      value={exercise}
      dragListener={isReorderMode} // Only allow drag when in reorder mode
      onDragStart={() => {
        if (isReorderMode) {
          setIsDragging(true)
          hapticFeedback('medium')
        }
      }}
      onDragEnd={() => {
        setTimeout(() => setIsDragging(false), 100)
        hapticFeedback('medium')
      }}
      className={`relative ${isReorderMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
      style={{ touchAction: isReorderMode ? 'none' : 'auto' }}
      whileDrag={isReorderMode ? {
        scale: 1.02,
        zIndex: 50,
        boxShadow: '0 15px 35px -8px rgba(0, 0, 0, 0.25)',
      } : undefined}
      transition={{
        layout: {
          type: 'spring',
          damping: 22,
          stiffness: 450,
          mass: 0.9
        }
      }}
    >
      <div
        className={`ios-card p-5 flex items-center gap-4 relative ${
          isComplete ? 'ring-2 ring-green-500/50 bg-green-500/5' : ''
        }`}
        onClick={() => {
          if (!isDragging && !isReorderMode) {
            onEdit()
          }
        }}
      >
        {/* Completed badge */}
        {isComplete && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
            <Check className="h-3 w-3" />
            Done
          </div>
        )}
        
        {/* Progress indicator for incomplete */}
        {completedSets > 0 && !isComplete && (
          <div className="absolute top-2 right-2 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            {completedSets}/{targetSets} sets
          </div>
        )}

        {/* Exercise Image */}
        {(exercise.image_url || exercise.gif_url) && (
          <div className={`w-20 h-20 rounded-2xl bg-muted overflow-hidden shrink-0 shadow-sm ${
            isComplete ? 'ring-2 ring-green-500/30' : ''
          }`}>
            <img
              src={exercise.image_url || exercise.gif_url}
              alt={exercise.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Exercise Info */}
        <div className="flex-1 min-w-0">
          <h4 className={`text-base font-semibold mb-1.5 truncate ${isComplete ? 'text-green-600' : ''}`}>
            {exercise.name}
          </h4>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">{exercise.sets} sets</span>
            <span className="text-muted-foreground/40">×</span>
            <span className="font-medium">{exercise.reps} reps</span>
            {exercise.weight > 0 && (
              <>
                <span className="text-muted-foreground/40">@</span>
                <span className="font-medium text-primary">{exercise.weight}kg</span>
              </>
            )}
          </div>
        </div>

        {/* Drag Handle - only show in reorder mode */}
        {isReorderMode && (
          <GripVertical className="h-6 w-6 text-muted-foreground/40 shrink-0" />
        )}
      </div>
    </Reorder.Item>
  )
}

