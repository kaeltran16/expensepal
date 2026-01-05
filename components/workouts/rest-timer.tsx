'use client'

import { Button } from '@/components/ui/button'
import { hapticFeedback } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { Timer } from 'lucide-react'
import { useEffect } from 'react'

interface RestTimerProps {
  isResting: boolean
  restTimer: number
  setRestTimer: (value: number | ((prev: number) => number)) => void
  onSkip: () => void
  currentExerciseName?: string
}

/**
 * RestTimer component - displays a full-screen countdown timer during rest periods
 * Features:
 * - Animated countdown display
 * - Range slider for manual time adjustment
 * - Quick adjustment buttons (-15s, +30s, +1min)
 * - Skip rest functionality
 * - Click background to skip
 */
export function RestTimer({
  isResting,
  restTimer,
  setRestTimer,
  onSkip,
  currentExerciseName
}: RestTimerProps) {
  // Auto-decrement timer every second
  useEffect(() => {
    if (isResting && restTimer > 0) {
      const interval = setInterval(() => {
        setRestTimer((prev) => {
          if (prev <= 1) {
            onSkip() // Auto-skip when timer reaches 0
            hapticFeedback('medium')
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
    return undefined
  }, [isResting, restTimer, onSkip, setRestTimer])

  const handleSkip = () => {
    onSkip()
    hapticFeedback('medium')
  }

  const handleAdjustTime = (delta: number) => {
    setRestTimer((prev) => Math.max(0, Math.min(300, prev + delta)))
    hapticFeedback('light')
  }

  return (
    <AnimatePresence>
      {isResting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 flex items-center justify-center p-4"
          onClick={(e) => {
            // Allow clicking background to skip rest
            if (e.target === e.currentTarget) {
              handleSkip()
            }
          }}
        >
          <motion.div
            className="text-center max-w-md w-full bg-background/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-primary/20"
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing
          >
            {/* Timer Icon */}
            <Timer className="h-16 w-16 mx-auto mb-4 text-primary" />

            {/* Countdown Display */}
            <motion.div
              className="text-7xl font-bold mb-2 tabular-nums"
              key={restTimer}
              initial={{ scale: 1.2, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 25
              }}
            >
              {restTimer}s
            </motion.div>

            {/* Rest Time Label */}
            <motion.p
              className="text-lg text-muted-foreground mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              Rest Time
            </motion.p>

            {/* Next Exercise Info */}
            {currentExerciseName && (
              <p className="text-sm text-muted-foreground/70 mb-6">
                Next: {currentExerciseName}
              </p>
            )}

            {/* Slider for Time Adjustment */}
            <div className="mb-6">
              <input
                type="range"
                min="0"
                max="300"
                step="5"
                value={restTimer}
                onChange={(e) => setRestTimer(parseInt(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                aria-label="Rest timer duration"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>0s</span>
                <span>5min</span>
              </div>
            </div>

            {/* Quick Adjustment Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAdjustTime(-15)}
                className="min-h-touch text-sm"
                aria-label="Decrease rest time by 15 seconds"
              >
                -15s
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAdjustTime(30)}
                className="min-h-touch text-sm"
                aria-label="Increase rest time by 30 seconds"
              >
                +30s
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAdjustTime(60)}
                className="min-h-touch text-sm"
                aria-label="Increase rest time by 1 minute"
              >
                +1min
              </Button>
            </div>

            {/* Skip Rest Button */}
            <Button
              variant="secondary"
              size="lg"
              onClick={handleSkip}
              className="w-full min-h-touch"
            >
              Skip Rest
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
