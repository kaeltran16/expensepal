'use client'

import { motion, useMotionValue, useTransform, PanInfo, useAnimation } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { ReactNode, useRef } from 'react'
import { hapticFeedback } from '@/lib/utils'

interface SwipeableCardProps {
  children: ReactNode
  onDelete: () => void
  disabled?: boolean
  className?: string
}

const SWIPE_THRESHOLD = -60 // Reduced to -60 for much easier triggering
const DELETE_BUTTON_WIDTH = 70

export function SwipeableCard({
  children,
  onDelete,
  disabled = false,
  className = '',
}: SwipeableCardProps) {
  const x = useMotionValue(0)
  const iconControls = useAnimation()
  const isDragging = useRef(false)
  const hasTriggeredHaptic = useRef(false)

  // Background opacity based on swipe distance (fade in gradually)
  const backgroundOpacity = useTransform(
    x,
    [SWIPE_THRESHOLD, -30, 0],
    [1, 0.7, 0]
  )

  // Icon scale animation based on swipe distance
  const iconScale = useTransform(
    x,
    [SWIPE_THRESHOLD, -30, 0],
    [1.2, 1, 0.7]
  )

  // Icon rotation animation
  const iconRotate = useTransform(
    x,
    [SWIPE_THRESHOLD, 0],
    [8, 0]
  )

  const handleDragStart = () => {
    if (disabled) return
    isDragging.current = true
    hasTriggeredHaptic.current = false
  }

  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return

    // Only allow left swipe
    if (info.offset.x > 0) {
      x.set(0)
      return
    }

    // Trigger haptic when crossing threshold
    if (info.offset.x <= SWIPE_THRESHOLD && !hasTriggeredHaptic.current) {
      hapticFeedback('medium')
      hasTriggeredHaptic.current = true
      // Pulse animation for the icon
      iconControls.start({
        scale: [1, 1.3, 1],
        transition: { duration: 0.3, ease: 'easeOut' }
      })
    }

    // Reset haptic flag if user drags back
    if (info.offset.x > SWIPE_THRESHOLD && hasTriggeredHaptic.current) {
      hasTriggeredHaptic.current = false
    }
  }

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return
    isDragging.current = false

    // If swiped past threshold, trigger delete
    if (info.offset.x <= SWIPE_THRESHOLD) {
      hapticFeedback('heavy')
      // Animate fully off screen with bounce effect, then delete
      iconControls.start({
        rotate: [0, -10, 10, 0],
        scale: [1, 1.2, 1],
        transition: { duration: 0.2 }
      })
      setTimeout(() => {
        x.set(-window.innerWidth)
      }, 100)
      setTimeout(() => {
        onDelete()
      }, 300)
    } else {
      // Snap back to original position with spring animation
      x.set(0)
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      {/* Delete background - compact red area with icon */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-center rounded-r-xl"
        style={{
          backgroundColor: 'rgb(239 68 68)',
          opacity: backgroundOpacity,
          width: DELETE_BUTTON_WIDTH,
        }}
      >
        <motion.div
          style={{
            scale: iconScale,
            rotate: iconRotate,
          }}
          animate={iconControls}
        >
          <Trash2 className="w-5 h-5 text-white drop-shadow-sm" />
        </motion.div>
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        drag={disabled ? false : 'x'}
        dragConstraints={{ left: -DELETE_BUTTON_WIDTH, right: 0 }}
        dragElastic={{ left: 0.15, right: 0 }}
        dragMomentum={false}
        dragTransition={{ bounceStiffness: 700, bounceDamping: 35 }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10 bg-background"
        whileTap={{ scale: 0.98 }}
      >
        {children}
      </motion.div>
    </div>
  )
}
