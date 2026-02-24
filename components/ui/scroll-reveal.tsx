'use client'

import { motion, useScroll, useTransform } from 'motion/react'
import { useInView } from 'react-intersection-observer'
import { type ReactNode } from 'react'
import { useReducedMotion } from '@/hooks/use-motion'
import { springs, choreography, reducedChoreography } from '@/lib/motion-system'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  /** Which choreography variant to use */
  variant?: 'reveal' | 'revealSubtle'
  /** Delay in seconds */
  delay?: number
  /** Viewport threshold (0-1) */
  threshold?: number
  /** Only animate once */
  once?: boolean
}

export function ScrollReveal({
  children,
  className,
  variant = 'reveal',
  delay = 0,
  threshold = 0.15,
  once = true,
}: ScrollRevealProps) {
  const reducedMotion = useReducedMotion()
  const { ref, inView } = useInView({ triggerOnce: once, threshold })

  const v = reducedMotion ? reducedChoreography[variant] : choreography[variant]
  const transition = reducedMotion
    ? { duration: 0.1 }
    : { ...springs.cinematic, delay }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={v.initial}
      animate={inView ? v.animate : v.initial}
      transition={transition}
    >
      {children}
    </motion.div>
  )
}

// =============================================================================
// PARALLAX LAYER
// =============================================================================

interface ParallaxLayerProps {
  children: ReactNode
  className?: string
  /** Speed factor: 0 = static, 1 = normal scroll, < 1 = slower (parallax) */
  speed?: number
}

export function ParallaxLayer({
  children,
  className,
  speed = 0.8,
}: ParallaxLayerProps) {
  const reducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, (v) => v * (1 - speed) * -1)

  if (reducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div className={className} style={{ y }}>
      {children}
    </motion.div>
  )
}
