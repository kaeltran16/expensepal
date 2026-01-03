'use client'

import { ExerciseDetailSheet } from '@/components/exercise-detail-sheet'
import { ExercisePickerSheet } from '@/components/exercise-picker-sheet'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { WorkoutTemplate } from '@/lib/supabase'
import { hapticFeedback } from '@/lib/utils'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Dumbbell,
  Edit3,
  FileText,
  GripVertical,
  History,
  MoreHorizontal,
  Plus,
  Share2,
  Star,
  Target,
  Trash2
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

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
  onDeleteTemplate?: (id: string) => void
  onDuplicateTemplate?: (template: WorkoutTemplate) => void
  onEditDetails?: (template: WorkoutTemplate) => void
  isWorkoutActive?: boolean
  exerciseLogs?: ExerciseLog[]
}

export function TemplateDetailSheet({
  template,
  onClose,
  onStart,
  onUpdateTemplate,
  onDeleteTemplate,
  onDuplicateTemplate,
  onEditDetails,
  isWorkoutActive = false,
  exerciseLogs = []
}: TemplateDetailSheetProps) {
  const instanceId = useState(() => Math.random().toString(36).substring(2, 11))[0]
  console.log(`[${instanceId}] TemplateDetailSheet - isWorkoutActive:`, isWorkoutActive, 'template:', template?.name)
  console.log(`[${instanceId}] TemplateDetailSheet - !isWorkoutActive:`, !isWorkoutActive, 'should render button:', !isWorkoutActive)

  interface TemplateExercise {
    _id?: string
    exercise_id: string
    name?: string
    sets: number
    reps: string
    weight?: number
    rest?: number
  }

  const [exercises, setExercises] = useState<TemplateExercise[]>([])
  const [editingExercise, setEditingExercise] = useState<number | null>(null)
  const [duration, setDuration] = useState<'short' | 'normal' | 'long'>('normal')
  const [condition, setCondition] = useState<number>(100)
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null)
  const [isReorderMode, setIsReorderMode] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (template) {
      // Add unique IDs to exercises if they don't have them
      const exercisesWithIds = ((template.exercises as unknown as TemplateExercise[]) || []).map((ex, idx) => ({
        ...ex,
        _id: ex._id || `ex-${Date.now()}-${idx}`,
        weight: ex.weight || 0,
      }))
      setExercises(exercisesWithIds)
    }
  }, [template])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

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

  const saveExercises = async (updatedExercises: TemplateExercise[]) => {
    if (template && onUpdateTemplate) {
      try {
        await onUpdateTemplate(template.id, {
          exercises: updatedExercises as unknown as WorkoutTemplate['exercises']
        })
      } catch (error) {
        console.error('Failed to save exercises:', error)
      }
    }
  }

  // Debounced save - waits 2 seconds after last change before saving
  const debouncedSave = (updatedExercises: TemplateExercise[]) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout to save after 2 seconds of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      saveExercises(updatedExercises).catch(err => console.error('Failed to save reorder:', err))
    }, 2000) as unknown as NodeJS.Timeout
  }

  const handleSelectExercises = async (selectedExercises: Array<{ id: string; name: string }>) => {
    const existingIds = new Set(exercises.map(ex => ex.exercise_id))

    // Filter out exercises that are already in the list
    const newExercises: TemplateExercise[] = selectedExercises
      .filter(ex => !existingIds.has(ex.id))
      .map((ex, idx) => ({
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
    // Don't await - save in background for instant UI feedback
    saveExercises(updated).catch(err => console.error('Failed to save:', err))
    hapticFeedback('medium')
  }

  const handleRemoveExercise = async (index: number) => {
    const updated = exercises.filter((_, i) => i !== index)
    setExercises(updated)
    // Don't await - save in background for instant UI feedback
    saveExercises(updated).catch(err => console.error('Failed to save:', err))
    if (editingExercise === index) {
      setEditingExercise(null)
    }
    hapticFeedback('light')
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
                  aria-label="Go back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="ios-headline truncate text-left">{template.name}</h2>
                    {template.is_default && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">
                        Default
                      </span>
                    )}
                  </div>
                  {isWorkoutActive && (
                    <p className="text-xs text-muted-foreground">Active workout</p>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      aria-label="More options"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[80] w-52">
                    {onEditDetails && (
                      <DropdownMenuItem
                        onClick={() => {
                          if (template) {
                            onEditDetails(template)
                            hapticFeedback('light')
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Details
                      </DropdownMenuItem>
                    )}
                    {onDuplicateTemplate && (
                      <DropdownMenuItem
                        onClick={() => {
                          if (template) {
                            onDuplicateTemplate(template)
                            hapticFeedback('light')
                          }
                        }}
                        className="cursor-pointer"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => {
                        // TODO: Add to favorites
                        hapticFeedback('light')
                      }}
                      className="cursor-pointer"
                    >
                      <Star className="h-4 w-4 mr-2" />
                      Add to Favorites
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => {
                        // TODO: Schedule workout
                        hapticFeedback('light')
                      }}
                      className="cursor-pointer"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Workout
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => {
                        // TODO: View history
                        hapticFeedback('light')
                      }}
                      className="cursor-pointer"
                    >
                      <History className="h-4 w-4 mr-2" />
                      View History
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => {
                        // TODO: Share template
                        hapticFeedback('light')
                      }}
                      className="cursor-pointer"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Template
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => {
                        // TODO: Export notes
                        hapticFeedback('light')
                      }}
                      className="cursor-pointer"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Export Notes
                    </DropdownMenuItem>

                    {onDeleteTemplate && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            if (template) {
                              onDeleteTemplate(template.id)
                              hapticFeedback('medium')
                            }
                          }}
                          className="cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/30 focus:text-red-700 dark:focus:text-red-300"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Template
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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
                    className={`gap-1.5 min-h-touch h-9 text-xs transition-all ${
                      isReorderMode ? 'bg-primary text-primary-foreground shadow-md' : ''
                    }`}
                    onClick={() => {
                      setIsReorderMode(!isReorderMode)
                      hapticFeedback('light')
                    }}
                  >
                    {isReorderMode ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Done Reordering
                      </>
                    ) : (
                      <>
                        <GripVertical className="h-3.5 w-3.5" />
                        Reorder
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 min-h-touch h-9 text-xs">
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
                        // Debounced save - waits 2 seconds after last drag before saving
                        debouncedSave(newOrder)
                      }}
                      className="space-y-3 mb-4"
                    >
                      {exercises.map((exercise, index: number) => {
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
                            onRemove={() => handleRemoveExercise(index)}
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
            onClose={() => {
              setSelectedExerciseIndex(null)
            }}
            onUpdate={(updates) => {
              if (selectedExerciseIndex !== null) {
                const newExercises = [...exercises]
                newExercises[selectedExerciseIndex] = {
                  ...newExercises[selectedExerciseIndex],
                  sets: updates.sets,
                  weight: updates.weight,
                  reps: updates.reps
                }
                setExercises(newExercises)
                // Save immediately after updating
                saveExercises(newExercises).catch(err => console.error('Failed to save:', err))
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
  onEdit,
  onRemove
}: {
  exercise: {
    _id?: string
    exercise_id: string
    name?: string
    sets: number
    reps: string
    weight?: number
    rest?: number
  }
  index: number
  isReorderMode?: boolean
  completedSets?: number
  targetSets?: number
  isComplete?: boolean
  onEdit: () => void
  onRemove: () => void
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

        {/* Delete Button - only show when NOT in reorder mode */}
        {!isReorderMode && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
              hapticFeedback('light')
            }}
            className="shrink-0 h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Reorder.Item>
  )
}

