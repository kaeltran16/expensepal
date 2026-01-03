/**
 * Detect Patterns Tests
 *
 * Tests for weekend/weekday pattern detection and top spending category analysis.
 */

import type { Expense } from '@/lib/supabase'
import { describe, expect, it, vi } from 'vitest'

import {
  detectWeekendWeekdayPatterns,
  findTopSpendingCategory,
} from '@/lib/analytics/detect-patterns'
import { createMockExpense } from '../../mocks/supabase'

// Mock currency formatter
const mockFormatCurrency = vi.fn((amount: number, _currency: string) => {
  return `${amount.toLocaleString()} VND`
})

// Helper to create expense on a specific day of week
function createExpenseOnDayOfWeek(
  dayOfWeek: number, // 0 = Sunday, 6 = Saturday
  daysBack: number = 0,
  overrides: Partial<Expense> = {}
): Expense {
  const now = new Date()
  now.setDate(now.getDate() - daysBack)

  // Find the closest date that matches the desired day of week
  const currentDay = now.getDay()
  const diff = (currentDay - dayOfWeek + 7) % 7
  now.setDate(now.getDate() - diff)

  return createMockExpense({
    transaction_date: now.toISOString().slice(0, 10),
    ...overrides,
  })
}

// Helper to create expense N days ago
function createExpenseWithDate(
  daysAgo: number,
  overrides: Partial<Expense> = {}
): Expense {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return createMockExpense({
    transaction_date: date.toISOString().slice(0, 10),
    ...overrides,
  })
}

describe('detectWeekendWeekdayPatterns', () => {
  describe('basic functionality', () => {
    it('should return empty array for empty expenses', () => {
      const result = detectWeekendWeekdayPatterns([], mockFormatCurrency)
      expect(result).toEqual([])
    })

    it('should return empty array for single expense', () => {
      const expenses = [createExpenseWithDate(1)]
      const result = detectWeekendWeekdayPatterns(expenses, mockFormatCurrency)
      expect(result).toEqual([])
    })

    it('should filter out expenses older than 30 days', () => {
      const expenses = [
        // Only old expenses
        createExpenseWithDate(35, { category: 'Food', amount: 100000 }),
        createExpenseWithDate(40, { category: 'Food', amount: 200000 }),
      ]
      const result = detectWeekendWeekdayPatterns(expenses, mockFormatCurrency)
      expect(result).toEqual([])
    })
  })

  describe('weekend higher spending detection', () => {
    it('should detect when weekend spending is >30% higher', () => {
      const expenses = [
        // Saturday spending (higher)
        createExpenseOnDayOfWeek(6, 0, { category: 'Food', amount: 200000 }),
        createExpenseOnDayOfWeek(6, 7, { category: 'Food', amount: 180000 }),
        // Sunday spending (higher)
        createExpenseOnDayOfWeek(0, 1, { category: 'Food', amount: 220000 }),
        createExpenseOnDayOfWeek(0, 8, { category: 'Food', amount: 200000 }),
        // Weekday spending (lower)
        createExpenseOnDayOfWeek(1, 2, { category: 'Food', amount: 100000 }),
        createExpenseOnDayOfWeek(2, 3, { category: 'Food', amount: 110000 }),
        createExpenseOnDayOfWeek(3, 4, { category: 'Food', amount: 90000 }),
        createExpenseOnDayOfWeek(4, 5, { category: 'Food', amount: 100000 }),
      ]

      const result = detectWeekendWeekdayPatterns(expenses, mockFormatCurrency)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'pattern',
        category: 'Food',
        title: 'You spend more on Food on weekends',
      })
    })
  })

  describe('weekday higher spending detection', () => {
    it('should detect when weekday spending is >30% higher', () => {
      const expenses = [
        // Weekend spending (lower)
        createExpenseOnDayOfWeek(6, 0, { category: 'Transport', amount: 50000 }),
        createExpenseOnDayOfWeek(6, 7, { category: 'Transport', amount: 60000 }),
        createExpenseOnDayOfWeek(0, 1, { category: 'Transport', amount: 40000 }),
        // Weekday spending (higher)
        createExpenseOnDayOfWeek(1, 2, { category: 'Transport', amount: 150000 }),
        createExpenseOnDayOfWeek(2, 3, { category: 'Transport', amount: 140000 }),
        createExpenseOnDayOfWeek(3, 4, { category: 'Transport', amount: 160000 }),
        createExpenseOnDayOfWeek(4, 5, { category: 'Transport', amount: 150000 }),
        createExpenseOnDayOfWeek(5, 6, { category: 'Transport', amount: 145000 }),
      ]

      const result = detectWeekendWeekdayPatterns(expenses, mockFormatCurrency)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'pattern',
        category: 'Transport',
        title: 'You spend more on Transport on weekdays',
      })
    })
  })

  describe('no significant pattern', () => {
    it('should NOT detect patterns when difference is <=30%', () => {
      const expenses = [
        // Weekend
        createExpenseOnDayOfWeek(6, 0, { category: 'Food', amount: 120000 }),
        createExpenseOnDayOfWeek(0, 1, { category: 'Food', amount: 110000 }),
        // Weekday (only ~15% less)
        createExpenseOnDayOfWeek(1, 2, { category: 'Food', amount: 100000 }),
        createExpenseOnDayOfWeek(2, 3, { category: 'Food', amount: 100000 }),
        createExpenseOnDayOfWeek(3, 4, { category: 'Food', amount: 100000 }),
      ]

      const result = detectWeekendWeekdayPatterns(expenses, mockFormatCurrency)
      expect(result).toHaveLength(0)
    })
  })

  describe('multiple categories', () => {
    it('should analyze patterns for each category independently', () => {
      const expenses = [
        // Food: Weekend higher
        createExpenseOnDayOfWeek(6, 0, { category: 'Food', amount: 200000 }),
        createExpenseOnDayOfWeek(1, 2, { category: 'Food', amount: 100000 }),
        // Transport: Weekday higher
        createExpenseOnDayOfWeek(6, 0, { category: 'Transport', amount: 50000 }),
        createExpenseOnDayOfWeek(1, 2, { category: 'Transport', amount: 150000 }),
        // Shopping: No significant difference
        createExpenseOnDayOfWeek(6, 0, { category: 'Shopping', amount: 100000 }),
        createExpenseOnDayOfWeek(1, 2, { category: 'Shopping', amount: 100000 }),
      ]

      const result = detectWeekendWeekdayPatterns(expenses, mockFormatCurrency)

      expect(result.length).toBeGreaterThanOrEqual(2)
      expect(result.find((r) => r.category === 'Food')).toBeDefined()
      expect(result.find((r) => r.category === 'Transport')).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('should handle weekend-only expenses', () => {
      const expenses = [
        createExpenseOnDayOfWeek(6, 0, { category: 'Food', amount: 100000 }),
        createExpenseOnDayOfWeek(0, 1, { category: 'Food', amount: 100000 }),
      ]

      // No weekday data to compare, should return empty
      const result = detectWeekendWeekdayPatterns(expenses, mockFormatCurrency)
      expect(result).toEqual([])
    })

    it('should handle weekday-only expenses', () => {
      const expenses = [
        createExpenseOnDayOfWeek(1, 2, { category: 'Food', amount: 100000 }),
        createExpenseOnDayOfWeek(2, 3, { category: 'Food', amount: 100000 }),
      ]

      // No weekend data, should return empty
      const result = detectWeekendWeekdayPatterns(expenses, mockFormatCurrency)
      expect(result).toEqual([])
    })

    it('should handle null category as "Other"', () => {
      const expenses = [
        createExpenseOnDayOfWeek(6, 0, { category: null as unknown as string, amount: 200000 }),
        createExpenseOnDayOfWeek(1, 2, { category: null as unknown as string, amount: 100000 }),
      ]

      const result = detectWeekendWeekdayPatterns(expenses, mockFormatCurrency)
      if (result.length > 0) {
        expect(result[0].category).toBe('Other')
      }
    })

    it('should return correct insight structure', () => {
      const expenses = [
        createExpenseOnDayOfWeek(6, 0, { category: 'Food', amount: 200000 }),
        createExpenseOnDayOfWeek(1, 2, { category: 'Food', amount: 100000 }),
      ]

      const result = detectWeekendWeekdayPatterns(expenses, mockFormatCurrency)

      if (result.length > 0) {
        expect(result[0]).toMatchObject({
          type: 'pattern',
          category: expect.any(String),
          title: expect.any(String),
          description: expect.stringContaining('%'),
          value: expect.stringContaining('avg'),
        })
      }
    })
  })
})

describe('findTopSpendingCategory', () => {
  describe('basic functionality', () => {
    it('should return null for empty expenses', () => {
      const result = findTopSpendingCategory([])
      expect(result).toBeNull()
    })

    it('should return null when no expenses in last 30 days', () => {
      const expenses = [
        createExpenseWithDate(35, { category: 'Food', amount: 100000 }),
      ]
      const result = findTopSpendingCategory(expenses)
      expect(result).toBeNull()
    })

    it('should find single category as top', () => {
      const expenses = [
        createExpenseWithDate(1, { category: 'Food', amount: 100000 }),
      ]

      const result = findTopSpendingCategory(expenses)

      expect(result).toMatchObject({
        category: 'Food',
        amount: 100000,
        percentage: 100,
      })
    })
  })

  describe('top category identification', () => {
    it('should identify highest spending category', () => {
      const expenses = [
        createExpenseWithDate(1, { category: 'Food', amount: 100000 }),
        createExpenseWithDate(2, { category: 'Transport', amount: 50000 }),
        createExpenseWithDate(3, { category: 'Shopping', amount: 200000 }),
      ]

      const result = findTopSpendingCategory(expenses)

      expect(result).toMatchObject({
        category: 'Shopping',
        amount: 200000,
      })
    })

    it('should aggregate multiple expenses in same category', () => {
      const expenses = [
        createExpenseWithDate(1, { category: 'Food', amount: 50000 }),
        createExpenseWithDate(2, { category: 'Food', amount: 60000 }),
        createExpenseWithDate(3, { category: 'Food', amount: 40000 }),
        createExpenseWithDate(4, { category: 'Transport', amount: 100000 }),
      ]

      const result = findTopSpendingCategory(expenses)

      expect(result).toMatchObject({
        category: 'Food',
        amount: 150000, // 50k + 60k + 40k
      })
    })
  })

  describe('percentage calculation', () => {
    it('should calculate correct percentage of total', () => {
      const expenses = [
        createExpenseWithDate(1, { category: 'Food', amount: 60000 }),
        createExpenseWithDate(2, { category: 'Transport', amount: 40000 }),
      ]

      const result = findTopSpendingCategory(expenses)

      expect(result).toMatchObject({
        category: 'Food',
        amount: 60000,
        percentage: 60, // 60k / 100k = 60%
      })
    })

    it('should return 100% when single category', () => {
      const expenses = [
        createExpenseWithDate(1, { category: 'Food', amount: 100000 }),
        createExpenseWithDate(2, { category: 'Food', amount: 50000 }),
      ]

      const result = findTopSpendingCategory(expenses)

      expect(result?.percentage).toBe(100)
    })

    it('should handle many categories', () => {
      const expenses = [
        createExpenseWithDate(1, { category: 'Food', amount: 100000 }),
        createExpenseWithDate(2, { category: 'Transport', amount: 50000 }),
        createExpenseWithDate(3, { category: 'Shopping', amount: 30000 }),
        createExpenseWithDate(4, { category: 'Entertainment', amount: 20000 }),
      ]

      const result = findTopSpendingCategory(expenses)

      // Total: 200k, Food: 100k = 50%
      expect(result).toMatchObject({
        category: 'Food',
        amount: 100000,
        percentage: 50,
      })
    })
  })

  describe('edge cases', () => {
    it('should handle null category as "Other"', () => {
      const expenses = [
        createExpenseWithDate(1, { category: null as unknown as string, amount: 100000 }),
      ]

      const result = findTopSpendingCategory(expenses)

      expect(result).toMatchObject({
        category: 'Other',
        amount: 100000,
        percentage: 100,
      })
    })

    it('should only include last 30 days expenses', () => {
      const expenses = [
        // Old (excluded)
        createExpenseWithDate(35, { category: 'Shopping', amount: 1000000 }),
        // Recent (included)
        createExpenseWithDate(1, { category: 'Food', amount: 100000 }),
      ]

      const result = findTopSpendingCategory(expenses)

      expect(result).toMatchObject({
        category: 'Food',
        amount: 100000,
      })
    })

    it('should handle tie by returning first in sorted order', () => {
      const expenses = [
        createExpenseWithDate(1, { category: 'Alpha', amount: 100000 }),
        createExpenseWithDate(2, { category: 'Beta', amount: 100000 }),
      ]

      const result = findTopSpendingCategory(expenses)

      // Both have same amount, result depends on sort stability
      expect(result?.amount).toBe(100000)
      expect(['Alpha', 'Beta']).toContain(result?.category)
    })
  })
})
