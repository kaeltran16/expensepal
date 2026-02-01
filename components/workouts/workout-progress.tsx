'use client'

import { motion } from 'framer-motion'

interface WorkoutProgressProps {
  currentExerciseIndex: number
  totalExercises: number
  templateName: string
}

/**
 * WorkoutProgress component - displays workout progress indicators
 * Features:
 * - Shows current exercise number and total
 * - Displays completion percentage
 * - Animated progress bar with shimmer effect
 */
export function WorkoutProgress({
  currentExerciseIndex,
  totalExercises,
  templateName
}: WorkoutProgressProps) {
  const progress = ((currentExerciseIndex + 1) / totalExercises) * 100

  return (
    <div className="space-y-0">
      {/* Header Info */}
      <div className="text-center">
        <h2 className="font-semibold">{templateName}</h2>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-primary">
            Exercise {currentExerciseIndex + 1}
          </span>
          <span>/</span>
          <span>{totalExercises}</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-primary rounded-full relative overflow-hidden"
          transition={{
            type: "spring",
            stiffness: 100,
            damping: 15
          }}
        >
          {/* Shimmer Effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{
              x: ['-100%', '200%']
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </motion.div>
      </div>
    </div>
  )
}
