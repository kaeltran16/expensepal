'use client'

import { Button } from '@/components/ui/button'
import { AnimatePresence, motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import type { CardioPlanData } from '@/lib/types/cardio'

interface CardioPlanPreviewProps {
  isOpen: boolean
  name: string
  totalWeeks: number
  sessionsPerWeek: number
  planData: CardioPlanData
  onConfirm: () => void
  onRegenerate: () => void
  onClose: () => void
  isSaving: boolean
}

export function CardioPlanPreview({
  isOpen,
  name,
  totalWeeks,
  sessionsPerWeek,
  planData,
  onConfirm,
  onRegenerate,
  onClose,
  isSaving,
}: CardioPlanPreviewProps) {
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
          className="bg-background w-full max-w-lg rounded-t-2xl p-4 safe-bottom max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
          <h2 className="ios-headline mb-1">{name}</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {totalWeeks} weeks &middot; {sessionsPerWeek}x per week
          </p>

          {planData.summary && (
            <div className="ios-card p-3 mb-4">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Progression
              </div>
              <p className="text-sm text-foreground">{planData.summary}</p>
            </div>
          )}

          <div className="space-y-2 mb-6">
            {planData.weeks.map((week) => {
              const totalDuration = week.sessions.reduce((sum, s) =>
                sum + s.segments.reduce((ss, seg) => ss + seg.duration_seconds, 0), 0
              )
              const mainSegments = week.sessions[0]?.segments.filter(s => s.type === 'main') ?? []
              const avgSpeed = mainSegments.length > 0
                ? mainSegments.reduce((sum, s) => sum + s.speed, 0) / mainSegments.length
                : 0

              return (
                <div key={week.week_number} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div className="text-sm font-medium text-foreground">
                    Week {week.week_number}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ~{Math.round(totalDuration / 60)} min/session &middot; {avgSpeed.toFixed(1)} km/h
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onRegenerate}>
              Try Again
            </Button>
            <Button className="flex-1" onClick={onConfirm} disabled={isSaving}>
              {isSaving ? 'Starting...' : 'Start Plan'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
