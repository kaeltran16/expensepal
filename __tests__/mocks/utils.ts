/**
 * Utility Function Mocks
 *
 * Mocks for common utility functions used throughout the application.
 */

import { vi } from 'vitest'

// Mock haptic feedback
export const hapticFeedbackMock = vi.fn()

// Mock format currency - return predictable format for testing
export const formatCurrencyMock = vi.fn((amount: number, _currency?: string) => {
  return amount.toLocaleString('vi-VN')
})

// Mock format date - return predictable format for testing
export const formatDateMock = vi.fn((date: string | Date) => {
  const d = new Date(date)
  return d.toLocaleDateString('vi-VN')
})

// Mock cn (class name utility) - just join classes
export const cnMock = vi.fn((...inputs: unknown[]) => {
  return inputs
    .filter(Boolean)
    .map((input) => {
      if (typeof input === 'string') return input
      if (Array.isArray(input)) return input.filter(Boolean).join(' ')
      if (typeof input === 'object' && input !== null) {
        return Object.entries(input)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key)
          .join(' ')
      }
      return ''
    })
    .join(' ')
    .trim()
})

// Mock getCategoryColor
export const getCategoryColorMock = vi.fn((category: string) => {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    Food: { bg: 'bg-orange-100', border: 'border-l-orange-500', text: 'text-orange-700' },
    Transport: { bg: 'bg-blue-100', border: 'border-l-blue-500', text: 'text-blue-700' },
    Shopping: { bg: 'bg-pink-100', border: 'border-l-pink-500', text: 'text-pink-700' },
    Entertainment: { bg: 'bg-purple-100', border: 'border-l-purple-500', text: 'text-purple-700' },
    Bills: { bg: 'bg-yellow-100', border: 'border-l-yellow-500', text: 'text-yellow-700' },
    Health: { bg: 'bg-red-100', border: 'border-l-red-500', text: 'text-red-700' },
    Other: { bg: 'bg-gray-100', border: 'border-l-gray-500', text: 'text-gray-700' },
  }
  return colors[category] || colors.Other
})

// Mock the lib/utils module
vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual('@/lib/utils')
  return {
    ...actual,
    hapticFeedback: hapticFeedbackMock,
    formatCurrency: formatCurrencyMock,
    formatDate: formatDateMock,
    cn: cnMock,
    getCategoryColor: getCategoryColorMock,
  }
})

// ============================================================
// Date/Time Test Utilities
// ============================================================

/**
 * Create a mock date at a specific time
 */
export function createMockDate(dateString: string): Date {
  return new Date(dateString)
}

/**
 * Get date string for N days ago
 */
export function daysAgo(n: number): string {
  const date = new Date()
  date.setDate(date.getDate() - n)
  return date.toISOString()
}

/**
 * Get date string for N days from now
 */
export function daysFromNow(n: number): string {
  const date = new Date()
  date.setDate(date.getDate() + n)
  return date.toISOString()
}

/**
 * Get start of current month
 */
export function startOfMonth(): string {
  const date = new Date()
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

/**
 * Get end of current month
 */
export function endOfMonth(): string {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  date.setDate(0)
  date.setHours(23, 59, 59, 999)
  return date.toISOString()
}

// ============================================================
// Number/Currency Test Utilities
// ============================================================

/**
 * Generate a random amount within a range
 */
export function randomAmount(min = 10000, max = 1000000): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Generate a list of amounts that sum to a target
 */
export function generateAmounts(count: number, total: number): number[] {
  const amounts: number[] = []
  let remaining = total

  for (let i = 0; i < count - 1; i++) {
    const portion = Math.floor(remaining / (count - i))
    const variance = Math.floor(portion * 0.5)
    const amount = portion + Math.floor(Math.random() * variance * 2) - variance
    amounts.push(Math.max(1, amount))
    remaining -= amounts[i]
  }

  amounts.push(Math.max(1, remaining))
  return amounts
}

