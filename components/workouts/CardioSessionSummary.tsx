'use client'

import { Button } from '@/components/ui/button'
import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { formatDistance, formatPace, SEGMENT_LABELS } from '@/lib/types/cardio'
import type { CardioSegmentInput } from '@/lib/types/cardio'

interface CardioSessionSummaryProps {
  totalDuration: number
  totalDistance: number
  segments: CardioSegmentInput[]
  planWeek?: number
  planSession?: number
  sessionsPerWeek?: number
  onClose: () => void
}

export function CardioSessionSummary({
  totalDuration,
  totalDistance,
  segments,
  planWeek,
  planSession,
  sessionsPerWeek,
  onClose,
}: CardioSessionSummaryProps) {

  const durationMinutes = Math.round(totalDuration / 60)
  const avgSpeed = totalDuration > 0 ? (totalDistance / totalDuration) * 3600 : 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[70] bg-background flex flex-col !mt-0"
    >
      <div className="flex-1 overflow-y-auto px-4 pt-12 pb-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springs.ios}
          className="text-center mb-6"
        >
          <h2 className="text-2xl font-bold text-foreground">Run Complete</h2>
          {planWeek && planSession && (
            <p className="text-sm text-primary mt-1">
              Week {planWeek}, Session {planSession} done
              {sessionsPerWeek && ` — ${sessionsPerWeek - planSession} left this week`}
            </p>
          )}
        </motion.div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="ios-card p-3 text-center">
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {durationMinutes}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">min</div>
          </div>
          <div className="ios-card p-3 text-center">
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatDistance(totalDistance)}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">km</div>
          </div>
          <div className="ios-card p-3 text-center">
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
              {avgSpeed > 0 ? formatPace(avgSpeed) : '--'}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">pace</div>
          </div>
        </div>

        <div className="ios-card overflow-hidden">
          <div className="px-3 pt-3 pb-1">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Segments
            </div>
          </div>
          {segments.map((seg, i) => (
            <div
              key={i}
              className={`flex items-center justify-between px-3 py-2.5 ${
                i < segments.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="text-sm font-medium text-foreground">
                {SEGMENT_LABELS[seg.segment_type] || seg.segment_type}
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.round(seg.duration_seconds / 60)} min
                {seg.speed ? ` · ${seg.speed} km/h` : ''}
                {seg.settings?.incline ? ` · ${seg.settings.incline}%` : ''}
                {!seg.is_planned && (
                  <span className="text-orange-500 ml-1">(edited)</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4 safe-bottom">
        <Button className="w-full h-14 text-lg" onClick={onClose}>
          Done
        </Button>
      </div>
    </motion.div>
  )
}
