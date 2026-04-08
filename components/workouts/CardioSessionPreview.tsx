'use client'

import { motion } from 'motion/react'
import { springs, variants } from '@/lib/motion-system'
import { SEGMENT_LABELS } from '@/lib/types/cardio'
import type { CardioSegmentData } from '@/lib/types/cardio'

interface CardioSessionPreviewProps {
  segments: CardioSegmentData[]
}

export function CardioSessionPreview({ segments }: CardioSessionPreviewProps) {
  if (segments.length === 0) return null

  return (
    <motion.div
      {...variants.slideUp}
      transition={springs.ios}
      className="ios-card p-3"
    >
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
        Today&apos;s Session
      </div>
      <div className="flex gap-1.5">
        {segments.map((segment, i) => {
          const isMain = segment.type === 'main' || segment.type === 'interval'
          const minutes = Math.round(segment.duration_seconds / 60)
          const incline = segment.settings?.incline

          return (
            <div
              key={i}
              className={`${isMain ? 'flex-[2]' : 'flex-1'} rounded-lg p-2 text-center ${
                isMain
                  ? 'bg-primary/10 border border-primary/20'
                  : 'bg-muted'
              }`}
            >
              <div className={`text-[10px] font-medium ${isMain ? 'text-primary' : 'text-muted-foreground'}`}>
                {SEGMENT_LABELS[segment.type] || segment.type}
              </div>
              <div className="text-sm font-semibold text-foreground mt-0.5">
                {minutes} min
              </div>
              <div className="text-[10px] text-muted-foreground">
                {segment.speed} km/h{incline ? ` @ ${incline}%` : ''}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
