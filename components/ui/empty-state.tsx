'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ReactNode } from 'react'

export interface EmptyStateAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
  icon?: ReactNode
  disabled?: boolean
  loading?: boolean
}

export interface EmptyStateProps {
  /**
   * Icon to display (emoji string or React component)
   */
  icon: string | ReactNode

  /**
   * Main title text
   */
  title: string

  /**
   * Description/subtitle text
   */
  description: string

  /**
   * Primary action button
   */
  action?: EmptyStateAction

  /**
   * Secondary action button
   */
  secondaryAction?: EmptyStateAction

  /**
   * Custom animation variant
   * @default 'default'
   */
  animationVariant?: 'default' | 'rotate' | 'bounce' | 'pulse'

  /**
   * Size variant
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg'
}

const iconAnimationVariants = {
  default: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: { type: 'spring', bounce: 0.5, duration: 0.8 },
  },
  rotate: {
    initial: { scale: 0.8, rotate: -10, opacity: 0 },
    animate: { scale: 1, rotate: 0, opacity: 1 },
    transition: { type: 'spring', bounce: 0.5 },
  },
  bounce: {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { type: 'spring', bounce: 0.6, duration: 0.8 },
  },
  pulse: {
    initial: { scale: 0.9, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: {
      scale: {
        type: 'spring',
        bounce: 0.5,
        duration: 0.8,
      },
      opacity: {
        duration: 0.4,
      },
    },
  },
}

const sizeClasses = {
  sm: {
    container: 'py-8 px-4',
    icon: 'text-4xl sm:text-5xl mb-3',
    title: 'text-sm sm:text-base font-semibold mb-1',
    description: 'text-xs sm:text-sm mb-4 max-w-xs',
    buttonContainer: 'gap-2 max-w-xs',
  },
  default: {
    container: 'py-12 px-4',
    icon: 'text-5xl sm:text-6xl md:text-7xl mb-4',
    title: 'text-base sm:text-lg font-semibold mb-2',
    description: 'text-sm sm:text-base mb-6 max-w-sm',
    buttonContainer: 'gap-3 max-w-xs',
  },
  lg: {
    container: 'py-16 px-4',
    icon: 'text-6xl sm:text-7xl md:text-8xl mb-4',
    title: 'text-base sm:text-lg md:text-xl font-semibold mb-2',
    description: 'text-sm sm:text-base mb-8 max-w-sm',
    buttonContainer: 'gap-3 max-w-xs',
  },
}

/**
 * EmptyState Component
 *
 * A standardized empty state component with animations and optional actions.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon="💸"
 *   title="No expenses yet"
 *   description="Start tracking your spending by adding an expense"
 *   action={{
 *     label: "Add Expense",
 *     onClick: () => setShowForm(true),
 *     icon: <Plus className="h-5 w-5" />
 *   }}
 *   secondaryAction={{
 *     label: "Import from Email",
 *     onClick: handleSync,
 *     variant: "outline"
 *   }}
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  animationVariant = 'default',
  size = 'default',
}: EmptyStateProps) {
  const animation = iconAnimationVariants[animationVariant]
  const sizes = sizeClasses[size]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`text-center ${sizes.container}`}
    >
      {/* Animated Icon */}
      <motion.div
        initial={animation.initial}
        animate={animation.animate}
        transition={animation.transition}
        className={sizes.icon}
      >
        {typeof icon === 'string' ? icon : icon}
      </motion.div>

      {/* Title */}
      <h3 className={`ios-headline ${sizes.title}`}>
        {title}
      </h3>

      {/* Description */}
      <p className={`ios-caption text-muted-foreground ${sizes.description} mx-auto`}>
        {description}
      </p>

      {/* Action Buttons */}
      {(action || secondaryAction) && (
        <div className={`flex flex-col sm:flex-row justify-center ${sizes.buttonContainer} mx-auto`}>
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              size="lg"
              disabled={action.disabled || action.loading}
              className="gap-2 ripple-effect min-h-touch text-sm sm:text-base shadow-lg"
            >
              {action.loading ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                action.icon
              )}
              {action.label}
            </Button>
          )}

          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant={secondaryAction.variant || 'outline'}
              size="lg"
              disabled={secondaryAction.disabled || secondaryAction.loading}
              className="gap-2 ripple-effect min-h-touch text-sm sm:text-base"
            >
              {secondaryAction.loading ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                secondaryAction.icon
              )}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  )
}
