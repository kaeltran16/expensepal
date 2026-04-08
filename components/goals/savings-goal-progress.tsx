'use client'

import { formatCurrency } from '@/lib/utils'
import { motion } from 'motion/react'
import { springs } from '@/lib/motion-system'
import { useInView } from 'react-intersection-observer'

interface SavingsGoalProgressProps {
  progress: number
  remaining: number
  isCompleted: boolean
}

export function SavingsGoalProgress({
  progress,
  remaining,
  isCompleted,
}: SavingsGoalProgressProps) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <div className="space-y-2" ref={ref}>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={inView ? { width: `${Math.min(progress, 100)}%` } : { width: 0 }}
          transition={springs.ios}
          className={`h-full rounded-full ${
            isCompleted ? 'bg-green-500' : 'bg-primary'
          }`}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="ios-caption text-muted-foreground">
          {progress.toFixed(0)}% complete
        </span>
        <span className={`ios-caption font-medium ${isCompleted ? 'text-green-500' : ''}`}>
          {isCompleted ? 'Goal reached! 🎉' : `${formatCurrency(remaining, 'VND')} to go`}
        </span>
      </div>
    </div>
  )
}
