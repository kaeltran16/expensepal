'use client'

import { motion, useMotionValue, useSpring } from 'motion/react'
import { type ReactNode, useCallback } from 'react'
import { useReducedMotion } from '@/hooks/use-motion'
import { springs } from '@/lib/motion-system'

interface TiltCardProps {
  children: ReactNode
  className?: string
  /** Max tilt angle in degrees */
  maxTilt?: number
  /** Scale on press */
  pressScale?: number
}

export function TiltCard({
  children,
  className,
  maxTilt = 3,
  pressScale = 0.98,
}: TiltCardProps) {
  const reducedMotion = useReducedMotion()
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const scale = useMotionValue(1)

  const smoothRotateX = useSpring(rotateX, { damping: 20, stiffness: 300 })
  const smoothRotateY = useSpring(rotateY, { damping: 20, stiffness: 300 })
  const smoothScale = useSpring(scale, springs.touch)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reducedMotion) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5

      rotateX.set(-y * maxTilt * 2)
      rotateY.set(x * maxTilt * 2)
      scale.set(pressScale)
    },
    [reducedMotion, maxTilt, pressScale, rotateX, rotateY, scale]
  )

  const handlePointerUp = useCallback(() => {
    rotateX.set(0)
    rotateY.set(0)
    scale.set(1)
  }, [rotateX, rotateY, scale])

  if (reducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      style={{
        perspective: 800,
        rotateX: smoothRotateX,
        rotateY: smoothRotateY,
        scale: smoothScale,
        transformStyle: 'preserve-3d',
        WebkitTapHighlightColor: 'transparent',
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {children}
    </motion.div>
  )
}
