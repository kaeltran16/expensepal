'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { ReactNode } from 'react'

export interface ErrorStateProps {
  /**
   * Error title
   * @default "Something went wrong"
   */
  title?: string

  /**
   * Error description/message
   * @default "Please try again later"
   */
  description?: string

  /**
   * Optional error details (for debugging)
   */
  error?: Error | string

  /**
   * Retry callback
   */
  onRetry?: () => void

  /**
   * Custom action button
   */
  customAction?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }

  /**
   * Show error details (for development)
   * @default false
   */
  showDetails?: boolean

  /**
   * Size variant
   * @default 'default'
   */
  size?: 'sm' | 'default' | 'lg'
}

const sizeClasses = {
  sm: {
    container: 'py-8 px-4',
    icon: 'h-12 w-12',
    title: 'text-sm font-semibold mb-1',
    description: 'text-xs mb-4',
  },
  default: {
    container: 'py-12 px-4',
    icon: 'h-16 w-16',
    title: 'text-base font-semibold mb-2',
    description: 'text-sm mb-6',
  },
  lg: {
    container: 'py-16 px-4',
    icon: 'h-20 w-20',
    title: 'text-lg font-semibold mb-2',
    description: 'text-base mb-8',
  },
}

/**
 * ErrorState Component
 *
 * A standardized error state component with retry functionality
 *
 * @example
 * ```tsx
 * <ErrorState
 *   title="Failed to load expenses"
 *   description="Unable to fetch your expense data"
 *   error={error}
 *   onRetry={() => refetch()}
 *   showDetails={process.env.NODE_ENV === 'development'}
 * />
 * ```
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again later',
  error,
  onRetry,
  customAction,
  showDetails = false,
  size = 'default',
}: ErrorStateProps) {
  const sizes = sizeClasses[size]

  const errorMessage = error instanceof Error ? error.message : error

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`text-center ${sizes.container}`}
    >
      {/* Error Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5, duration: 0.6 }}
        className="flex justify-center mb-4"
      >
        <div className="w-16 h-16 rounded-full bg-destructive/10 dark:bg-destructive/20 flex items-center justify-center">
          <AlertTriangle className={`${sizes.icon} text-destructive`} />
        </div>
      </motion.div>

      {/* Title */}
      <h3 className={`ios-headline ${sizes.title}`}>{title}</h3>

      {/* Description */}
      <p className={`ios-caption text-muted-foreground ${sizes.description} max-w-sm mx-auto`}>
        {description}
      </p>

      {/* Error Details (Development Only) */}
      {showDetails && errorMessage && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 max-w-md mx-auto"
        >
          <div className="ios-card bg-destructive/5 dark:bg-destructive/10 p-3 rounded-lg">
            <code className="text-xs text-destructive break-all">{errorMessage}</code>
          </div>
        </motion.div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xs mx-auto">
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="default"
            size="lg"
            className="gap-2 ripple-effect min-h-touch shadow-lg"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}

        {customAction && (
          <Button
            onClick={customAction.onClick}
            variant="outline"
            size="lg"
            className="gap-2 ripple-effect min-h-touch"
          >
            {customAction.icon}
            {customAction.label}
          </Button>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Compact error message for inline errors
 */
export function InlineError({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="ios-card bg-destructive/5 dark:bg-destructive/10 p-4 rounded-lg flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
      <p className="text-sm text-destructive flex-1">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="ghost" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  )
}
