/**
 * Sonner Toast Mocks
 *
 * Provides mock implementations for toast notifications from the sonner library.
 */

import { vi } from 'vitest'

// Track toast calls for assertion
export const toastCalls: Array<{
  type: 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading' | 'promise' | 'dismiss'
  message?: string
  options?: Record<string, unknown>
}> = []

// Reset toast call history
export function resetToastCalls(): void {
  toastCalls.length = 0
}

// Get the last toast call
export function getLastToast() {
  return toastCalls[toastCalls.length - 1]
}

// Get all toasts of a specific type
export function getToastsByType(type: typeof toastCalls[number]['type']) {
  return toastCalls.filter((t) => t.type === type)
}

// Mock toast function
export const toastMock = Object.assign(
  vi.fn((message: string, options?: Record<string, unknown>) => {
    toastCalls.push({ type: 'default', message, options })
    return 'toast-id'
  }),
  {
    success: vi.fn((message: string, options?: Record<string, unknown>) => {
      toastCalls.push({ type: 'success', message, options })
      return 'toast-id'
    }),
    error: vi.fn((message: string, options?: Record<string, unknown>) => {
      toastCalls.push({ type: 'error', message, options })
      return 'toast-id'
    }),
    warning: vi.fn((message: string, options?: Record<string, unknown>) => {
      toastCalls.push({ type: 'warning', message, options })
      return 'toast-id'
    }),
    info: vi.fn((message: string, options?: Record<string, unknown>) => {
      toastCalls.push({ type: 'info', message, options })
      return 'toast-id'
    }),
    loading: vi.fn((message: string, options?: Record<string, unknown>) => {
      toastCalls.push({ type: 'loading', message, options })
      return 'toast-id'
    }),
    promise: vi.fn(
      <T>(
        promise: Promise<T>,
        options: {
          loading: string
          success: string | ((data: T) => string)
          error: string | ((error: unknown) => string)
        }
      ) => {
        toastCalls.push({ type: 'promise', options: options as unknown as Record<string, unknown> })
        return promise
      }
    ),
    dismiss: vi.fn((toastId?: string) => {
      toastCalls.push({ type: 'dismiss', options: { toastId } })
    }),
    custom: vi.fn(),
    message: vi.fn((message: string, options?: Record<string, unknown>) => {
      toastCalls.push({ type: 'default', message, options })
      return 'toast-id'
    }),
  }
)

// Mock the sonner module
vi.mock('sonner', () => ({
  toast: toastMock,
  Toaster: () => null,
}))

// Export utilities
export { toastMock as toast }
