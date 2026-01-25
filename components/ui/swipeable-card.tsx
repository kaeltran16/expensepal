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
import { motion, PanInfo, useAnimation, useMotionValue, useTransform, animate } from 'framer-motion'
import { AlertTriangle, Trash2, Heart } from 'lucide-react'
import { ReactNode, useRef, useState } from 'react'

interface SwipeableCardProps {
  children: ReactNode
  onDelete: () => void
  onFavorite?: () => void
  disabled?: boolean
  className?: string
  confirmTitle?: string
  confirmMessage?: string
}

const SWIPE_THRESHOLD = 60
const ACTION_BUTTON_WIDTH = 70

export function SwipeableCard({
  children,
  onDelete,
  onFavorite,
  disabled = false,
  className = '',
  confirmTitle = 'Delete Item?',
  confirmMessage = 'Are you sure you want to delete this item? This action cannot be undone.',
}: SwipeableCardProps) {
  const x = useMotionValue(0)
  const deleteIconControls = useAnimation()
  const favoriteIconControls = useAnimation()
  const cardControls = useAnimation()
  const isDragging = useRef(false)
  const hasTriggeredDeleteHaptic = useRef(false)
  const hasTriggeredFavoriteHaptic = useRef(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Delete background opacity (left swipe)
  const deleteBackgroundOpacity = useTransform(
    x,
    [-SWIPE_THRESHOLD, -30, 0],
    [1, 0.7, 0]
  )

  // Favorite background opacity (right swipe)
  const favoriteBackgroundOpacity = useTransform(
    x,
    [0, 30, SWIPE_THRESHOLD],
    [0, 0.7, 1]
  )

  // Delete icon scale
  const deleteIconScale = useTransform(
    x,
    [-SWIPE_THRESHOLD, -30, 0],
    [1.2, 1, 0.7]
  )

  // Favorite icon scale
  const favoriteIconScale = useTransform(
    x,
    [0, 30, SWIPE_THRESHOLD],
    [0.7, 1, 1.2]
  )

  const handleDragStart = () => {
    if (disabled) return
    isDragging.current = true
    hasTriggeredDeleteHaptic.current = false
    hasTriggeredFavoriteHaptic.current = false
  }

  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return

    // Left swipe (delete) haptic
    if (info.offset.x <= -SWIPE_THRESHOLD && !hasTriggeredDeleteHaptic.current) {
      hapticFeedback('medium')
      hasTriggeredDeleteHaptic.current = true
      deleteIconControls.start({
        scale: [1, 1.3, 1],
        transition: { duration: 0.3, ease: 'easeOut' }
      })
    }

    // Right swipe (favorite) haptic
    if (onFavorite && info.offset.x >= SWIPE_THRESHOLD && !hasTriggeredFavoriteHaptic.current) {
      hapticFeedback('medium')
      hasTriggeredFavoriteHaptic.current = true
      favoriteIconControls.start({
        scale: [1, 1.3, 1],
        transition: { duration: 0.3, ease: 'easeOut' }
      })
    }

    // Reset haptic flags if user drags back
    if (info.offset.x > -SWIPE_THRESHOLD && hasTriggeredDeleteHaptic.current) {
      hasTriggeredDeleteHaptic.current = false
    }
    if (info.offset.x < SWIPE_THRESHOLD && hasTriggeredFavoriteHaptic.current) {
      hasTriggeredFavoriteHaptic.current = false
    }
  }

  const snapBack = () => {
    // Animate the x motion value back to 0 with spring physics
    animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 })
  }

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return
    isDragging.current = false

    // Left swipe - delete
    if (info.offset.x <= -SWIPE_THRESHOLD) {
      hapticFeedback('medium')
      setShowDeleteDialog(true)
      snapBack()
    }
    // Right swipe - favorite
    else if (onFavorite && info.offset.x >= SWIPE_THRESHOLD) {
      hapticFeedback('medium')

      // Heart pulse animation
      favoriteIconControls.start({
        scale: [1, 1.5, 1],
        transition: { duration: 0.4, ease: 'easeOut' }
      })

      onFavorite()
      snapBack()
    }
    else {
      snapBack()
    }
  }

  const handleConfirmDelete = () => {
    hapticFeedback('heavy')
    setShowDeleteDialog(false)

    deleteIconControls.start({
      rotate: [0, -15, 15, -10, 10, 0],
      scale: [1, 1.3, 1.3, 1.2, 1.1, 1],
      transition: {
        duration: 0.5,
        ease: [0.34, 1.56, 0.64, 1]
      }
    })

    cardControls.start({
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1]
      }
    })

    setTimeout(() => {
      onDelete()
    }, 300)
  }

  return (
    <motion.div
      animate={cardControls}
      className={`relative overflow-hidden rounded-xl ${className}`}
    >
      {/* Favorite background (right swipe) - Pink */}
      {onFavorite && (
        <motion.div
          className="absolute inset-y-0 left-0 flex items-center justify-center rounded-l-xl"
          style={{
            background: 'linear-gradient(135deg, rgb(236, 72, 153), rgb(244, 63, 94))',
            opacity: favoriteBackgroundOpacity,
            width: ACTION_BUTTON_WIDTH,
          }}
        >
          <motion.div
            style={{ scale: favoriteIconScale }}
            animate={favoriteIconControls}
          >
            <Heart className="w-5 h-5 text-white drop-shadow-sm" />
          </motion.div>
        </motion.div>
      )}

      {/* Delete background (left swipe) - Red */}
      <motion.div
        className="absolute inset-y-0 right-0 flex items-center justify-center rounded-r-xl"
        style={{
          backgroundColor: 'rgb(239 68 68)',
          opacity: deleteBackgroundOpacity,
          width: ACTION_BUTTON_WIDTH,
        }}
        data-testid="delete-action"
      >
        <motion.div
          style={{ scale: deleteIconScale }}
          animate={deleteIconControls}
        >
          <Trash2 className="w-5 h-5 text-white drop-shadow-sm" />
        </motion.div>
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        drag={disabled ? false : 'x'}
        dragConstraints={{
          left: -ACTION_BUTTON_WIDTH,
          right: onFavorite ? ACTION_BUTTON_WIDTH : 0
        }}
        dragElastic={{ left: 0.15, right: onFavorite ? 0.15 : 0 }}
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
