'use client'

import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode } from 'react'
import { useReducedMotion } from '@/hooks/use-motion'
import { springs, durations } from '@/lib/motion-system'

interface ViewTransitionProps {
  activeView: string
  children: ReactNode
}

export function ViewTransition({ activeView, children }: ViewTransitionProps) {
  const reducedMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeView}
        initial={{ opacity: 0, y: reducedMotion ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={
          reducedMotion
            ? { duration: durations.micro }
            : { ...springs.ios, opacity: { duration: 0.15 } }
        }
        data-view={activeView}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
