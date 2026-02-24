'use client'

import { motion } from 'motion/react'
import { useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import { useReducedMotion } from '@/hooks/use-motion'
import { springs } from '@/lib/motion-system'

interface AnimatedTextProps {
  children: string
  className?: string
  /** Split mode: 'words' staggers per word, 'characters' per char */
  by?: 'words' | 'characters'
  /** Stagger delay between units in seconds */
  stagger?: number
  /** Only animate once */
  once?: boolean
}

export function AnimatedText({
  children,
  className,
  by = 'words',
  stagger = 0.04,
  once = true,
}: AnimatedTextProps) {
  const reducedMotion = useReducedMotion()
  const { ref, inView } = useInView({ triggerOnce: once, threshold: 0.1 })

  const units = useMemo(() => {
    if (by === 'characters') return children.split('')
    return children.split(' ')
  }, [children, by])

  if (reducedMotion) {
    return <span ref={ref} className={className}>{children}</span>
  }

  return (
    <span ref={ref} className={className} style={{ display: 'inline-flex', flexWrap: 'wrap' }}>
      {units.map((unit, i) => (
        <motion.span
          key={`${unit}-${i}`}
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ ...springs.ios, delay: i * stagger }}
          style={{ display: 'inline-block' }}
        >
          {unit}
          {by === 'words' && i < units.length - 1 ? '\u00A0' : ''}
        </motion.span>
      ))}
    </span>
  )
}
