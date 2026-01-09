import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useExerciseHistory } from '@/lib/hooks'
import type { ExerciseSet } from '@/lib/types/common'
import { hapticFeedback } from '@/lib/utils'
import { detectPersonalRecords, getProgressiveOverloadSuggestion } from '@/lib/workout-helpers'
import { motion } from 'framer-motion'
import { Check, Minus, Plus, TrendingUp, Zap } from 'lucide-react'
import { useMemo, useState } from 'react'

interface ExerciseSetTrackerProps {
  exerciseId: string
  exerciseName: string
  completedSets: ExerciseSet[]
  targetSets: number
  targetReps: string
  targetRest: number
  onAddSet: (reps: number, weight: number) => void
  onDeleteSet: (setNumber: number) => void
  onEditSet: (setNumber: number) => void
  editingSetNumber: number | null
  onCancelEdit: () => void
  onPRDetected: (prs: Array<{ type: string; value: number; unit: string }>) => void
}

/**
 * ExerciseSetTracker component - manages set logging and display
 * Features:
 * - Displays completed sets with animations
 * - Tap to edit sets
 * - AI-powered progressive overload suggestions
 * - Shows previous workout performance
 * - PR detection
 */
export function ExerciseSetTracker({
  exerciseId,
  exerciseName,
  completedSets,
  targetSets,
  targetReps,
  targetRest,
  onAddSet,
  onDeleteSet,
  onEditSet,
  editingSetNumber,
  onCancelEdit,
  onPRDetected
}: ExerciseSetTrackerProps) {
  const canAddNewSet = completedSets.length < targetSets || editingSetNumber !== null

  return (
    <div className="space-y-6">
      {/* Completed Sets Display */}
      {completedSets.length > 0 && (
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25
          }}
        >
          <motion.div
            className="flex items-center justify-between px-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="ios-headline">Completed Sets</h3>
            <motion.span
              className="text-sm text-muted-foreground"
              key={completedSets.length}
              initial={{ scale: 1.3 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 15
              }}
            >
              {completedSets.length} of {targetSets}
            </motion.span>
          </motion.div>
          <div className="space-y-2">
            {completedSets.map((set, index) => (
              <motion.div
                key={set.set_number}
                initial={{ opacity: 0, x: -30, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{
                  delay: index * 0.05,
                  type: "spring",
                  stiffness: 400,
                  damping: 25
                }}
                whileHover={{
                  scale: 1.02,
                  x: 4,
                  transition: { type: "spring", stiffness: 500, damping: 20 }
                }}
                whileTap={{
                  scale: 0.98,
                  transition: { duration: 0.1 }
                }}
                className="ios-card p-4 cursor-pointer"
                onClick={() => {
                  onEditSet(set.set_number ?? 0)
                  hapticFeedback('light')
                }}
              >
                <div className="flex items-center justify-between">
                  <motion.span
                    className="font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 + 0.1 }}
                  >
                    Set {set.set_number}
                  </motion.span>
                  <div className="flex items-center gap-3">
                    <motion.span
                      className="text-muted-foreground"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 + 0.15 }}
                    >
                      {set.weight}kg × {set.reps} reps
                    </motion.span>
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        delay: index * 0.05 + 0.2,
                        type: "spring",
                        stiffness: 500,
                        damping: 15
                      }}
                    >
                      <Check className="h-5 w-5 text-green-600" />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Add/Edit Set Form */}
      {canAddNewSet && (
        <SetInputForm
          setNumber={editingSetNumber || completedSets.length + 1}
          exerciseId={exerciseId}
          lastSet={editingSetNumber
            ? completedSets.find(s => s.set_number === editingSetNumber)
            : completedSets[completedSets.length - 1]
          }
          targetReps={targetReps}
          onAddSet={onAddSet}
          onPRDetected={onPRDetected}
          isEditing={!!editingSetNumber}
          onCancelEdit={onCancelEdit}
          onDelete={editingSetNumber ? () => onDeleteSet(editingSetNumber) : undefined}
        />
      )}
    </div>
  )
}

// Set Input Form with AI Suggestions
interface SetInputFormProps {
  setNumber: number
  exerciseId: string
  lastSet?: ExerciseSet
  targetReps: string
  onAddSet: (reps: number, weight: number) => void
  onPRDetected: (prs: Array<{ type: string; value: number; unit: string }>) => void
  isEditing?: boolean
  onCancelEdit?: () => void
  onDelete?: () => void
}

function SetInputForm({
  setNumber,
  exerciseId,
  lastSet,
  targetReps,
  onAddSet,
  onPRDetected,
  isEditing = false,
  onCancelEdit,
  onDelete
}: SetInputFormProps) {
  // Fetch exercise history for suggestions
  const { data: history = [] } = useExerciseHistory(exerciseId, 5)

  // Parse target reps range
  const [targetMin, targetMax] = useMemo(() => {
    const match = targetReps.match(/(\d+)-(\d+)/)
    if (match) {
      return [parseInt(match[1]!), parseInt(match[2]!)]
    }
    const single = parseInt(targetReps)
    return [single, single]
  }, [targetReps])

  // Get progressive overload suggestion
  const suggestion = useMemo(() => {
    return getProgressiveOverloadSuggestion(history, targetMin, targetMax)
  }, [history, targetMin, targetMax])

  // Initialize with suggested or last weight
  const [reps, setReps] = useState(targetMin || 10)
  const [weight, setWeight] = useState(() => {
    if (lastSet) return lastSet.weight ?? 20
    if (suggestion.recommendedWeight) return suggestion.recommendedWeight
    if (history.length > 0 && history[0]?.sets && history[0].sets.length > 0) {
      return Math.max(...history[0].sets.map((s: { weight?: number }) => s.weight || 0))
    }
    return 20
  })

  const handleSubmit = () => {
    onAddSet(reps, weight)

    // Check for PRs if we have history with actual data to compare
    if (history.length > 0 && history[0]?.sets && history[0].sets.length > 0) {
      const previousBest = history[0]

      // Only check PRs if we have meaningful previous data
      if (previousBest.maxWeight && previousBest.maxWeight > 0 && previousBest.sets) {
        const currentSet = { set_number: setNumber, reps, weight, completed: true, rest: 60 }

        // Calculate max reps from a single set in previous history
        const previousMaxReps = Math.max(...previousBest.sets.map((s: { reps?: number }) => s.reps || 0))

        const prs = detectPersonalRecords([currentSet], {
          max_weight: previousBest.maxWeight,
          max_reps: previousMaxReps,
          max_volume: previousBest.totalVolume || 0,
          estimated_1rm: previousBest.estimated1RM || 0,
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
      {/* AI Suggestion Card */}
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

      {/* Previous Performance */}
      {history.length > 0 && history[0]?.sets && history[0].sets.length > 0 && (
        <div className="ios-card p-4">
          <div className="flex items-center justify-between">
            <span className="ios-caption text-muted-foreground">last workout</span>
            <div className="text-right">
              <p className="ios-headline">
                {Math.max(...history[0].sets.map((s: { weight?: number }) => s.weight || 0))}kg × {' '}
                {Math.max(...history[0].sets.map((s: { reps?: number }) => s.reps || 0))} reps
              </p>
              <p className="ios-caption text-muted-foreground">
                {history[0].totalSets || 0} sets • {Math.round(history[0].totalVolume || 0)}kg volume
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Set Input */}
      <div className="ios-card p-6 space-y-4">
        <h3 className="ios-headline text-center">
          {isEditing ? `Edit Set ${setNumber}` : `Log Set ${setNumber}`}
        </h3>

        {/* Reps Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">reps</label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setReps(Math.max(1, reps - 1))}
              className="h-12 w-12"
              aria-label="Decrease reps"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={reps}
              onChange={(e) => setReps(Number(e.target.value))}
              className="text-center text-2xl font-bold h-12"
              aria-label="Number of reps"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setReps(reps + 1)}
              className="h-12 w-12"
              aria-label="Increase reps"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Weight Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">weight (kg)</label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeight(Math.max(0, (weight ?? 0) - 2.5))}
              className="h-12 w-12"
              aria-label="Decrease weight"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              step="2.5"
              className="text-center text-2xl font-bold h-12"
              aria-label="Weight in kilograms"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeight(weight + 2.5)}
              className="h-12 w-12"
              aria-label="Increase weight"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
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
