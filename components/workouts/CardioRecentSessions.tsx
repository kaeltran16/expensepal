'use client'

import { motion } from 'motion/react'
import { springs, variants } from '@/lib/motion-system'
import { formatDistance } from '@/lib/types/cardio'
import { formatDistanceToNow } from 'date-fns'
import type { CardioSession } from '@/lib/types/cardio'

interface CardioRecentSessionsProps {
  sessions: CardioSession[]
  maxVisible?: number
}

export function CardioRecentSessions({ sessions, maxVisible = 3 }: CardioRecentSessionsProps) {
  const visible = sessions.slice(0, maxVisible)

  if (visible.length === 0) {
    return (
      <motion.div
        {...variants.slideUp}
        transition={springs.ios}
        className="ios-card p-4 text-center"
      >
        <p className="text-sm text-muted-foreground">No sessions yet</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      {...variants.slideUp}
      transition={springs.ios}
      className="ios-card overflow-hidden"
    >
      <div className="px-3 pt-3 pb-1">
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Recent Sessions
        </div>
      </div>
      {visible.map((session, i) => (
        <div
          key={session.id}
          className={`flex items-center justify-between px-3 py-2.5 ${
            i < visible.length - 1 ? 'border-b border-border' : ''
          }`}
        >
          <div>
            <div className="text-sm font-medium text-foreground">
              {session.plan_week && session.plan_session
                ? `Week ${session.plan_week}, Session ${session.plan_session}`
                : 'Free Run'
              }
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(session.session_date), { addSuffix: true })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-foreground">
              {session.total_distance ? `${formatDistance(session.total_distance)} km` : '--'}
            </div>
            <div className="text-xs text-muted-foreground">
              {Math.round(session.duration_minutes)} min
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  )
}
