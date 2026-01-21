'use client'

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { hapticFeedback } from '@/lib/utils'
import { motion, PanInfo, useAnimation, useMotionValue, useTransform } from 'framer-motion'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { ReactNode, useRef, useState } from 'react'

interface SwipeableCardProps {
  children: ReactNode
  onDelete: () => void
  disabled?: boolean
  className?: string
  confirmTitle?: string
  confirmMessage?: string
}

const SWIPE_THRESHOLD = -60 // Reduced to -60 for much easier triggering
const DELETE_BUTTON_WIDTH = 70

export function SwipeableCard({
  children,
  onDelete,
  disabled = false,
  className = '',
  confirmTitle = 'Delete Item?',
  confirmMessage = 'Are you sure you want to delete this item? This action cannot be undone.',
}: SwipeableCardProps) {
  const x = useMotionValue(0)
  const iconControls = useAnimation()
  const cardControls = useAnimation()
  const isDragging = useRef(false)
  const hasTriggeredHaptic = useRef(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

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

    // If swiped past threshold, show confirmation dialog
    if (info.offset.x <= SWIPE_THRESHOLD) {
      hapticFeedback('medium')
      setShowDeleteDialog(true)
      // Snap back to show the dialog
      x.set(0)
    } else {
      // Snap back to original position with spring animation
      x.set(0)
    }
  }

  const handleConfirmDelete = () => {
    hapticFeedback('heavy')
    setShowDeleteDialog(false)

    // Enhanced icon animation with more bounce
    iconControls.start({
      rotate: [0, -15, 15, -10, 10, 0],
      scale: [1, 1.3, 1.3, 1.2, 1.1, 1],
      transition: {
        duration: 0.5,
        ease: [0.34, 1.56, 0.64, 1] // Bounce easing
      }
    })

    // Card fade and scale animation
    cardControls.start({
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }
    })

    // Trigger delete immediately after the internal animation starts
    // The parent component will handle the actual removal and layout animation
    setTimeout(() => {
      onDelete()
    }, 300)
  }

  return (
    <motion.div
      animate={cardControls}
      className={`relative overflow-hidden rounded-xl ${className}`}
    >
      {/* Delete background - compact red area with icon */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-center rounded-r-xl"
        style={{
          backgroundColor: 'rgb(239 68 68)',
          opacity: backgroundOpacity,
          width: DELETE_BUTTON_WIDTH,
        }}
        data-testid="delete-action"
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
        animate={cardControls}
        className="relative z-10 bg-background"
        whileTap={{ scale: 0.98 }}
      >
        {children}
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="ios-alert">
          <AlertDialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-destructive/20 to-destructive/30 border-4 border-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center ios-title text-xl">
              {confirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center ios-body text-muted-foreground">
              {confirmMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="w-full touch-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 ios-press order-1 h-12 font-semibold"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </AlertDialogAction>
            <AlertDialogCancel
              onClick={() => hapticFeedback('light')}
              className="w-full touch-lg ios-press order-2 mt-0 h-12"
            >
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
