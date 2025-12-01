'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Dumbbell,
  Plus,
  Minus,
  Play,
  Pause,
  SkipForward
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { hapticFeedback } from '@/lib/utils'
import type { WorkoutTemplate } from '@/lib/supabase'

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
}

export function WorkoutLogger({
  template,
  exercises,
  onComplete,
  onCancel
}: WorkoutLoggerProps) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([])
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [startTime] = useState(new Date())
  const [showQuitDialog, setShowQuitDialog] = useState(false)

  // Initialize exercise logs from template
  useEffect(() => {
    const templateExercises = (template.exercises as any[]) || []
    const logs: ExerciseLog[] = templateExercises.map((te) => {
      const exercise = exercises.find((e) => e.id === te.exercise_id)
      return {
        exercise_id: te.exercise_id,
        exercise_name: exercise?.name || 'Unknown',
        sets: [],
        target_sets: te.sets || 3,
        target_reps: te.reps || '10',
        target_rest: te.rest || 60
      }
    })
    setExerciseLogs(logs)
  }, [template, exercises])

  const currentExercise = exerciseLogs[currentExerciseIndex]
  const progress = ((currentExerciseIndex + 1) / exerciseLogs.length) * 100
  const isLastExercise = currentExerciseIndex === exerciseLogs.length - 1

  const handleAddSet = (reps: number, weight: number) => {
    if (!currentExercise) return

    const newSet: Set = {
      set_number: currentExercise.sets.length + 1,
      reps,
      weight,
      completed: true,
      rest: currentExercise.target_rest
    }

    const updatedLogs = [...exerciseLogs]
    updatedLogs[currentExerciseIndex].sets.push(newSet)
    setExerciseLogs(updatedLogs)

    // Start rest timer
    setRestTimer(currentExercise.target_rest)
    hapticFeedback('medium')
  }

  const handleNextExercise = () => {
    if (currentExerciseIndex < exerciseLogs.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1)
      setRestTimer(null)
      hapticFeedback('light')
    }
  }

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(currentExerciseIndex - 1)
      setRestTimer(null)
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

  if (!currentExercise) return null

  const completedSets = currentExercise.sets.length
  const targetSets = currentExercise.target_sets

  return (
    <>
      {/* Full screen workout UI */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background z-50 flex flex-col"
      >
        {/* Header */}
        <div className="safe-top ios-card border-b border-border/50 px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowQuitDialog(true)
                hapticFeedback('light')
              }}
              aria-label="Cancel workout"
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="text-center flex-1">
              <h2 className="ios-headline truncate">{template.name}</h2>
              <p className="ios-caption text-muted-foreground">
                Exercise {currentExerciseIndex + 1} of {exerciseLogs.length}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleFinishWorkout}
              aria-label="Finish workout"
            >
              <Check className="h-5 w-5 text-green-500" />
            </Button>
          </div>

          {/* Progress bar */}
          <Progress value={progress} className="h-1" />
        </div>

        {/* Exercise Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Exercise Header */}
          <motion.div
            key={currentExerciseIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="ios-title2 mb-1">{currentExercise.exercise_name}</h3>
                <p className="ios-body text-muted-foreground">
                  Target: {currentExercise.target_sets} sets × {currentExercise.target_reps} reps
                </p>
              </div>
            </div>
          </motion.div>

          {/* Sets Tracking */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="ios-headline">Sets</h4>
              <Badge variant="secondary">
                {completedSets}/{targetSets} completed
              </Badge>
            </div>

            {/* Completed sets */}
            {currentExercise.sets.map((set) => (
              <CompletedSetRow
                key={set.set_number}
                setNumber={set.set_number}
                reps={set.reps}
                weight={set.weight}
              />
            ))}

            {/* Next set input */}
            {completedSets < targetSets && (
              <SetInputForm
                setNumber={completedSets + 1}
                targetReps={currentExercise.target_reps}
                onAddSet={handleAddSet}
              />
            )}

            {/* Add another set beyond target */}
            {completedSets >= targetSets && (
              <Button
                variant="outline"
                className="w-full min-h-touch ripple-effect gap-2"
                onClick={() => {
                  // Allow adding more sets
                  const newSet: Set = {
                    set_number: completedSets + 1,
                    reps: 10,
                    weight: 20,
                    completed: false,
                    rest: currentExercise.target_rest
                  }
                  const updatedLogs = [...exerciseLogs]
                  updatedLogs[currentExerciseIndex].target_sets += 1
                  setExerciseLogs(updatedLogs)
                  hapticFeedback('light')
                }}
              >
                <Plus className="h-4 w-4" />
                Add Another Set
              </Button>
            )}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="safe-bottom border-t border-border/50 p-4 glass">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handlePreviousExercise}
              disabled={currentExerciseIndex === 0}
              className="flex-1 min-h-touch ripple-effect gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              onClick={isLastExercise ? handleFinishWorkout : handleNextExercise}
              disabled={completedSets === 0}
              className="flex-1 min-h-touch ripple-effect gap-2"
            >
              {isLastExercise ? (
                <>
                  <Check className="h-4 w-4" />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Rest Timer Overlay */}
      <RestTimerOverlay
        seconds={restTimer}
        onComplete={() => {
          setRestTimer(null)
          hapticFeedback('light')
        }}
        onSkip={() => {
          setRestTimer(null)
          hapticFeedback('light')
        }}
      />

      {/* Quit Confirmation Dialog */}
      <QuitDialog
        isOpen={showQuitDialog}
        onConfirm={() => {
          onCancel()
          hapticFeedback('medium')
        }}
        onCancel={() => {
          setShowQuitDialog(false)
          hapticFeedback('light')
        }}
      />
    </>
  )
}

// Completed Set Row
function CompletedSetRow({
  setNumber,
  reps,
  weight
}: {
  setNumber: number
  reps: number
  weight: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="ios-card p-4 flex items-center gap-4 bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
    >
      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
      </div>
      <div className="flex-1">
        <span className="ios-subheadline">Set {setNumber}</span>
      </div>
      <div className="text-right">
        <div className="ios-headline">{reps} reps</div>
        <div className="ios-caption text-muted-foreground">@ {weight}kg</div>
      </div>
    </motion.div>
  )
}

// Set Input Form
function SetInputForm({
  setNumber,
  targetReps,
  onAddSet
}: {
  setNumber: number
  targetReps: string | number
  onAddSet: (reps: number, weight: number) => void
}) {
  const [reps, setReps] = useState(typeof targetReps === 'number' ? targetReps : 10)
  const [weight, setWeight] = useState(20)

  const handleIncrement = (field: 'reps' | 'weight') => {
    hapticFeedback('light')
    if (field === 'reps') {
      setReps(r => r + 1)
    } else {
      setWeight(w => w + 2.5)
    }
  }

  const handleDecrement = (field: 'reps' | 'weight') => {
    hapticFeedback('light')
    if (field === 'reps' && reps > 0) {
      setReps(r => r - 1)
    } else if (field === 'weight' && weight > 0) {
      setWeight(w => Math.max(0, w - 2.5))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="ios-card p-4 space-y-4 border-2 border-primary"
    >
      <div className="flex items-center justify-between">
        <span className="ios-headline">Set {setNumber}</span>
        <Badge variant="outline">Current</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Reps Input */}
        <div className="space-y-2">
          <label className="ios-caption text-muted-foreground">Reps</label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDecrement('reps')}
              className="h-10 w-10 shrink-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={reps}
              onChange={(e) => setReps(parseInt(e.target.value) || 0)}
              className="text-2xl font-bold text-center h-10"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleIncrement('reps')}
              className="h-10 w-10 shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Weight Input */}
        <div className="space-y-2">
          <label className="ios-caption text-muted-foreground">Weight (kg)</label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDecrement('weight')}
              className="h-10 w-10 shrink-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              step="2.5"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
              className="text-2xl font-bold text-center h-10"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleIncrement('weight')}
              className="h-10 w-10 shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Button
        onClick={() => onAddSet(reps, weight)}
        className="w-full min-h-touch ripple-effect gap-2"
        disabled={reps === 0}
      >
        <Check className="h-4 w-4" />
        Complete Set
      </Button>
    </motion.div>
  )
}

// Rest Timer Overlay
function RestTimerOverlay({
  seconds,
  onComplete,
  onSkip
}: {
  seconds: number | null
  onComplete: () => void
  onSkip: () => void
}) {
  const [remaining, setRemaining] = useState(seconds)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    setRemaining(seconds)
    setIsPaused(false)
  }, [seconds])

  useEffect(() => {
    if (remaining === null || remaining === 0 || isPaused) {
      if (remaining === 0) onComplete()
      return
    }

    const timer = setInterval(() => {
      setRemaining(r => (r !== null ? r - 1 : null))
    }, 1000)

    return () => clearInterval(timer)
  }, [remaining, isPaused, onComplete])

  if (seconds === null || remaining === null) return null

  const progress = seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 0

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          className="text-center"
        >
          {/* Circular Timer */}
          <div className="relative w-56 h-56 mb-8 mx-auto">
            <svg className="transform -rotate-90 w-56 h-56">
              <circle
                cx="112"
                cy="112"
                r="100"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted-foreground opacity-20"
              />
              <circle
                cx="112"
                cy="112"
                r="100"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 100}`}
                strokeDashoffset={`${2 * Math.PI * 100 * (1 - progress / 100)}`}
                className="text-primary transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-7xl font-bold text-white mb-2">{remaining}</span>
              <span className="ios-caption text-white/70">seconds</span>
            </div>
          </div>

          <h3 className="ios-title2 text-white mb-6">Rest Time</h3>

          <div className="flex gap-3 justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setIsPaused(!isPaused)
                hapticFeedback('light')
              }}
              className="gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {isPaused ? (
                <>
                  <Play className="h-4 w-4" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" />
                  Pause
                </>
              )}
            </Button>
            <Button
              onClick={onSkip}
              className="gap-2"
            >
              <SkipForward className="h-4 w-4" />
              Skip Rest
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={() => setRemaining(r => (r !== null ? r + 30 : 30))}
            className="mt-4 text-white/70 hover:text-white"
          >
            +30 seconds
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Quit Dialog
function QuitDialog({
  isOpen,
  onConfirm,
  onCancel
}: {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="ios-card p-6 max-w-sm w-full"
        >
          <h3 className="ios-title2 mb-2">Quit Workout?</h3>
          <p className="ios-body text-muted-foreground mb-6">
            Your progress will not be saved if you quit now.
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 min-h-touch ripple-effect"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              className="flex-1 min-h-touch ripple-effect"
            >
              Quit
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
