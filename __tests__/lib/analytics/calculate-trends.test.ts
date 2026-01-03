/**
 * Calculate Trends Tests
 *
 * Tests for month-over-month trend analysis and new category detection.
 */

import type { Expense } from '@/lib/supabase'
import { describe, expect, it, vi } from 'vitest'

import {
  calculateMonthOverMonthTrends,
  detectNewCategories,
} from '@/lib/analytics/calculate-trends'
import { createMockExpense } from '../../mocks/supabase'

// Mock currency formatter
const mockFormatCurrency = vi.fn((amount: number, _currency: string) => {
  return `${amount.toLocaleString()} VND`
})

// Helper to create expense with specific date
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

// Helper to create expense in specific month
function createExpenseInMonth(
  monthOffset: number,
  day: number = 15,
  overrides: Partial<Expense> = {}
): Expense {
  const date = new Date()
  date.setMonth(date.getMonth() + monthOffset)
  date.setDate(day)
  return createMockExpense({
    transaction_date: date.toISOString().slice(0, 10),
    ...overrides,
  })
}

describe('calculateMonthOverMonthTrends', () => {
  describe('basic functionality', () => {
    it('should return empty array for empty expenses', () => {
      const result = calculateMonthOverMonthTrends([], mockFormatCurrency)
      expect(result).toEqual([])
    })

    it('should return empty array for single expense', () => {
      const expenses = [createExpenseInMonth(0)]
      const result = calculateMonthOverMonthTrends(expenses, mockFormatCurrency)
      expect(result).toEqual([])
    })

    it('should return empty array when no previous month data', () => {
      const expenses = [
        createExpenseInMonth(0, 1, { category: 'Food', amount: 100000 }),
        createExpenseInMonth(0, 15, { category: 'Food', amount: 100000 }),
      ]
      const result = calculateMonthOverMonthTrends(expenses, mockFormatCurrency)
      expect(result).toEqual([])
    })
  })

  describe('trend detection', () => {
    it('should detect >25% increase in category spending', () => {
      const expenses = [
        // Last month: 100,000 Food
        createExpenseInMonth(-1, 15, { category: 'Food', amount: 100000 }),
        // This month: 150,000 Food (50% increase)
        createExpenseInMonth(0, 15, { category: 'Food', amount: 150000 }),
      ]

      const result = calculateMonthOverMonthTrends(expenses, mockFormatCurrency)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'trend',
        category: 'Food',
        title: 'Food increased',
      })
      expect(result[0].change).toBeCloseTo(50, 0)
    })

    it('should detect >25% decrease in category spending', () => {
      const expenses = [
        // Last month: 200,000 Transport
        createExpenseInMonth(-1, 15, { category: 'Transport', amount: 200000 }),
        // This month: 100,000 Transport (50% decrease)
        createExpenseInMonth(0, 15, { category: 'Transport', amount: 100000 }),
      ]

      const result = calculateMonthOverMonthTrends(expenses, mockFormatCurrency)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'trend',
        category: 'Transport',
        title: 'Transport decreased',
      })
      expect(result[0].change).toBeCloseTo(-50, 0)
    })

    it('should NOT detect changes <=25%', () => {
      const expenses = [
        // Last month: 100,000 Food
        createExpenseInMonth(-1, 15, { category: 'Food', amount: 100000 }),
        // This month: 120,000 Food (20% increase - below threshold)
        createExpenseInMonth(0, 15, { category: 'Food', amount: 120000 }),
      ]

      const result = calculateMonthOverMonthTrends(expenses, mockFormatCurrency)
      expect(result).toHaveLength(0)
    })

    it('should detect exactly 25% change at boundary', () => {
      const expenses = [
        createExpenseInMonth(-1, 15, { category: 'Food', amount: 100000 }),
        createExpenseInMonth(0, 15, { category: 'Food', amount: 125000 }),
      ]

      const result = calculateMonthOverMonthTrends(expenses, mockFormatCurrency)
      // Exactly 25% should NOT be included (>25% required)
      expect(result).toHaveLength(0)
    })

    it('should detect changes just above 25% threshold', () => {
      const expenses = [
        createExpenseInMonth(-1, 15, { category: 'Food', amount: 100000 }),
        createExpenseInMonth(0, 15, { category: 'Food', amount: 126000 }),
      ]

      const result = calculateMonthOverMonthTrends(expenses, mockFormatCurrency)
      expect(result).toHaveLength(1)
      expect(result[0].change).toBeCloseTo(26, 0)
    })
  })

  describe('multiple categories', () => {
    it('should analyze each category independently', () => {
      const expenses = [
        // Food: 50% increase
        createExpenseInMonth(-1, 15, { category: 'Food', amount: 100000 }),
        createExpenseInMonth(0, 15, { category: 'Food', amount: 150000 }),
        // Transport: 40% decrease
        createExpenseInMonth(-1, 15, { category: 'Transport', amount: 100000 }),
        createExpenseInMonth(0, 15, { category: 'Transport', amount: 60000 }),
        // Shopping: 10% increase (below threshold)
        createExpenseInMonth(-1, 15, { category: 'Shopping', amount: 100000 }),
        createExpenseInMonth(0, 15, { category: 'Shopping', amount: 110000 }),
      ]

      const result = calculateMonthOverMonthTrends(expenses, mockFormatCurrency)

      expect(result).toHaveLength(2)
      expect(result.find((r) => r.category === 'Food')).toBeDefined()
      expect(result.find((r) => r.category === 'Transport')).toBeDefined()
      expect(result.find((r) => r.category === 'Shopping')).toBeUndefined()
    })

    it('should aggregate multiple expenses per category', () => {
      const expenses = [
        // Last month Food: 50,000 + 50,000 = 100,000
        createExpenseInMonth(-1, 10, { category: 'Food', amount: 50000 }),
        createExpenseInMonth(-1, 20, { category: 'Food', amount: 50000 }),
        // This month Food: 60,000 + 80,000 = 140,000 (40% increase)
        createExpenseInMonth(0, 10, { category: 'Food', amount: 60000 }),
        createExpenseInMonth(0, 20, { category: 'Food', amount: 80000 }),
      ]

      const result = calculateMonthOverMonthTrends(expenses, mockFormatCurrency)

      expect(result).toHaveLength(1)
      expect(result[0].change).toBeCloseTo(40, 0)
    })
  })

  describe('edge cases', () => {
    it('should handle null category as "Other"', () => {
      const expenses = [
        createExpenseInMonth(-1, 15, { category: null as unknown as string, amount: 100000 }),
        createExpenseInMonth(0, 15, { category: null as unknown as string, amount: 200000 }),
      ]

      const result = calculateMonthOverMonthTrends(expenses, mockFormatCurrency)

      expect(result).toHaveLength(1)
      expect(result[0].category).toBe('Other')
    })

    it('should call formatCurrency with correct arguments', () => {
      mockFormatCurrency.mockClear()
      const expenses = [
        createExpenseInMonth(-1, 15, { category: 'Food', amount: 100000 }),
        createExpenseInMonth(0, 15, { category: 'Food', amount: 150000 }),
      ]

      calculateMonthOverMonthTrends(expenses, mockFormatCurrency)

      expect(mockFormatCurrency).toHaveBeenCalledWith(150000, 'VND')
    })

    it('should return correct insight structure', () => {
      const expenses = [
        createExpenseInMonth(-1, 15, { category: 'Food', amount: 100000 }),
        createExpenseInMonth(0, 15, { category: 'Food', amount: 200000 }),
      ]

      const result = calculateMonthOverMonthTrends(expenses, mockFormatCurrency)

      expect(result[0]).toMatchObject({
        type: 'trend',
        category: 'Food',
        title: expect.stringContaining('Food'),
        description: expect.stringContaining('%'),
        value: expect.any(String),
        change: expect.any(Number),
      })
    })
  })

  describe('date boundary handling', () => {
    it('should correctly classify expenses by month using helper', () => {
      // Use day 1 to ensure we're safely within the month
      const expenses = [
        // Last month: 100k
        createExpenseInMonth(-1, 1, { category: 'Food', amount: 100000 }),
        // This month: 150k (50% increase)
        createExpenseInMonth(0, 1, { category: 'Food', amount: 150000 }),
      ]

      const result = calculateMonthOverMonthTrends(expenses, mockFormatCurrency)

      expect(result).toHaveLength(1)
      expect(result[0].change).toBeCloseTo(50, 0)
    })
  })
})

describe('detectNewCategories', () => {
  describe('basic functionality', () => {
    it('should return empty array for empty expenses', () => {
      const result = detectNewCategories([], mockFormatCurrency)
      expect(result).toEqual([])
    })

    it('should return empty array when category existed last month', () => {
      const expenses = [
        createExpenseInMonth(-1, 15, { category: 'Food', amount: 50000 }),
        createExpenseInMonth(0, 15, { category: 'Food', amount: 200000 }),
      ]

      const result = detectNewCategories(expenses, mockFormatCurrency)
      expect(result).toEqual([])
    })
  })

  describe('new category detection', () => {
    it('should detect new category with spending >100,000', () => {
      const expenses = [
        // New category this month
        createExpenseInMonth(0, 15, { category: 'Gaming', amount: 150000 }),
      ]

      const result = detectNewCategories(expenses, mockFormatCurrency)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'alert',
        category: 'Gaming',
        title: 'New spending in Gaming',
        description: 'This is a new category for you this month',
      })
    })

    it('should NOT detect new category with spending <=100,000', () => {
      const expenses = [
        createExpenseInMonth(0, 15, { category: 'Gaming', amount: 100000 }),
      ]

      const result = detectNewCategories(expenses, mockFormatCurrency)
      expect(result).toHaveLength(0)
    })

    it('should detect new category at exactly 100,001', () => {
      const expenses = [
        createExpenseInMonth(0, 15, { category: 'Gaming', amount: 100001 }),
      ]

      const result = detectNewCategories(expenses, mockFormatCurrency)
      expect(result).toHaveLength(1)
    })
  })

  describe('multiple new categories', () => {
    it('should detect multiple new categories', () => {
      const expenses = [
        createExpenseInMonth(0, 10, { category: 'Gaming', amount: 200000 }),
        createExpenseInMonth(0, 15, { category: 'Pets', amount: 300000 }),
      ]

      const result = detectNewCategories(expenses, mockFormatCurrency)

      expect(result).toHaveLength(2)
      expect(result.find((r) => r.category === 'Gaming')).toBeDefined()
      expect(result.find((r) => r.category === 'Pets')).toBeDefined()
    })

    it('should aggregate spending within new category', () => {
      const expenses = [
        // Total: 150,000 (above threshold)
        createExpenseInMonth(0, 10, { category: 'Gaming', amount: 50000 }),
        createExpenseInMonth(0, 15, { category: 'Gaming', amount: 60000 }),
        createExpenseInMonth(0, 20, { category: 'Gaming', amount: 40000 }),
      ]

      const result = detectNewCategories(expenses, mockFormatCurrency)
      expect(result).toHaveLength(1)
    })
  })

  describe('edge cases', () => {
    it('should handle null category as "Other"', () => {
      const expenses = [
        createExpenseInMonth(0, 15, { category: null as unknown as string, amount: 200000 }),
      ]

      const result = detectNewCategories(expenses, mockFormatCurrency)

      expect(result).toHaveLength(1)
      expect(result[0].category).toBe('Other')
    })

    it('should call formatCurrency for each new category', () => {
      mockFormatCurrency.mockClear()
      const expenses = [
        createExpenseInMonth(0, 15, { category: 'Gaming', amount: 150000 }),
      ]

      detectNewCategories(expenses, mockFormatCurrency)

      expect(mockFormatCurrency).toHaveBeenCalledWith(150000, 'VND')
    })
  })
})
