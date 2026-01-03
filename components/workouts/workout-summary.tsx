'use client'

import { Button } from '@/components/ui/button'
import type { Set } from './exercise-set-tracker'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Dumbbell, Share2, Timer, TrendingUp, Zap } from 'lucide-react'

export interface ExerciseLog {
  exercise_id: string
  exercise_name: string
  sets: Set[]
  target_sets: number
  target_reps: string
  target_rest: number
}

interface PersonalRecord {
  type: string
  value: number
  unit: string
}

interface WorkoutSummaryProps {
  show: boolean
  templateName: string
  exerciseLogs: ExerciseLog[]
  durationMinutes: number
  personalRecords: PersonalRecord[]
  onClose: () => void
  onShare?: () => void
}

/**
 * WorkoutSummary component - displays workout completion summary
 * Features:
 * - Total stats: sets, volume, duration
 * - PRs achieved list
 * - Estimated calorie burn
 * - Share workout functionality
 * - Celebration animations
 */
export function WorkoutSummary({
  show,
  templateName,
  exerciseLogs,
  durationMinutes,
  personalRecords,
  onClose,
  onShare
}: WorkoutSummaryProps) {
  // Calculate statistics
  const totalSets = exerciseLogs.reduce((sum, log) => sum + log.sets.length, 0)
  const totalVolume = exerciseLogs.reduce((sum, log) =>
    sum + log.sets.reduce((setSum, set) => setSum + (set.weight * set.reps), 0)
  , 0)
  const completedExercises = exerciseLogs.filter(log => log.sets.length > 0).length

  // Estimate calories burned (rough estimate: ~5 calories per minute of strength training)
  const estimatedCalories = Math.round(durationMinutes * 5)

  const handleShare = async () => {
    if (!onShare) return

    const shareText = `💪 Completed ${templateName}\n\n` +
      `⏱️ ${durationMinutes} min\n` +
      `🏋️ ${totalSets} sets\n` +
      `📊 ${Math.round(totalVolume)} kg volume\n` +
      `🔥 ~${estimatedCalories} cal burned` +
      (personalRecords.length > 0 ? `\n🏆 ${personalRecords.length} PR${personalRecords.length > 1 ? 's' : ''}!` : '')

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Workout Complete!',
          text: shareText
        })
        onShare()
      } catch (error) {
        console.error('Share failed:', error)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText)
      onShare()
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            onClick={(e) => e.stopPropagation()}
            className="ios-card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Celebration Header */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.6, delay: 0.1 }}
                className="text-6xl mb-3"
              >
                🎉
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="ios-title1 mb-2"
              >
                Workout Complete!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-muted-foreground"
              >
                {templateName}
              </motion.p>
            </div>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="grid grid-cols-2 gap-3 mb-6"
            >
              {/* Duration */}
              <div className="frosted-card p-4 text-center">
                <Timer className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{durationMinutes}</p>
                <p className="text-xs text-muted-foreground">minutes</p>
              </div>

              {/* Total Sets */}
              <div className="frosted-card p-4 text-center">
                <Check className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold">{totalSets}</p>
                <p className="text-xs text-muted-foreground">sets</p>
              </div>

              {/* Total Volume */}
              <div className="frosted-card p-4 text-center">
                <Dumbbell className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold">{Math.round(totalVolume)}</p>
                <p className="text-xs text-muted-foreground">kg volume</p>
              </div>

              {/* Calories Burned */}
              <div className="frosted-card p-4 text-center">
                <Zap className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                <p className="text-2xl font-bold">~{estimatedCalories}</p>
                <p className="text-xs text-muted-foreground">cal burned</p>
              </div>
            </motion.div>

            {/* Exercises Completed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-6"
            >
              <h3 className="ios-headline mb-3">Exercises ({completedExercises})</h3>
              <div className="space-y-2">
                {exerciseLogs
                  .filter(log => log.sets.length > 0)
                  .map((log, index) => (
                    <motion.div
                      key={log.exercise_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <span className="font-medium">{log.exercise_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {log.sets.length} sets
                      </span>
                    </motion.div>
                  ))}
              </div>
            </motion.div>

            {/* Personal Records */}
            {personalRecords.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mb-6"
              >
                <div className="frosted-card p-4 border-l-4 border-l-primary">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h3 className="ios-headline">Personal Records</h3>
                  </div>
                  <div className="space-y-1">
                    {personalRecords.map((pr, idx) => (
                      <p key={idx} className="text-sm text-primary">
                        {pr.type}: {pr.value} {pr.unit}
                      </p>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex gap-3"
            >
              {onShare && (
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="flex-1 min-h-touch gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              )}
              <Button
                onClick={onClose}
                className="flex-1 min-h-touch"
              >
                Done
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
