'use client'

import React, { Component, ReactNode } from 'react'
import { ErrorState } from '@/components/ui/error-state'

interface Props {
  children: ReactNode
  /**
   * Fallback UI to show on error
   */
  fallback?: ReactNode
  /**
   * Callback when error occurs
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /**
   * Custom error title
   */
  errorTitle?: string
  /**
   * Custom error description
   */
  errorDescription?: string
  /**
   * Show error details in development
   * @default true in development, false in production
   */
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary Component
 *
 * React Error Boundary that catches JavaScript errors anywhere in the child
 * component tree and displays a fallback UI instead of crashing the whole app.
 *
 * @example
 * ```tsx
 * // Wrap individual views
 * <ErrorBoundary
 *   errorTitle="Failed to load expenses"
 *   errorDescription="Something went wrong while loading your expenses"
 * >
 *   <ExpensesView />
 * </ErrorBoundary>
 *
 * // With custom error handling
 * <ErrorBoundary
 *   onError={(error, errorInfo) => {
 *     // Log to error tracking service (e.g., Sentry)
 *     console.error('Error caught by boundary:', error, errorInfo)
 *   }}
 * >
 *   <ComplexComponent />
 * </ErrorBoundary>
 *
 * // With custom fallback UI
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // In production, you might want to log to an error tracking service:
    // logErrorToService(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      const showDetails =
        this.props.showDetails !== undefined
          ? this.props.showDetails
          : process.env.NODE_ENV === 'development'

      return (
        <ErrorState
          title={this.props.errorTitle || 'Something went wrong'}
          description={
            this.props.errorDescription ||
            'An unexpected error occurred. Please try refreshing the page.'
          }
          error={this.state.error || undefined}
          onRetry={this.handleReset}
          showDetails={showDetails}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Hook-based error boundary alternative
 * Use this when you need to catch errors in functional components
 *
 * Note: This doesn't replace ErrorBoundary - React error boundaries
 * must be class components. This is for manual error handling.
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  const handleError = React.useCallback((error: Error) => {
    console.error('Error handled:', error)
    setError(error)
  }, [])

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  return { error, handleError, resetError }
}
