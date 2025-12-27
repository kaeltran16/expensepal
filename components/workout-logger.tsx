'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useExerciseHistory } from '@/lib/hooks'
import type { WorkoutTemplate } from '@/lib/supabase'
import { hapticFeedback } from '@/lib/utils'
import { detectPersonalRecords, getProgressiveOverloadSuggestion } from '@/lib/workout-helpers'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Minus, Plus, Timer, TrendingUp, X, Zap } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

interface Set {
  set_number: number
  reps: number
  weight: number
  completed: boolean
  rest: number
}

interface ExerciseLog {
  exercise_id: string
  exercise_name: string
  sets: Set[]
  target_sets: number
  target_reps: string
  target_rest: number
}

interface WorkoutLoggerProps {
  template: WorkoutTemplate
  exercises: { id: string; name: string }[]
  onComplete: (workoutData: any) => Promise<void>
  onCancel: () => void
  onEditExercises?: () => void
  onExerciseLogsChange?: (logs: ExerciseLog[]) => void
}

export function WorkoutLogger({
  template,
  exercises,
  onComplete,
  onCancel,
  onEditExercises,
  onExerciseLogsChange
}: WorkoutLoggerProps) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([])
  const [restTimer, setRestTimer] = useState<number>(0)
  const [isResting, setIsResting] = useState(false)
  const [startTime] = useState(new Date())
  const [detectedPRs, setDetectedPRs] = useState<any[]>([])
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [editingSetNumber, setEditingSetNumber] = useState<number | null>(null)

  // initialize exercise logs from template
  useEffect(() => {
    const templateExercises = (template.exercises as any[]) || []
    const logs: ExerciseLog[] = templateExercises.map((te) => {
      const exercise = exercises.find((e) => e.id === te.exercise_id)
      return {
        exercise_id: te.exercise_id,
        exercise_name: exercise?.name || 'unknown',
        sets: [],
        target_sets: te.sets || 3,
        target_reps: te.reps || '10',
        target_rest: te.rest || 60
      }
    })
    setExerciseLogs(logs)
    onExerciseLogsChange?.(logs)
  }, [template, exercises])

  // rest timer countdown
  useEffect(() => {
    if (isResting && restTimer > 0) {
      const interval = setInterval(() => {
        setRestTimer((prev) => {
          if (prev <= 1) {
            setIsResting(false)
            hapticFeedback('medium')
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isResting, restTimer])

  const currentExercise = exerciseLogs[currentExerciseIndex]

  const handleAddSet = (reps: number, weight: number) => {
    if (!currentExercise) return

    const setNumber = editingSetNumber || currentExercise.sets.length + 1

    const updatedLogs = [...exerciseLogs]

    if (editingSetNumber) {
      // Update existing set
      const setIndex = updatedLogs[currentExerciseIndex].sets.findIndex(s => s.set_number === editingSetNumber)
      if (setIndex >= 0) {
        updatedLogs[currentExerciseIndex].sets[setIndex] = {
          ...updatedLogs[currentExerciseIndex].sets[setIndex],
          reps,
          weight
        }
      }
      setEditingSetNumber(null)
    } else {
      // Add new set
      const newSet: Set = {
        set_number: setNumber,
        reps,
        weight,
        completed: true,
        rest: currentExercise.target_rest
      }
      updatedLogs[currentExerciseIndex].sets.push(newSet)

      // Check if this was the last set of the current exercise
      const completedAllSets = setNumber >= currentExercise.target_sets

      if (completedAllSets && currentExerciseIndex < exerciseLogs.length - 1) {
        // Auto-advance to next exercise after a short delay
        setTimeout(() => {
          handleNextExercise()
        }, 800)
        hapticFeedback('medium')
      } else if (!completedAllSets) {
        // Start rest timer if not last set
        setRestTimer(currentExercise.target_rest)
        setIsResting(true)
      }
    }

    setExerciseLogs(updatedLogs)
    onExerciseLogsChange?.(updatedLogs)
    hapticFeedback('light')
  }

  const handleDeleteSet = (setNumber: number) => {
    const updatedLogs = [...exerciseLogs]
    updatedLogs[currentExerciseIndex].sets = updatedLogs[currentExerciseIndex].sets
      .filter(s => s.set_number !== setNumber)
      .map((s, idx) => ({ ...s, set_number: idx + 1 })) // Renumber remaining sets
    setExerciseLogs(updatedLogs)
    onExerciseLogsChange?.(updatedLogs)
    setEditingSetNumber(null)
    hapticFeedback('light')
  }

  const handleNextExercise = () => {
    if (currentExerciseIndex < exerciseLogs.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1)
      setIsResting(false)
      setRestTimer(0)
      hapticFeedback('medium')
    }
  }

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1)
      setIsResting(false)
      setRestTimer(0)
      hapticFeedback('light')
    }
  }

  const handleFinishWorkout = async () => {
    const endTime = new Date()
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

    const workoutData = {
      template_id: template.id,
      started_at: startTime.toISOString(),
      completed_at: endTime.toISOString(),
      duration_minutes: durationMinutes,
      exerciseLogs
    }

    await onComplete(workoutData)
    hapticFeedback('heavy')
  }


  if (!currentExercise) {
    return null
  }

  const progress = ((currentExerciseIndex + 1) / exerciseLogs.length) * 100

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background z-50 overflow-auto"
    >
      {/* header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (onEditExercises) {
                onEditExercises()
                hapticFeedback('light')
              } else {
                setShowCancelConfirm(true)
              }
            }}
            className="ios-touch"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1">
            <h2 className="font-semibold">{template.name}</h2>
            <p className="text-sm text-muted-foreground">
              exercise {currentExerciseIndex + 1} of {exerciseLogs.length}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFinishWorkout}
            className="ios-touch text-green-600"
          >
            <Check className="h-5 w-5" />
          </Button>
        </div>

        {/* progress bar */}
        <div className="h-1 bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-primary"
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* pr celebration overlay */}
      <AnimatePresence>
        {detectedPRs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-30 flex items-center justify-center"
            onClick={() => setDetectedPRs([])}
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.6 }}
                className="text-8xl mb-4"
              >
                🏆
              </motion.div>
              <h2 className="ios-title1 mb-2">new personal record!</h2>
              {detectedPRs.map((pr, idx) => (
                <p key={idx} className="ios-body text-primary">
                  {pr.type}: {pr.value} {pr.unit}
                </p>
              ))}
              <Button
                onClick={() => setDetectedPRs([])}
                className="mt-6 min-h-touch"
              >
                awesome!
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* cancel workout confirmation dialog */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4"
            onClick={() => setShowCancelConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="ios-card p-6 max-w-sm w-full"
            >
              <h3 className="text-xl font-bold mb-2">End Workout?</h3>
              <p className="text-muted-foreground mb-6">
                Are you sure you want to cancel this workout? Your progress will not be saved.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 min-h-touch"
                >
                  Continue Workout
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowCancelConfirm(false)
                    onCancel()
                    hapticFeedback('medium')
                  }}
                  className="flex-1 min-h-touch"
                >
                  End Workout
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* rest timer overlay */}
      <AnimatePresence>
        {isResting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-20 flex items-center justify-center p-4"
          >
            <div className="text-center max-w-md w-full">
              <Timer className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
              <div className="text-7xl font-bold mb-2 tabular-nums">{restTimer}s</div>
              <p className="text-lg text-muted-foreground mb-8">Rest Time</p>

              {/* Quick time adjustment buttons */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setRestTimer(prev => Math.max(0, prev - 15))
                    hapticFeedback('light')
                  }}
                  className="h-14 text-base font-semibold"
                >
                  -15s
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setRestTimer(prev => prev + 30)
                    hapticFeedback('light')
                  }}
                  className="h-14 text-base font-semibold"
                >
                  +30s
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setRestTimer(prev => prev + 60)
                    hapticFeedback('light')
                  }}
                  className="h-14 text-base font-semibold"
                >
                  +1min
                </Button>
              </div>

              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setIsResting(false)
                  setRestTimer(0)
                  hapticFeedback('medium')
                }}
                className="w-full min-h-touch"
              >
                Skip Rest
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* content */}
      <div className="p-4 pb-32 space-y-6">
        {/* exercise info */}
        <div className={`ios-card p-6 text-center relative overflow-hidden ${
          currentExercise.sets.length >= currentExercise.target_sets 
            ? 'ring-2 ring-green-500/50 bg-green-500/5' 
            : ''
        }`}>
          {/* Completed badge */}
          {currentExercise.sets.length >= currentExercise.target_sets && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="absolute top-3 right-3 flex items-center gap-1.5 bg-green-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold"
            >
              <Check className="h-3.5 w-3.5" />
              Complete
            </motion.div>
          )}
          <h1 className="text-3xl font-bold mb-2">{currentExercise.exercise_name}</h1>
          <p className="text-muted-foreground">
            {currentExercise.target_sets} sets × {currentExercise.target_reps} reps
          </p>
          {/* Completion message */}
          {currentExercise.sets.length >= currentExercise.target_sets && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-green-600 font-medium mt-3 text-sm"
            >
              🎉 All sets completed! Move to next exercise.
            </motion.p>
          )}
        </div>

        {/* completed sets only - tap to edit */}
        {currentExercise.sets.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="ios-headline">Completed Sets</h3>
              <span className="text-sm text-muted-foreground">
                {currentExercise.sets.length} of {currentExercise.target_sets}
              </span>
            </div>
            <div className="space-y-2">
              {currentExercise.sets.map((set) => (
                <motion.div
                  key={set.set_number}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="ios-card p-4 cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => {
                    setEditingSetNumber(set.set_number)
                    hapticFeedback('light')
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Set {set.set_number}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">
                        {set.weight}kg × {set.reps} reps
                      </span>
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* add/edit set form with AI suggestions */}
        {(currentExercise.sets.length < currentExercise.target_sets || editingSetNumber) && (
          <EnhancedSetInputForm
            setNumber={editingSetNumber || currentExercise.sets.length + 1}
            exerciseId={currentExercise.exercise_id}
            lastSet={editingSetNumber
              ? currentExercise.sets.find(s => s.set_number === editingSetNumber)
              : currentExercise.sets[currentExercise.sets.length - 1]
            }
            targetReps={currentExercise.target_reps}
            onAddSet={handleAddSet}
            onPRDetected={(prs) => setDetectedPRs(prs)}
            isEditing={!!editingSetNumber}
            onCancelEdit={() => setEditingSetNumber(null)}
            onDelete={editingSetNumber ? () => handleDeleteSet(editingSetNumber) : undefined}
          />
        )}
      </div>

      {/* navigation footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border/50 p-4">
        <div className="flex gap-3 max-w-screen-sm mx-auto">
          <Button
            variant="outline"
            onClick={handlePreviousExercise}
            disabled={currentExerciseIndex === 0}
            className="flex-1 min-h-touch"
          >
            Previous
          </Button>
          {currentExerciseIndex === exerciseLogs.length - 1 ? (
            <Button
              onClick={handleFinishWorkout}
              disabled={currentExercise.sets.length === 0}
              className="flex-1 min-h-touch bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              <Check className="h-4 w-4" />
              Finish Workout
            </Button>
          ) : (
            <Button
              onClick={handleNextExercise}
              className="flex-1 min-h-touch"
            >
              Next Exercise
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// enhanced set input form with progressive overload suggestions
function EnhancedSetInputForm({
  setNumber,
  exerciseId,
  lastSet,
  targetReps,
  onAddSet,
  onPRDetected,
  isEditing = false,
  onCancelEdit,
  onDelete
}: {
  setNumber: number
  exerciseId: string
  lastSet?: Set
  targetReps: string
  onAddSet: (reps: number, weight: number) => void
  onPRDetected: (prs: any[]) => void
  isEditing?: boolean
  onCancelEdit?: () => void
  onDelete?: () => void
}) {
  // fetch exercise history for suggestions
  const { data: history = [] } = useExerciseHistory(exerciseId, 5)

  // parse target reps range
  const [targetMin, targetMax] = useMemo(() => {
    const match = targetReps.match(/(\d+)-(\d+)/)
    if (match) {
      return [parseInt(match[1]), parseInt(match[2])]
    }
    const single = parseInt(targetReps)
    return [single, single]
  }, [targetReps])

  // get progressive overload suggestion
  const suggestion = useMemo(() => {
    return getProgressiveOverloadSuggestion(history, targetMin, targetMax)
  }, [history, targetMin, targetMax])

  // initialize with suggested or last weight
  const [reps, setReps] = useState(targetMin || 10)
  const [weight, setWeight] = useState(() => {
    if (lastSet) return lastSet.weight
    if (suggestion.recommendedWeight) return suggestion.recommendedWeight
    if (history.length > 0 && history[0].sets.length > 0) {
      return Math.max(...history[0].sets.map((s: any) => s.weight || 0))
    }
    return 20
  })

  const handleSubmit = () => {
    onAddSet(reps, weight)

    // check for PRs if we have history with actual data to compare
    if (history.length > 0 && history[0].sets?.length > 0) {
      const previousBest = history[0]
      
      // Only check PRs if we have meaningful previous data
      if (previousBest.maxWeight > 0) {
        const currentSet = { set_number: setNumber, reps, weight, completed: true, rest: 60 }
        
        // Calculate max reps from a single set in previous history (not totalReps which is sum of all sets)
        const previousMaxReps = Math.max(...previousBest.sets.map((s: any) => s.reps || 0))
        
        const prs = detectPersonalRecords([currentSet], {
          max_weight: previousBest.maxWeight,
          max_reps: previousMaxReps, // Use max reps from single set, not total
          max_volume: previousBest.totalVolume,
          estimated_1rm: previousBest.estimated1RM,
        })

        if (prs.length > 0) {
          onPRDetected(prs)
          hapticFeedback('heavy')
        }
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* ai suggestion card */}
      {suggestion.type !== 'maintain' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="frosted-card p-4 border-l-4 border-l-primary"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              {suggestion.type === 'increase_weight' && <TrendingUp className="h-5 w-5 text-primary" />}
              {suggestion.type === 'increase_reps' && <Zap className="h-5 w-5 text-primary" />}
              {suggestion.type === 'decrease_weight' && <TrendingUp className="h-5 w-5 text-orange-500 rotate-180" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="ios-headline">ai coach</span>
                <Badge variant="outline" className="text-xs">
                  {suggestion.type.replace('_', ' ')}
                </Badge>
              </div>
              <p className="ios-caption text-muted-foreground">
                {suggestion.suggestion}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* previous performance */}
      {history.length > 0 && history[0].sets.length > 0 && (
        <div className="ios-card p-4">
          <div className="flex items-center justify-between">
            <span className="ios-caption text-muted-foreground">last workout</span>
            <div className="text-right">
              <p className="ios-headline">
                {Math.max(...history[0].sets.map((s: any) => s.weight || 0))}kg × {' '}
                {Math.max(...history[0].sets.map((s: any) => s.reps || 0))} reps
              </p>
              <p className="ios-caption text-muted-foreground">
                {history[0].totalSets} sets • {Math.round(history[0].totalVolume)}kg volume
              </p>
            </div>
          </div>
        </div>
      )}

      {/* set input */}
      <div className="ios-card p-6 space-y-4">
        <h3 className="ios-headline text-center">
          {isEditing ? `Edit Set ${setNumber}` : `Log Set ${setNumber}`}
        </h3>

        {/* reps input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">reps</label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setReps(Math.max(1, reps - 1))}
              className="h-12 w-12"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={reps}
              onChange={(e) => setReps(Number(e.target.value))}
              className="text-center text-2xl font-bold h-12"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setReps(reps + 1)}
              className="h-12 w-12"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* weight input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">weight (kg)</label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeight(Math.max(0, weight - 2.5))}
              className="h-12 w-12"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              step="2.5"
              className="text-center text-2xl font-bold h-12"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeight(weight + 2.5)}
              className="h-12 w-12"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          {isEditing && onCancelEdit && (
            <Button
              variant="outline"
              onClick={onCancelEdit}
              className="flex-1 min-h-touch"
            >
              Cancel
            </Button>
          )}
          {isEditing && onDelete && (
            <Button
              variant="destructive"
              onClick={onDelete}
              className="flex-1 min-h-touch"
            >
              Delete Set
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            className={`${isEditing ? 'flex-1' : 'w-full'} min-h-touch gap-2`}
          >
            <Check className="h-4 w-4" />
            {isEditing ? 'Update Set' : 'Complete Set'}
          </Button>
        </div>
      </div>
    </div>
  )
}
