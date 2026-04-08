'use client'

import { Button } from '@/components/ui/button'
import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { useState, useEffect, useRef, useCallback } from 'react'
import { SEGMENT_LABELS } from '@/lib/types/cardio'
import type { CardioSegmentData, CardioSegmentInput } from '@/lib/types/cardio'

interface CardioSessionLoggerProps {
  segments: CardioSegmentData[]
  onComplete: (segments: CardioSegmentInput[], totalDuration: number, totalDistance: number, startedAt: string) => void
  onCancel: () => void
}

export function CardioSessionLogger({ segments, onComplete, onCancel }: CardioSessionLoggerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [completedSegments, setCompletedSegments] = useState<CardioSegmentInput[]>([])
  const [editingSpeed, setEditingSpeed] = useState<number | null>(null)
  const [editingIncline, setEditingIncline] = useState<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const sessionStartRef = useRef<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentSegment = segments[currentIndex]
  const isLastSegment = currentIndex === segments.length - 1

  const actualSpeed = editingSpeed ?? currentSegment?.speed ?? 0
  const actualIncline = editingIncline ?? currentSegment?.settings?.incline ?? 0

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current!) / 1000))
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning])

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }, [])

  const handleNextSegment = () => {
    if (!currentSegment) return

    const segmentInput: CardioSegmentInput = {
      segment_order: currentIndex,
      segment_type: currentSegment.type,
      duration_seconds: elapsed,
      speed: actualSpeed,
      distance: actualSpeed > 0 ? (actualSpeed * elapsed) / 3600 : undefined,
      settings: { incline: actualIncline },
      is_planned: editingSpeed === null && editingIncline === null,
      completed: true,
    }

    const newCompleted = [...completedSegments, segmentInput]
    setCompletedSegments(newCompleted)

    if (isLastSegment) {
      setIsRunning(false)
      if (intervalRef.current) clearInterval(intervalRef.current)
      const totalDuration = newCompleted.reduce((sum, s) => sum + s.duration_seconds, 0)
      const totalDistance = newCompleted.reduce((sum, s) => sum + (s.distance || 0), 0)
      onComplete(newCompleted, totalDuration, totalDistance, sessionStartRef.current!)
    } else {
      setCurrentIndex(currentIndex + 1)
      setElapsed(0)
      setEditingSpeed(null)
      setEditingIncline(null)
      startTimeRef.current = Date.now()
    }
  }

  if (!currentSegment) return null

  const targetDuration = currentSegment.duration_seconds
  const progress = Math.min(elapsed / targetDuration, 1)
  const isOvertime = elapsed > targetDuration

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={springs.sheet}
      className="fixed inset-0 z-[60] bg-background flex flex-col !mt-0"
    >
      <div className="safe-top border-b bg-background/95 backdrop-blur">
        <div className="px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <h2 className="ios-headline">
            {SEGMENT_LABELS[currentSegment.type]}
          </h2>
          <div className="text-sm text-muted-foreground">
            {currentIndex + 1}/{segments.length}
          </div>
        </div>
      </div>

      <div className="px-4 pt-2">
        <div className="flex gap-1">
          {segments.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i < currentIndex
                  ? 'bg-primary'
                  : i === currentIndex
                    ? 'bg-primary/50'
                    : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className={`text-6xl font-bold tracking-tight ${isOvertime ? 'text-orange-500' : 'text-foreground'}`}>
          {formatTime(elapsed)}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Target: {formatTime(targetDuration)}
        </div>

        <div className="w-full max-w-xs mt-6 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isOvertime ? 'bg-orange-500' : 'bg-primary'}`}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="flex gap-6 mt-8">
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                max="25"
                value={actualSpeed}
                onChange={(e) => setEditingSpeed(parseFloat(e.target.value) || 0)}
                className="w-16 text-2xl font-bold text-foreground text-center bg-transparent border-b-2 border-muted focus:border-primary focus:outline-none"
              />
              <span className="text-sm text-muted-foreground">km/h</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Speed</div>
          </div>
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                max="15"
                value={actualIncline}
                onChange={(e) => setEditingIncline(parseFloat(e.target.value) || 0)}
                className="w-16 text-2xl font-bold text-foreground text-center bg-transparent border-b-2 border-muted focus:border-primary focus:outline-none"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">Incline</div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 safe-bottom">
        {!isRunning ? (
          <Button className="w-full h-14 text-lg" onClick={() => {
            if (!sessionStartRef.current) {
              sessionStartRef.current = new Date().toISOString()
            }
            startTimeRef.current = Date.now() - elapsed * 1000
            setIsRunning(true)
          }}>
            {elapsed > 0 ? 'Resume' : 'Start'}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-14"
              onClick={() => {
                setIsRunning(false)
                if (intervalRef.current) clearInterval(intervalRef.current)
              }}
            >
              Pause
            </Button>
            <Button className="flex-1 h-14 text-lg" onClick={handleNextSegment}>
              {isLastSegment ? 'Finish' : 'Next Segment'}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
