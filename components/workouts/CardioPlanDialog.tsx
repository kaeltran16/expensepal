'use client'

import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import type { CardioPlanInput, FitnessLevel } from '@/lib/types/cardio'

interface CardioPlanDialogProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (input: CardioPlanInput) => void
  isGenerating: boolean
}

const FITNESS_LEVELS: { value: FitnessLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export function CardioPlanDialog({ isOpen, onClose, onGenerate, isGenerating }: CardioPlanDialogProps) {
  const [goal, setGoal] = useState('')
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('beginner')
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3)

  useEffect(() => {
    if (isOpen) {
      setGoal('')
      setFitnessLevel('beginner')
      setSessionsPerWeek(3)
    }
  }, [isOpen])

  const handleSubmit = () => {
    if (!goal.trim()) return
    onGenerate({
      goal: goal.trim(),
      fitness_level: fitnessLevel,
      sessions_per_week: sessionsPerWeek,
      exercise_type: 'treadmill',
    })
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={springs.sheet}
          className="bg-background w-full max-w-lg rounded-t-2xl p-4 safe-bottom"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
          <h2 className="ios-headline mb-4">Generate Training Plan</h2>

          <div className="mb-4">
            <label className="text-sm font-medium text-foreground block mb-1">Goal</label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., run 5km in 30 minutes"
              className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium text-foreground block mb-1">Fitness Level</label>
            <div className="flex gap-2">
              {FITNESS_LEVELS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFitnessLevel(value)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    fitnessLevel === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="text-sm font-medium text-foreground block mb-1">Sessions per week</label>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setSessionsPerWeek(n)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                    sessionsPerWeek === n
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {n}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!goal.trim() || isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Plan'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
