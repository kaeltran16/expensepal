'use client'

import { Button } from '@/components/ui/button'
import type { WorkoutTemplate } from '@/lib/supabase'
import { hapticFeedback } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Timer, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ExerciseSetTracker, type Set } from './workouts/exercise-set-tracker'
import { PersonalRecordBadge } from './workouts/personal-record-badge'
import { RestTimer } from './workouts/rest-timer'
import { WorkoutProgress } from './workouts/workout-progress'
import { WorkoutSummary, type ExerciseLog } from './workouts/workout-summary'

interface TemplateExercise {
  exercise_id: string
  sets: number
  reps: string
  rest?: number
}

interface WorkoutData {
  template_id: string
  exercises_completed: ExerciseLog[]
  duration_minutes: number
  total_volume: number
  personal_records?: Array<{ type: string; value: number; unit: string }>
}

interface PersonalRecord {
  type: string
  value: number
  unit: string
}

interface WorkoutLoggerProps {
  template: WorkoutTemplate
  exercises: { id: string; name: string }[]
  onComplete: (workoutData: WorkoutData) => Promise<void>
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
  const [detectedPRs, setDetectedPRs] = useState<PersonalRecord[]>([])
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [editingSetNumber, setEditingSetNumber] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [durationMinutes, setDurationMinutes] = useState(0)

  // Initialize exercise logs from template
  useEffect(() => {
    const templateExercises = (template.exercises as unknown as TemplateExercise[]) || []
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
  }, [template, exercises, onExerciseLogsChange])

  const currentExercise = exerciseLogs[currentExerciseIndex]
  const nextExercise = exerciseLogs[currentExerciseIndex + 1]

  const handleAddSet = (reps: number, weight: number) => {
    if (!currentExercise) return

    const setNumber = editingSetNumber || currentExercise.sets.length + 1

    const updatedLogs = [...exerciseLogs]

    if (editingSetNumber) {
      // Update existing set
      const setIndex = updatedLogs[currentExerciseIndex]!.sets.findIndex(s => s.set_number === editingSetNumber)
      if (setIndex >= 0) {
        updatedLogs[currentExerciseIndex]!.sets[setIndex] = {
          ...updatedLogs[currentExerciseIndex]!.sets[setIndex]!,
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
      updatedLogs[currentExerciseIndex]!.sets.push(newSet)

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
    updatedLogs[currentExerciseIndex]!.sets = updatedLogs[currentExerciseIndex]!.sets
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
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const endTime = new Date()
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000)
      setDurationMinutes(duration)

      // Calculate total volume
      const totalVolume = exerciseLogs.reduce((total, log) => {
        const exerciseVolume = log.sets.reduce((sum, set) => {
          return sum + (set.reps * (set.weight || 0))
        }, 0)
        return total + exerciseVolume
      }, 0)

      const workoutData: WorkoutData = {
        template_id: template.id,
        exercises_completed: exerciseLogs,
        duration_minutes: duration,
        total_volume: totalVolume
      }

      await onComplete(workoutData)
      setShowSummary(true)
      hapticFeedback('heavy')
    } catch (error) {
      console.error('Failed to finish workout:', error)
      setIsSubmitting(false)
    }
  }

  const handleSkipRest = () => {
    setIsResting(false)
    setRestTimer(0)
  }


  if (!currentExercise) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background z-50 overflow-auto"
    >
      {/* Header with Progress */}
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
            aria-label="Close workout"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <WorkoutProgress
              currentExerciseIndex={currentExerciseIndex}
              totalExercises={exerciseLogs.length}
              templateName={template.name}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFinishWorkout}
            disabled={isSubmitting}
            className="ios-touch text-green-600 disabled:opacity-50"
            aria-label="Finish workout"
          >
            <Check className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Personal Record Celebration */}
      <PersonalRecordBadge
        personalRecords={detectedPRs}
        onDismiss={() => setDetectedPRs([])}
      />

      {/* Cancel Workout Confirmation Dialog */}
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

      {/* Rest Timer */}
      <RestTimer
        isResting={isResting}
        restTimer={restTimer}
        setRestTimer={setRestTimer}
        onSkip={handleSkipRest}
        currentExerciseName={nextExercise?.exercise_name}
      />

      {/* Content */}
      <div className="p-4 pb-24 space-y-6 overflow-y-auto flex-1">
        {/* Exercise Info Card */}
        <div className={`ios-card p-6 text-center relative overflow-hidden ${
          currentExercise.sets.length >= currentExercise.target_sets
            ? 'ring-2 ring-green-500/50 bg-green-500/5'
            : ''
        }`}>
          {/* Completed badge with confetti animation */}
          {currentExercise.sets.length >= currentExercise.target_sets && (
            <>
              <motion.div
                initial={{ scale: 0, opacity: 0, rotate: -180 }}
                animate={{
                  scale: [0, 1.2, 1],
                  opacity: 1,
                  rotate: [- 180, 10, 0]
                }}
                transition={{
                  type: 'spring',
                  bounce: 0.6,
                  duration: 0.8
                }}
                className="absolute top-3 right-3 flex items-center gap-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white px-2.5 py-1 rounded-full text-xs font-semibold shadow-lg"
              >
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Check className="h-3.5 w-3.5" />
                </motion.div>
                Complete
              </motion.div>
              {/* Confetti particles */}
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, x: 0, y: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                    x: Math.cos((i / 8) * Math.PI * 2) * 80,
                    y: Math.sin((i / 8) * Math.PI * 2) * 80,
                    opacity: [0, 1, 0]
                  }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                  style={{
                    background: ['#10b981', '#22c55e', '#86efac', '#fbbf24'][i % 4]
                  }}
                />
              ))}
            </>
          )}
          <h1 className="text-3xl font-bold mb-2">{currentExercise.exercise_name}</h1>
          <p className="text-muted-foreground">
            {currentExercise.target_sets} sets × {currentExercise.target_reps} reps
          </p>
          {/* Completion message with bounce */}
          {currentExercise.sets.length >= currentExercise.target_sets && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1
              }}
              transition={{
                type: 'spring',
                bounce: 0.5,
                delay: 0.3
              }}
              className="mt-3"
            >
              <p className="text-green-600 font-bold text-base flex items-center justify-center gap-2">
                <span>🎉</span>
                All sets completed!
                <span>💪</span>
              </p>
            </motion.div>
          )}
        </div>

        {/* Exercise Set Tracker */}
        <ExerciseSetTracker
          exerciseId={currentExercise.exercise_id}
          exerciseName={currentExercise.exercise_name}
          completedSets={currentExercise.sets}
          targetSets={currentExercise.target_sets}
          targetReps={currentExercise.target_reps}
          targetRest={currentExercise.target_rest}
          onAddSet={handleAddSet}
          onDeleteSet={handleDeleteSet}
          onEditSet={(setNumber) => setEditingSetNumber(setNumber)}
          editingSetNumber={editingSetNumber}
          onCancelEdit={() => setEditingSetNumber(null)}
          onPRDetected={(prs) => setDetectedPRs(prs)}
        />
      </div>

      {/* navigation footer */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border/50 p-4"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
      >
        <div className="flex gap-3 max-w-screen-sm mx-auto">
          <motion.div
            className="flex-1"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              variant="outline"
              onClick={handlePreviousExercise}
              disabled={currentExerciseIndex === 0}
              className="w-full min-h-touch"
            >
              Previous
            </Button>
          </motion.div>
          {currentExerciseIndex === exerciseLogs.length - 1 ? (
            <motion.div
              className="flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleFinishWorkout}
                disabled={currentExercise.sets.length === 0 || isSubmitting}
                className="w-full min-h-touch bg-green-600 hover:bg-green-700 text-white gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Timer className="h-4 w-4" />
                    </motion.div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Finish Workout
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              className="flex-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={handleNextExercise}
                className="w-full min-h-touch"
              >
                Next Exercise
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Workout Summary */}
      <WorkoutSummary
        show={showSummary}
        templateName={template.name}
        exerciseLogs={exerciseLogs}
        durationMinutes={durationMinutes}
        personalRecords={detectedPRs}
        onClose={() => {
          setShowSummary(false)
          onCancel() // Close the workout logger after viewing summary
        }}
      />
    </motion.div>
  )
}
