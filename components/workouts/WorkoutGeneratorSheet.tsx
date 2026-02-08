'use client'

import { Button } from '@/components/ui/button'
import { hapticFeedback } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
    ArrowLeft,
    Check,
    Clock,
    Dumbbell,
    Loader2,
    Play,
    Save,
    Sparkles,
    X,
} from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'

interface GeneratedExercise {
  exercise_id: string
  name: string
  sets: number
  reps: string
  rest: number
  notes?: string
  image_url?: string | null
  gif_url?: string | null
}

interface GeneratedWorkout {
  name: string
  description: string
  exercises: GeneratedExercise[]
  estimated_duration: number
  warmup_notes: string
  difficulty: string
}

interface WorkoutGeneratorSheetProps {
  isOpen: boolean
  onClose: () => void
  onStartWorkout: (workout: GeneratedWorkout) => void
  onSaveAsTemplate: (workout: GeneratedWorkout) => Promise<void>
}

const MUSCLE_GROUPS = [
  { id: 'chest', label: 'Chest', icon: '💪' },
  { id: 'back', label: 'Back', icon: '🔙' },
  { id: 'shoulders', label: 'Shoulders', icon: '🎯' },
  { id: 'biceps', label: 'Biceps', icon: '💪' },
  { id: 'triceps', label: 'Triceps', icon: '💪' },
  { id: 'legs', label: 'Legs', icon: '🦵' },
  { id: 'glutes', label: 'Glutes', icon: '🍑' },
  { id: 'core', label: 'Core', icon: '🎯' },
]

const EQUIPMENT = [
  { id: 'barbell', label: 'Barbell' },
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'bench', label: 'Bench' },
  { id: 'cable', label: 'Cable Machine' },
  { id: 'machine', label: 'Machines' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'bodyweight', label: 'Bodyweight' },
  { id: 'resistance bands', label: 'Bands' },
  { id: 'pull-up bar', label: 'Pull-up Bar' },
]

const DURATIONS = [
  { value: 20, label: '20 min', description: 'Quick session' },
  { value: 30, label: '30 min', description: 'Short workout' },
  { value: 45, label: '45 min', description: 'Standard' },
  { value: 60, label: '60 min', description: 'Full session' },
]

export function WorkoutGeneratorSheet({
  isOpen,
  onClose,
  onStartWorkout,
  onSaveAsTemplate,
}: WorkoutGeneratorSheetProps) {
  const [step, setStep] = useState<'input' | 'generating' | 'result'>('input')
  const [duration, setDuration] = useState(45)
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['dumbbells', 'barbell', 'bench'])
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate')
  const [workoutType, setWorkoutType] = useState<'strength' | 'hypertrophy' | 'endurance'>('hypertrophy')
  const [generatedWorkout, setGeneratedWorkout] = useState<GeneratedWorkout | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const resetForm = () => {
    setStep('input')
    setSelectedMuscles([])
    setGeneratedWorkout(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const toggleMuscle = (muscleId: string) => {
    setSelectedMuscles(prev =>
      prev.includes(muscleId)
        ? prev.filter(m => m !== muscleId)
        : [...prev, muscleId]
    )
    hapticFeedback('light')
  }

  const toggleEquipment = (equipmentId: string) => {
    setSelectedEquipment(prev =>
      prev.includes(equipmentId)
        ? prev.filter(e => e !== equipmentId)
        : [...prev, equipmentId]
    )
    hapticFeedback('light')
  }

  const handleGenerate = async () => {
    if (selectedMuscles.length === 0) {
      toast.error('Please select at least one muscle group')
      return
    }

    setStep('generating')
    hapticFeedback('medium')

    try {
      const response = await fetch('/api/workouts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration,
          equipment: selectedEquipment,
          muscleGroups: selectedMuscles,
          difficulty,
          workoutType,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate workout')
      }

      const data = await response.json()
      setGeneratedWorkout(data.workout)
      setStep('result')
      hapticFeedback('heavy')
    } catch (error) {
      console.error('Error generating workout:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate workout')
      setStep('input')
    }
  }

  const handleSaveAsTemplate = async () => {
    if (!generatedWorkout) return

    setIsSaving(true)
    try {
      await onSaveAsTemplate(generatedWorkout)
      toast.success('Workout saved as template!')
      handleClose()
    } catch (error) {
      toast.error('Failed to save template')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartWorkout = () => {
    if (!generatedWorkout) return
    onStartWorkout(generatedWorkout)
    handleClose()
  }

  if (!isOpen) return null

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="workout-generator-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            key="workout-generator-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[100] bg-background flex flex-col !mt-0"
            onClick={e => e.stopPropagation()}
          >
        {/* Header */}
        <div className="safe-top border-b px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={step === 'result' ? () => setStep('input') : handleClose}
            className="h-10 w-10"
          >
            {step === 'result' ? <ArrowLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </Button>
          <div className="flex-1">
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Workout Generator
            </h2>
            <p className="text-xs text-muted-foreground">
              {step === 'input' && 'Tell us what you want to train'}
              {step === 'generating' && 'Creating your workout...'}
              {step === 'result' && 'Your generated workout'}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {step === 'input' && (
            <div className="px-4 py-4 space-y-5">
              {/* Target Muscles */}
              <div className="space-y-2">
                <label className="ios-subheadline">Target Muscles</label>
                <div className="grid grid-cols-4 gap-2">
                  {MUSCLE_GROUPS.map(muscle => (
                    <motion.button
                      key={muscle.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleMuscle(muscle.id)}
                      className={`py-2 px-1 rounded-xl text-center transition-all border-2 ${
                        selectedMuscles.includes(muscle.id)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-transparent bg-muted/50 active:bg-muted'
                      }`}
                    >
                      <div className="text-base">{muscle.icon}</div>
                      <div className="text-[11px] font-medium">{muscle.label}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <label className="ios-subheadline">Duration</label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATIONS.map(d => (
                    <motion.button
                      key={d.value}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setDuration(d.value)
                        hapticFeedback('light')
                      }}
                      className={`ios-card p-3 text-center border-2 transition-all ${
                        duration === d.value
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent'
                      }`}
                    >
                      <div className="ios-subheadline">{d.label}</div>
                      {duration === d.value && (
                        <motion.div
                          layoutId="duration-indicator"
                          className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1"
                        />
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Training Goal */}
              <div className="space-y-2">
                <label className="ios-subheadline">Training Goal</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'strength', label: 'Strength', desc: '3-6 reps', icon: '🏋️' },
                    { id: 'hypertrophy', label: 'Growth', desc: '8-12 reps', icon: '💪' },
                    { id: 'endurance', label: 'Endurance', desc: '15+ reps', icon: '🔥' },
                  ] as const).map(type => (
                    <motion.button
                      key={type.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setWorkoutType(type.id)
                        hapticFeedback('light')
                      }}
                      className={`ios-card p-3 text-center border-2 transition-all ${
                        workoutType === type.id
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent'
                      }`}
                    >
                      <div className="text-lg mb-1">{type.icon}</div>
                      <div className="ios-caption font-medium">{type.label}</div>
                      <div className="text-[10px] text-muted-foreground">{type.desc}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <label className="ios-subheadline">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'beginner', label: 'Beginner', bars: 1 },
                    { id: 'intermediate', label: 'Intermediate', bars: 2 },
                    { id: 'advanced', label: 'Advanced', bars: 3 },
                  ] as const).map(level => (
                    <motion.button
                      key={level.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setDifficulty(level.id)
                        hapticFeedback('light')
                      }}
                      className={`ios-card p-3 text-center border-2 transition-all ${
                        difficulty === level.id
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent'
                      }`}
                    >
                      <div className="flex justify-center gap-1 mb-2">
                        {[1, 2, 3].map(bar => (
                          <motion.div
                            key={bar}
                            initial={false}
                            animate={{
                              backgroundColor: bar <= level.bars
                                ? difficulty === level.id ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.4)'
                                : 'hsl(var(--muted-foreground) / 0.15)'
                            }}
                            className="w-2 rounded-full"
                            style={{ height: `${8 + bar * 4}px` }}
                          />
                        ))}
                      </div>
                      <div className="ios-caption">{level.label}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              <div className="space-y-2">
                <label className="ios-subheadline">Equipment</label>
                <div className="grid grid-cols-3 gap-2">
                  {EQUIPMENT.map(eq => (
                    <motion.button
                      key={eq.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleEquipment(eq.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-medium transition-all border-2 flex items-center justify-center gap-1 ${
                        selectedEquipment.includes(eq.id)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-transparent bg-muted/50 active:bg-muted'
                      }`}
                    >
                      {selectedEquipment.includes(eq.id) && (
                        <Check className="h-3 w-3 flex-shrink-0" />
                      )}
                      {eq.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="mb-6"
              >
                <Sparkles className="h-16 w-16 text-primary" />
              </motion.div>
              <h3 className="text-xl font-bold mb-2">Generating Your Workout</h3>
              <p className="text-muted-foreground text-center">
                Our AI is crafting the perfect workout based on your preferences...
              </p>
            </div>
          )}

          {step === 'result' && generatedWorkout && (
            <div className="p-4 space-y-4">
              {/* Workout Info */}
              <div className="ios-card p-5">
                <h3 className="text-xl font-bold mb-2">{generatedWorkout.name}</h3>
                <p className="text-muted-foreground text-sm mb-3">{generatedWorkout.description}</p>
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {generatedWorkout.estimated_duration} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Dumbbell className="h-4 w-4" />
                    {generatedWorkout.exercises.length} exercises
                  </span>
                  <span className="capitalize px-2 py-0.5 bg-primary/10 rounded-full text-primary text-xs">
                    {generatedWorkout.difficulty}
                  </span>
                </div>
              </div>

              {/* Warmup Note */}
              {generatedWorkout.warmup_notes && (
                <div className="ios-card p-4 bg-yellow-500/10 border-yellow-500/20">
                  <p className="text-sm">
                    <span className="font-medium">Warmup: </span>
                    {generatedWorkout.warmup_notes}
                  </p>
                </div>
              )}

              {/* Exercises */}
              <div className="space-y-3">
                <h4 className="font-medium">Exercises</h4>
                {generatedWorkout.exercises.map((ex, index) => (
                  <motion.div
                    key={ex.exercise_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="ios-card p-4 flex items-center gap-4"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium truncate">{ex.name}</h5>
                      <p className="text-sm text-muted-foreground">
                        {ex.sets} sets × {ex.reps} reps • {ex.rest}s rest
                      </p>
                      {ex.notes && (
                        <p className="text-xs text-muted-foreground/75 mt-1">{ex.notes}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="safe-bottom p-4 border-t bg-background shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          {step === 'input' && (
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleGenerate}
                disabled={selectedMuscles.length === 0}
                className="w-full min-h-touch gap-2"
                size="lg"
              >
                <Sparkles className="h-4 w-4" />
                Generate Workout
              </Button>
            </motion.div>
          )}

          {step === 'result' && generatedWorkout && (
            <div className="flex gap-3">
              <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                <Button
                  variant="outline"
                  onClick={handleSaveAsTemplate}
                  disabled={isSaving}
                  className="w-full min-h-touch gap-2"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Template
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.98 }} className="flex-1">
                <Button
                  onClick={handleStartWorkout}
                  className="w-full min-h-touch gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-4 w-4" />
                  Start Now
                </Button>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
