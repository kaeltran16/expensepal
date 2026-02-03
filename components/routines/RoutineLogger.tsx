'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { cn, hapticFeedback } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, ChevronRight, Clock, Lightbulb, Pause, Play, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { rewardStepComplete } from '@/lib/micro-rewards'
import type {
  RoutineTemplate,
  RoutineStep,
  CustomRoutineStep,
  ExpandedRoutineStep,
  CompletedStep,
  CompleteRoutineInput,
} from '@/lib/types/routines'
import { calculateRoutineXP } from '@/lib/routine-gamification'

// Storage key for routine progress
const getStorageKey = (templateId: string) => `routine-progress-${templateId}`

// Get current date in GMT+7 as YYYY-MM-DD
const getGMT7Date = () => {
  const now = new Date()
  // GMT+7 offset in milliseconds
  const gmt7Offset = 7 * 60 * 60 * 1000
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000
  const gmt7Time = new Date(utcTime + gmt7Offset)
  return gmt7Time.toISOString().split('T')[0]
}

interface StoredProgress {
  date: string // GMT+7 date string
  currentStepIndex: number
  completedSteps: CompletedStep[]
  startedAt: string
  elapsedSeconds: number
}

interface RoutineLoggerProps {
  template: RoutineTemplate
  availableSteps: RoutineStep[]
  customSteps: CustomRoutineStep[]
  currentStreak: number
  onComplete: (data: CompleteRoutineInput) => void
  onCancel: () => void
}

export function RoutineLogger({
  template,
  availableSteps,
  customSteps,
  currentStreak,
  onComplete,
  onCancel,
}: RoutineLoggerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<CompletedStep[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [startedAt, setStartedAt] = useState(new Date().toISOString())
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showTips, setShowTips] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  // Create Maps for O(1) lookups instead of O(n) find operations
  const stepsMap = useMemo(() => new Map(availableSteps.map((s) => [s.id, s])), [availableSteps])
  const customStepsMap = useMemo(() => new Map(customSteps.map((s) => [s.id, s])), [customSteps])

  // Expand template steps with full data
  const expandedSteps: ExpandedRoutineStep[] = useMemo(() => {
    return (template.steps || []).map((stepRef, index) => {
      const foundStep = stepsMap.get(stepRef.step_id) || customStepsMap.get(stepRef.step_id)

      return {
        id: stepRef.step_id,
        name: foundStep?.name || 'Unknown Step',
        description: foundStep?.description,
        tips: foundStep?.tips,
        image_url: foundStep?.image_url,
        gif_url: foundStep?.gif_url,
        category: foundStep?.category,
        duration_seconds: stepRef.custom_duration || foundStep?.duration_seconds || 60,
        order: index,
        notes: stepRef.notes,
        is_custom: stepRef.is_custom || false,
      }
    })
  }, [template.steps, stepsMap, customStepsMap])

  // Load saved progress on mount (with midnight GMT+7 reset)
  useEffect(() => {
    const storageKey = getStorageKey(template.id)
    const saved = localStorage.getItem(storageKey)

    if (saved) {
      try {
        const progress: StoredProgress = JSON.parse(saved)
        const todayGMT7 = getGMT7Date()

        // Reset if it's a new day in GMT+7
        if (progress.date !== todayGMT7) {
          localStorage.removeItem(storageKey)
        } else {
          // Restore progress
          setCurrentStepIndex(progress.currentStepIndex)
          setCompletedSteps(progress.completedSteps)
          setStartedAt(progress.startedAt)
          setElapsedSeconds(progress.elapsedSeconds)
        }
      } catch (e) {
        localStorage.removeItem(storageKey)
      }
    }
    setIsInitialized(true)
  }, [template.id])

  // Save progress whenever it changes
  useEffect(() => {
    if (!isInitialized) return

    const progress: StoredProgress = {
      date: getGMT7Date(),
      currentStepIndex,
      completedSteps,
      startedAt,
      elapsedSeconds,
    }
    localStorage.setItem(getStorageKey(template.id), JSON.stringify(progress))
  }, [isInitialized, template.id, currentStepIndex, completedSteps, startedAt, elapsedSeconds])

  // Timer
  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isPaused])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleCompleteStep = useCallback(() => {
    const currentStep = expandedSteps[currentStepIndex]

    hapticFeedback('medium')
    rewardStepComplete()

    const completed: CompletedStep = {
      step_id: currentStep.id,
      step_name: currentStep.name,
      completed_at: new Date().toISOString(),
      skipped: false,
    }

    setCompletedSteps((prev) => [...prev, completed])

    if (currentStepIndex < expandedSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    } else {
      // All steps done
      finishRoutine([...completedSteps, completed])
    }
  }, [currentStepIndex, expandedSteps, completedSteps])

  const handleSkipStep = useCallback(() => {
    const currentStep = expandedSteps[currentStepIndex]

    hapticFeedback('light')

    const skipped: CompletedStep = {
      step_id: currentStep.id,
      step_name: currentStep.name,
      completed_at: new Date().toISOString(),
      skipped: true,
    }

    setCompletedSteps((prev) => [...prev, skipped])

    if (currentStepIndex < expandedSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    } else {
      // All steps done (with skip)
      finishRoutine([...completedSteps, skipped])
    }
  }, [currentStepIndex, expandedSteps, completedSteps])

  const finishRoutine = (allSteps: CompletedStep[]) => {
    // Clear saved progress on completion
    localStorage.removeItem(getStorageKey(template.id))

    const completedAt = new Date().toISOString()
    const durationMinutes = Math.ceil(elapsedSeconds / 60)
    const completedCount = allSteps.filter((s) => !s.skipped).length

    const xpBreakdown = calculateRoutineXP({
      completedSteps: completedCount,
      totalSteps: expandedSteps.length,
      currentStreak,
    })

    const data: CompleteRoutineInput = {
      template_id: template.id,
      time_of_day: template.time_of_day || undefined,
      started_at: startedAt,
      completed_at: completedAt,
      duration_minutes: durationMinutes,
      steps_completed: allSteps,
      xp_earned: xpBreakdown.baseXp,
      bonus_xp: xpBreakdown.streakBonus + xpBreakdown.perfectBonus,
    }

    onComplete(data)
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
  }

  const currentStep = expandedSteps[currentStepIndex]

  // Create Map for O(1) completed step lookups instead of O(n) find in render
  const completedStepsMap = useMemo(
    () => new Map(completedSteps.map((s) => [s.step_id, s])),
    [completedSteps]
  )

  // Loading state
  if (!isInitialized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-teal-500" />
      </div>
    )
  }

  // No steps state
  if (expandedSteps.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <p className="text-muted-foreground">This routine has no steps.</p>
        <Button onClick={onCancel} className="mt-4" variant="outline">
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal Header */}
      <div className="flex items-center justify-between p-4">
        <button
          onClick={() => setShowCancelDialog(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{formatTime(elapsedSeconds)}</span>
        </div>

        <button
          onClick={() => setIsPaused(!isPaused)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"
        >
          {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </button>
      </div>

      {/* Single Step Focus Content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {currentStep && (
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm text-center"
            >
              {/* Step Number Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-4 py-1.5 text-sm font-medium text-teal-600 dark:text-teal-400">
                <span>Step {currentStepIndex + 1}</span>
                <span className="text-teal-500/50">of {expandedSteps.length}</span>
              </div>

              {/* Step Name */}
              <h1 className="text-2xl font-semibold">{currentStep.name}</h1>

              {/* Duration */}
              <div className="mt-2 flex items-center justify-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatDuration(currentStep.duration_seconds)}</span>
                {currentStep.category && (
                  <>
                    <span>·</span>
                    <span className="capitalize">{currentStep.category}</span>
                  </>
                )}
              </div>

              {/* Description */}
              {currentStep.description && (
                <p className="mt-4 text-muted-foreground">{currentStep.description}</p>
              )}

              {/* Tips */}
              {currentStep.tips && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowTips(!showTips)}
                    className="inline-flex items-center gap-1 text-sm text-teal-600 dark:text-teal-400"
                  >
                    <Lightbulb className="h-4 w-4" />
                    <span>{showTips ? 'Hide tips' : 'Show tips'}</span>
                  </button>
                  <AnimatePresence>
                    {showTips && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 rounded-xl bg-teal-50 p-4 text-left text-sm text-teal-800 dark:bg-teal-900/30 dark:text-teal-200">
                          {currentStep.tips}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Custom notes */}
              {currentStep.notes && (
                <div className="mt-4 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                  <span className="font-medium">Note: </span>
                  {currentStep.notes}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col gap-3">
                <Button
                  onClick={handleCompleteStep}
                  size="lg"
                  className="h-14 w-full bg-teal-500 text-base font-medium hover:bg-teal-600"
                >
                  <Check className="mr-2 h-5 w-5" />
                  Done
                  {currentStepIndex < expandedSteps.length - 1 && (
                    <ChevronRight className="ml-1 h-5 w-5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleSkipStep}
                  className="text-muted-foreground"
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Skip this step
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center gap-2 pb-8">
        {expandedSteps.map((step, index) => {
          const completedStep = completedStepsMap.get(step.id)
          const isCompleted = !!completedStep && !completedStep.skipped
          const isSkipped = !!completedStep?.skipped
          const isCurrent = index === currentStepIndex

          return (
            <div
              key={step.id}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                isCurrent ? 'w-6 bg-teal-500' : 'w-2',
                isCompleted && 'bg-teal-500',
                isSkipped && 'bg-muted-foreground/30',
                !isCompleted && !isSkipped && !isCurrent && 'bg-muted'
              )}
            />
          )
        })}
      </div>

      {/* Paused overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm"
          >
            <div className="text-center">
              <Pause className="mx-auto h-16 w-16 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-semibold">Paused</h2>
              <p className="mt-1 text-muted-foreground">
                {formatTime(elapsedSeconds)} elapsed
              </p>
              <Button
                className="mt-6 bg-teal-500 hover:bg-teal-600"
                onClick={() => setIsPaused(false)}
              >
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit routine?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress is saved and will continue from where you left off today.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue</AlertDialogCancel>
            <AlertDialogAction onClick={onCancel}>
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
