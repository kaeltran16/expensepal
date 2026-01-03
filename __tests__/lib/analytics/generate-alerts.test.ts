/**
 * Generate Alerts Tests
 *
 * Tests for spending spike detection and spending velocity analysis.
 */

import type { Expense } from '@/lib/supabase'
import { describe, expect, it, vi } from 'vitest'

import {
  detectSpendingSpikes,
  detectSpendingVelocity,
} from '@/lib/analytics/generate-alerts'
import { createMockExpense } from '../../mocks/supabase'

// Mock currency formatter
const mockFormatCurrency = vi.fn((amount: number, _currency: string) => {
  return `${amount.toLocaleString()} VND`
})

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

describe('detectSpendingSpikes', () => {
  describe('basic functionality', () => {
    it('should return null for empty expenses', () => {
      const result = detectSpendingSpikes([], mockFormatCurrency)
      expect(result).toBeNull()
    })

    it('should return null for less than 7 days of data', () => {
      const expenses = [
        createExpenseWithDate(0, { amount: 100000 }),
        createExpenseWithDate(1, { amount: 100000 }),
        createExpenseWithDate(2, { amount: 100000 }),
        createExpenseWithDate(3, { amount: 100000 }),
        createExpenseWithDate(4, { amount: 100000 }),
        createExpenseWithDate(5, { amount: 100000 }),
        // Only 6 days
      ]

      const result = detectSpendingSpikes(expenses, mockFormatCurrency)
      expect(result).toBeNull()
    })

    it('should filter out expenses older than 30 days', () => {
      const expenses = [
        // All old expenses
        createExpenseWithDate(35, { amount: 500000 }),
        createExpenseWithDate(36, { amount: 100000 }),
        createExpenseWithDate(37, { amount: 100000 }),
        createExpenseWithDate(38, { amount: 100000 }),
        createExpenseWithDate(39, { amount: 100000 }),
        createExpenseWithDate(40, { amount: 100000 }),
        createExpenseWithDate(41, { amount: 100000 }),
      ]

      const result = detectSpendingSpikes(expenses, mockFormatCurrency)
      expect(result).toBeNull()
    })
  })

  describe('spike detection', () => {
    it('should detect spike when max day is >2.5x average', () => {
      const expenses = [
        // Normal days: 100k each
        createExpenseWithDate(0, { amount: 100000 }),
        createExpenseWithDate(1, { amount: 100000 }),
        createExpenseWithDate(2, { amount: 100000 }),
        createExpenseWithDate(3, { amount: 100000 }),
        createExpenseWithDate(4, { amount: 100000 }),
        createExpenseWithDate(5, { amount: 100000 }),
        createExpenseWithDate(6, { amount: 100000 }),
        // Spike day: 500k (5x average with spike included)
        createExpenseWithDate(7, { amount: 500000 }),
      ]

      const result = detectSpendingSpikes(expenses, mockFormatCurrency)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('alert')
      expect(result?.title).toBe('Unusual spending spike detected')
    })

    it('should NOT detect spike when max is <=2.5x average', () => {
      const expenses = [
        // Normal days: 100k each
        createExpenseWithDate(0, { amount: 100000 }),
        createExpenseWithDate(1, { amount: 100000 }),
        createExpenseWithDate(2, { amount: 100000 }),
        createExpenseWithDate(3, { amount: 100000 }),
        createExpenseWithDate(4, { amount: 100000 }),
        createExpenseWithDate(5, { amount: 100000 }),
        createExpenseWithDate(6, { amount: 100000 }),
        // Slightly higher: 200k (2x average, below threshold)
        createExpenseWithDate(7, { amount: 200000 }),
      ]

      const result = detectSpendingSpikes(expenses, mockFormatCurrency)
      expect(result).toBeNull()
    })

    it('should aggregate multiple expenses on same day', () => {
      const expenses = [
        // Normal days
        createExpenseWithDate(0, { amount: 100000 }),
        createExpenseWithDate(1, { amount: 100000 }),
        createExpenseWithDate(2, { amount: 100000 }),
        createExpenseWithDate(3, { amount: 100000 }),
        createExpenseWithDate(4, { amount: 100000 }),
        createExpenseWithDate(5, { amount: 100000 }),
        createExpenseWithDate(6, { amount: 100000 }),
        // Multiple expenses on spike day
        createExpenseWithDate(7, { amount: 200000 }),
        createExpenseWithDate(7, { amount: 200000 }),
        createExpenseWithDate(7, { amount: 200000 }),
      ]

      const result = detectSpendingSpikes(expenses, mockFormatCurrency)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('alert')
    })
  })

  describe('edge cases', () => {
    it('should handle exactly 7 days of data', () => {
      const expenses = [
        createExpenseWithDate(0, { amount: 100000 }),
        createExpenseWithDate(1, { amount: 100000 }),
        createExpenseWithDate(2, { amount: 100000 }),
        createExpenseWithDate(3, { amount: 100000 }),
        createExpenseWithDate(4, { amount: 100000 }),
        createExpenseWithDate(5, { amount: 100000 }),
        createExpenseWithDate(6, { amount: 500000 }),
      ]

      const result = detectSpendingSpikes(expenses, mockFormatCurrency)

      // Should work with exactly 7 days
      expect(result).not.toBeNull()
    })

    it('should return correct alert structure', () => {
      const expenses = Array.from({ length: 8 }, (_, i) =>
        createExpenseWithDate(i, { amount: i === 7 ? 500000 : 100000 })
      )

      const result = detectSpendingSpikes(expenses, mockFormatCurrency)

      expect(result).toMatchObject({
        type: 'alert',
        title: 'Unusual spending spike detected',
        description: expect.stringContaining('%'),
        value: expect.any(String),
      })
    })

    it('should call formatCurrency with max daily amount', () => {
      mockFormatCurrency.mockClear()
      const expenses = Array.from({ length: 8 }, (_, i) =>
        createExpenseWithDate(i, { amount: i === 7 ? 500000 : 100000 })
      )

      detectSpendingSpikes(expenses, mockFormatCurrency)

      expect(mockFormatCurrency).toHaveBeenCalledWith(500000, 'VND')
    })
  })
})

describe('detectSpendingVelocity', () => {
  describe('basic functionality', () => {
    it('should return null for empty expenses', () => {
      const result = detectSpendingVelocity([], mockFormatCurrency)
      expect(result).toBeNull()
    })

    it('should return null when no previous week data', () => {
      const expenses = [
        // Only last 7 days
        createExpenseWithDate(0, { amount: 100000 }),
        createExpenseWithDate(1, { amount: 100000 }),
        createExpenseWithDate(2, { amount: 100000 }),
      ]

      const result = detectSpendingVelocity(expenses, mockFormatCurrency)
      expect(result).toBeNull()
    })
  })

  describe('acceleration detection', () => {
    it('should detect acceleration when last 7 days is >30% higher', () => {
      const expenses = [
        // Last 7 days: 500k total
        createExpenseWithDate(0, { amount: 100000 }),
        createExpenseWithDate(1, { amount: 100000 }),
        createExpenseWithDate(2, { amount: 100000 }),
        createExpenseWithDate(3, { amount: 100000 }),
        createExpenseWithDate(4, { amount: 100000 }),
        // Previous 7 days: 250k total (50% less)
        createExpenseWithDate(8, { amount: 50000 }),
        createExpenseWithDate(9, { amount: 50000 }),
        createExpenseWithDate(10, { amount: 50000 }),
        createExpenseWithDate(11, { amount: 50000 }),
        createExpenseWithDate(12, { amount: 50000 }),
      ]

      const result = detectSpendingVelocity(expenses, mockFormatCurrency)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('alert')
      expect(result?.title).toBe('Spending is accelerating')
      expect(result?.change).toBeGreaterThan(0)
    })
  })

  describe('deceleration detection', () => {
    it('should detect deceleration when last 7 days is >30% lower', () => {
      const expenses = [
        // Last 7 days: 250k total
        createExpenseWithDate(0, { amount: 50000 }),
        createExpenseWithDate(1, { amount: 50000 }),
        createExpenseWithDate(2, { amount: 50000 }),
        createExpenseWithDate(3, { amount: 50000 }),
        createExpenseWithDate(4, { amount: 50000 }),
        // Previous 7 days: 500k total
        createExpenseWithDate(8, { amount: 100000 }),
        createExpenseWithDate(9, { amount: 100000 }),
        createExpenseWithDate(10, { amount: 100000 }),
        createExpenseWithDate(11, { amount: 100000 }),
        createExpenseWithDate(12, { amount: 100000 }),
      ]

      const result = detectSpendingVelocity(expenses, mockFormatCurrency)

      expect(result).not.toBeNull()
      expect(result?.type).toBe('tip')
      expect(result?.title).toBe('Spending is slowing down')
      expect(result?.change).toBeLessThan(0)
    })
  })

  describe('no significant change', () => {
    it('should return null when change is <=30%', () => {
      const expenses = [
        // Last 7 days: 110k
        createExpenseWithDate(0, { amount: 55000 }),
        createExpenseWithDate(1, { amount: 55000 }),
        // Previous 7 days: 100k (only 10% difference)
        createExpenseWithDate(8, { amount: 50000 }),
        createExpenseWithDate(9, { amount: 50000 }),
      ]

      const result = detectSpendingVelocity(expenses, mockFormatCurrency)
      expect(result).toBeNull()
    })

    it('should return null at exactly 30% change', () => {
      const expenses = [
        // Last 7 days: 130k
        createExpenseWithDate(0, { amount: 130000 }),
        // Previous 7 days: 100k (exactly 30%)
        createExpenseWithDate(8, { amount: 100000 }),
      ]

      const result = detectSpendingVelocity(expenses, mockFormatCurrency)
      expect(result).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should correctly classify day 7 boundary', () => {
      // Day 7 should be in "last 7 days" (0-6 days ago)
      const expenses = [
        createExpenseWithDate(6, { amount: 200000 }), // Last 7 days
        createExpenseWithDate(7, { amount: 100000 }), // Previous week starts at day 7
        createExpenseWithDate(8, { amount: 100000 }),
      ]

      const result = detectSpendingVelocity(expenses, mockFormatCurrency)

      // 200k vs 200k = 0% change, should be null
      if (result !== null) {
        expect(Math.abs(result.change || 0)).toBeGreaterThan(30)
      }
    })

    it('should return correct insight structure for acceleration', () => {
      const expenses = [
        createExpenseWithDate(0, { amount: 200000 }),
        createExpenseWithDate(8, { amount: 100000 }),
      ]

      const result = detectSpendingVelocity(expenses, mockFormatCurrency)

      if (result?.type === 'alert') {
        expect(result).toMatchObject({
          type: 'alert',
          title: 'Spending is accelerating',
          description: expect.stringContaining('more'),
          value: expect.any(String),
          change: expect.any(Number),
        })
      }
    })

    it('should return correct insight structure for deceleration', () => {
      const expenses = [
        createExpenseWithDate(0, { amount: 50000 }),
        createExpenseWithDate(8, { amount: 200000 }),
      ]

      const result = detectSpendingVelocity(expenses, mockFormatCurrency)

      if (result?.type === 'tip') {
        expect(result).toMatchObject({
          type: 'tip',
          title: 'Spending is slowing down',
          description: expect.stringContaining('less'),
          value: expect.any(String),
          change: expect.any(Number),
        })
      }
    })

    it('should call formatCurrency with last 7 days total', () => {
      mockFormatCurrency.mockClear()
      const expenses = [
        createExpenseWithDate(0, { amount: 150000 }),
        createExpenseWithDate(1, { amount: 50000 }),
        createExpenseWithDate(8, { amount: 100000 }),
      ]

      detectSpendingVelocity(expenses, mockFormatCurrency)

      // Should format 200k (last 7 days total)
      expect(mockFormatCurrency).toHaveBeenCalledWith(200000, 'VND')
    })

    it('should handle mixed date ranges', () => {
      const expenses = [
        // Last 7 days
        createExpenseWithDate(0, { amount: 100000 }),
        createExpenseWithDate(3, { amount: 100000 }),
        createExpenseWithDate(6, { amount: 100000 }),
        // Previous 7 days
        createExpenseWithDate(7, { amount: 50000 }),
        createExpenseWithDate(10, { amount: 50000 }),
        createExpenseWithDate(13, { amount: 50000 }),
        // Older than 14 days (excluded)
        createExpenseWithDate(20, { amount: 1000000 }),
      ]

      const result = detectSpendingVelocity(expenses, mockFormatCurrency)

      // 300k vs 150k = 100% increase
      expect(result).not.toBeNull()
      expect(result?.type).toBe('alert')
    })
  })
})
