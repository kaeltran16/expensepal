'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Plus, Minus, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { WorkoutTemplate } from '@/lib/supabase'
import { hapticFeedback } from '@/lib/utils'

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
  exercises: { id: string; name: string }[] // exercise details from exercises table
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
  const [restTimer, setRestTimer] = useState<number>(0)
  const [isResting, setIsResting] = useState(false)
  const [startTime] = useState(new Date())

  // initialize exercise logs from template
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

    // start rest timer if not last set
    if (newSet.set_number < currentExercise.target_sets) {
      setRestTimer(currentExercise.target_rest)
      setIsResting(true)
    }

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
            onClick={onCancel}
            className="ios-touch"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="text-center flex-1">
            <h2 className="font-semibold">{template.name}</h2>
            <p className="text-sm text-muted-foreground">
              Exercise {currentExerciseIndex + 1} of {exerciseLogs.length}
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

      {/* rest timer overlay */}
      <AnimatePresence>
        {isResting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-20 flex items-center justify-center"
          >
            <div className="text-center">
              <Timer className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
              <div className="text-6xl font-bold mb-2">{restTimer}s</div>
              <p className="text-lg text-muted-foreground mb-6">Rest Time</p>
              <Button
                variant="outline"
                onClick={() => {
                  setIsResting(false)
                  setRestTimer(0)
                }}
                className="min-h-touch"
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
        <div className="ios-card p-6 text-center">
          <h1 className="text-3xl font-bold mb-2">{currentExercise.exercise_name}</h1>
          <p className="text-muted-foreground">
            {currentExercise.target_sets} sets × {currentExercise.target_reps} reps
          </p>
        </div>

        {/* completed sets */}
        {currentExercise.sets.length > 0 && (
          <div className="space-y-2">
            <h3 className="ios-headline px-1">Completed Sets</h3>
            <div className="space-y-2">
              {currentExercise.sets.map((set) => (
                <div key={set.set_number} className="ios-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Set {set.set_number}</span>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>{set.weight}kg × {set.reps} reps</span>
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* add set form */}
        {currentExercise.sets.length < currentExercise.target_sets && (
          <SetInputForm
            setNumber={currentExercise.sets.length + 1}
            onAddSet={handleAddSet}
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
          <Button
            onClick={handleNextExercise}
            disabled={currentExerciseIndex === exerciseLogs.length - 1}
            className="flex-1 min-h-touch"
          >
            Next Exercise
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// set input form component
function SetInputForm({
  setNumber,
  onAddSet
}: {
  setNumber: number
  onAddSet: (reps: number, weight: number) => void
}) {
  const [reps, setReps] = useState(10)
  const [weight, setWeight] = useState(20)

  const handleSubmit = () => {
    onAddSet(reps, weight)
  }

  return (
    <div className="ios-card p-6 space-y-4">
      <h3 className="ios-headline text-center">Log Set {setNumber}</h3>

      {/* reps input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Reps</label>
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
        <label className="text-sm font-medium">Weight (kg)</label>
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

      <Button
        onClick={handleSubmit}
        className="w-full min-h-touch gap-2"
      >
        <Check className="h-4 w-4" />
        Complete Set
      </Button>
    </div>
  )
}
