'use client'

import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { Dumbbell, Sparkles } from 'lucide-react'
import type { ViewType } from '@/lib/constants/filters'

interface QuickActionsProps {
  completedToday: boolean
  onNavigate: (view: ViewType) => void
}

export function QuickActions({ completedToday, onNavigate }: QuickActionsProps) {
  return (
    <div className="flex gap-2.5">
      <motion.button
        onClick={() => onNavigate('routines')}
        whileTap={{ scale: 0.97 }}
        transition={springs.touch}
        className="flex-1 ios-card p-3.5 flex items-center gap-3"
      >
        <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-success" />
        </div>
        <div className="text-left min-w-0">
          <p className="text-xs font-semibold truncate">
            {completedToday ? 'View Routine' : 'Complete Routine'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {completedToday ? 'Done for today' : 'Start your day'}
          </p>
        </div>
      </motion.button>

      <motion.button
        onClick={() => onNavigate('workouts')}
        whileTap={{ scale: 0.97 }}
        transition={springs.touch}
        className="flex-1 ios-card p-3.5 flex items-center gap-3"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Dumbbell className="h-4 w-4 text-primary" />
        </div>
        <div className="text-left min-w-0">
          <p className="text-xs font-semibold truncate">Start Workout</p>
          <p className="text-[10px] text-muted-foreground">Log a session</p>
        </div>
      </motion.button>
    </div>
  )
}
