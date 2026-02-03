'use client'

import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, ChevronUp, Clock, Lightbulb, SkipForward } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { ExpandedRoutineStep } from '@/lib/types/routines'

interface RoutineStepCardProps {
  step: ExpandedRoutineStep
  isActive: boolean
  isCompleted: boolean
  isSkipped?: boolean
  onComplete: () => void
  onSkip: () => void
  stepNumber: number
  totalSteps: number
}

export function RoutineStepCard({
  step,
  isActive,
  isCompleted,
  isSkipped,
  onComplete,
  onSkip,
  stepNumber,
  totalSteps,
}: RoutineStepCardProps) {
  const [showTips, setShowTips] = useState(false)

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'ios-card overflow-hidden transition-all',
        isActive && 'ring-2 ring-teal-500',
        isCompleted && 'opacity-60',
        isSkipped && 'opacity-40'
      )}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Step indicator */}
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                isCompleted
                  ? 'bg-ios-success text-white'
                  : isSkipped
                    ? 'bg-muted text-muted-foreground line-through'
                    : isActive
                      ? 'bg-teal-500 text-white'
                      : 'bg-muted text-muted-foreground'
              )}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
            </div>

            <div>
              <h3
                className={cn(
                  'font-medium',
                  isSkipped && 'line-through text-muted-foreground'
                )}
              >
                {step.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatDuration(step.duration_seconds)}</span>
                {step.category && (
                  <>
                    <span>·</span>
                    <span className="capitalize">{step.category}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <span className="text-xs text-muted-foreground">
            {stepNumber}/{totalSteps}
          </span>
        </div>

        {/* Description */}
        {step.description && (
          <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
        )}

        {/* Tips toggle */}
        {step.tips && (
          <button
            onClick={() => setShowTips(!showTips)}
            className="mt-2 flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400"
          >
            <Lightbulb className="h-3 w-3" />
            <span>{showTips ? 'Hide tips' : 'Show tips'}</span>
            {showTips ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        )}

        {/* Tips content */}
        <AnimatePresence>
          {showTips && step.tips && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-lg bg-teal-50 p-3 text-sm text-teal-800 dark:bg-teal-900/30 dark:text-teal-200">
                {step.tips}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Custom notes */}
        {step.notes && (
          <div className="mt-2 rounded-lg bg-muted p-2 text-sm text-muted-foreground">
            <span className="font-medium">Note: </span>
            {step.notes}
          </div>
        )}

        {/* Action buttons - only show if active */}
        {isActive && !isCompleted && !isSkipped && (
          <div className="mt-4 flex gap-2">
            <Button
              onClick={onComplete}
              className="flex-1 bg-teal-500 hover:bg-teal-600"
            >
              <Check className="mr-2 h-4 w-4" />
              Done
            </Button>
            <Button
              variant="outline"
              onClick={onSkip}
              className="text-muted-foreground"
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Skip
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
