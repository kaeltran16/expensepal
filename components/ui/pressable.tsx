'use client'

import { motion } from 'motion/react'
import { type ReactNode, forwardRef } from 'react'
import { useReducedMotion } from '@/hooks/use-motion'
import { springs } from '@/lib/motion-system'

interface PressableProps {
  children: ReactNode
  className?: string
  disabled?: boolean
  scale?: number
  onClick?: () => void
}

/**
 * Consistent iOS press feedback wrapper.
 * Scales to 0.97 on touchstart, springs back on release.
 * Respects prefers-reduced-motion.
 */
export const Pressable = forwardRef<HTMLDivElement, PressableProps>(
  function Pressable({ children, className, disabled, scale = 0.97, onClick }, ref) {
    const reducedMotion = useReducedMotion()

    if (reducedMotion || disabled) {
      return (
        <div ref={ref} className={className} onClick={onClick}>
          {children}
        </div>
      )
    }

    return (
      <motion.div
        ref={ref}
        className={className}
        whileTap={{ scale }}
        transition={springs.touch}
        onClick={onClick}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {children}
      </motion.div>
    )
  }
)
