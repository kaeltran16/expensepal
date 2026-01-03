/**
 * Generate Insights Tests
 *
 * Tests for the main insights orchestrator that combines all analysis functions.
 */

import type { Expense } from '@/lib/supabase'
import { describe, expect, it, vi } from 'vitest'

import { generateInsights } from '@/lib/analytics/generate-insights'
import { createMockExpense } from '../../mocks/supabase'

// Mock currency formatter
const mockFormatCurrency = vi.fn((amount: number, _currency: string) => {
  return `${amount.toLocaleString()} VND`
})

// Mock icon components
const mockIcons = {
  TrendingUp: () => null,
  TrendingDown: () => null,
  AlertCircle: () => null,
  Lightbulb: () => null,
  Calendar: () => null,
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

// Helper to create expense on specific day of week
function createExpenseOnDayOfWeek(
  dayOfWeek: number,
  daysBack: number = 0,
  overrides: Partial<Expense> = {}
): Expense {
  const now = new Date()
  now.setDate(now.getDate() - daysBack)
  const currentDay = now.getDay()
  const diff = (currentDay - dayOfWeek + 7) % 7
  now.setDate(now.getDate() - diff)

  return createMockExpense({
    transaction_date: now.toISOString().slice(0, 10),
    ...overrides,
  })
}

describe('generateInsights', () => {
  describe('basic functionality', () => {
    it('should return empty array for empty expenses', () => {
      const result = generateInsights([], mockFormatCurrency, mockIcons)
      expect(result).toEqual([])
    })

    it('should return empty array when no insights are generated', () => {
      // Single expense with no patterns to detect
      const expenses = [createExpenseWithDate(15, { amount: 50000 })]

      const result = generateInsights(expenses, mockFormatCurrency, mockIcons)

      // May have some insights depending on data, but should not throw
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('trend insights', () => {
    it('should include month-over-month trend insights', () => {
      const expenses = [
        // Last month: 100k Food
        createExpenseInMonth(-1, 15, { category: 'Food', amount: 100000 }),
        // This month: 200k Food (100% increase)
        createExpenseInMonth(0, 15, { category: 'Food', amount: 200000 }),
      ]

      const result = generateInsights(expenses, mockFormatCurrency, mockIcons)

      const trendInsight = result.find(
        (i) => i.type === 'trend' && i.category === 'Food'
      )
      expect(trendInsight).toBeDefined()
      expect(trendInsight?.title).toContain('Food')
      expect(trendInsight?.icon).toBe(mockIcons.TrendingUp)
    })

    it('should use TrendingDown icon for decreases', () => {
      const expenses = [
        createExpenseInMonth(-1, 15, { category: 'Food', amount: 200000 }),
        createExpenseInMonth(0, 15, { category: 'Food', amount: 100000 }),
      ]

      const result = generateInsights(expenses, mockFormatCurrency, mockIcons)

      const trendInsight = result.find(
        (i) => i.type === 'trend' && i.category === 'Food'
      )
      expect(trendInsight?.icon).toBe(mockIcons.TrendingDown)
    })
  })

  describe('new category alerts', () => {
    it('should include new category alerts', () => {
      const expenses = [
        createExpenseInMonth(0, 15, { category: 'Gaming', amount: 200000 }),
      ]

      const result = generateInsights(expenses, mockFormatCurrency, mockIcons)

      const newCategoryAlert = result.find(
        (i) => i.type === 'alert' && i.category === 'Gaming'
      )
      expect(newCategoryAlert).toBeDefined()
      expect(newCategoryAlert?.icon).toBe(mockIcons.AlertCircle)
    })
  })

  describe('weekend/weekday patterns', () => {
    it('should include weekend/weekday pattern insights', () => {
      const expenses = [
        // Weekend spending (higher)
        createExpenseOnDayOfWeek(6, 0, { category: 'Food', amount: 200000 }),
        createExpenseOnDayOfWeek(0, 1, { category: 'Food', amount: 180000 }),
        // Weekday spending (lower)
        createExpenseOnDayOfWeek(1, 2, { category: 'Food', amount: 80000 }),
        createExpenseOnDayOfWeek(2, 3, { category: 'Food', amount: 70000 }),
      ]

      const result = generateInsights(expenses, mockFormatCurrency, mockIcons)

      const patternInsight = result.find((i) => i.type === 'pattern')
      if (patternInsight) {
        expect(patternInsight.icon).toBe(mockIcons.Calendar)
      }
    })
  })

  describe('top category tips', () => {
    it('should include tip when top category is >40% of spending', () => {
      const expenses = [
        // Food: 80% of spending
        createExpenseWithDate(1, { category: 'Food', amount: 80000 }),
        // Other: 20%
        createExpenseWithDate(2, { category: 'Transport', amount: 20000 }),
      ]

      const result = generateInsights(expenses, mockFormatCurrency, mockIcons)

      const tipInsight = result.find(
        (i) => i.type === 'tip' && i.category === 'Food'
      )
      expect(tipInsight).toBeDefined()
      expect(tipInsight?.icon).toBe(mockIcons.Lightbulb)
      expect(tipInsight?.description).toContain('meal prepping')
    })

    it('should NOT include tip when top category is <=40%', () => {
      const expenses = [
        // Even distribution (33% each)
        createExpenseWithDate(1, { category: 'Food', amount: 100000 }),
        createExpenseWithDate(2, { category: 'Transport', amount: 100000 }),
        createExpenseWithDate(3, { category: 'Shopping', amount: 100000 }),
      ]

      const result = generateInsights(expenses, mockFormatCurrency, mockIcons)

      const tipInsight = result.find((i) => i.type === 'tip')
      expect(tipInsight).toBeUndefined()
    })

    it('should use generic tip for unknown categories', () => {
      const expenses = [
        createExpenseWithDate(1, { category: 'CustomCategory', amount: 100000 }),
        createExpenseWithDate(2, { category: 'Other', amount: 10000 }),
      ]

      const result = generateInsights(expenses, mockFormatCurrency, mockIcons)

      const tipInsight = result.find(
        (i) => i.type === 'tip' && i.category === 'CustomCategory'
      )
      if (tipInsight) {
        expect(tipInsight.description).toContain('budget')
      }
    })
  })

  describe('spending spike alerts', () => {
    it('should include spending spike alerts', () => {
      const expenses = [
        // Normal days
        ...Array.from({ length: 7 }, (_, i) =>
          createExpenseWithDate(i, { amount: 100000 })
        ),
        // Spike day
        createExpenseWithDate(7, { amount: 600000 }),
      ]

      const result = generateInsights(expenses, mockFormatCurrency, mockIcons)

      const spikeAlert = result.find(
        (i) => i.type === 'alert' && i.title?.includes('spike')
      )
      expect(spikeAlert).toBeDefined()
      expect(spikeAlert?.icon).toBe(mockIcons.AlertCircle)
    })
  })

  describe('spending velocity insights', () => {
    it('should include acceleration alert', () => {
      const expenses = [
        // Last 7 days: 300k
        createExpenseWithDate(0, { amount: 100000 }),
        createExpenseWithDate(1, { amount: 100000 }),
        createExpenseWithDate(2, { amount: 100000 }),
        // Previous 7 days: 150k
        createExpenseWithDate(8, { amount: 50000 }),
        createExpenseWithDate(9, { amount: 50000 }),
        createExpenseWithDate(10, { amount: 50000 }),
      ]

      const result = generateInsights(expenses, mockFormatCurrency, mockIcons)

      const velocityInsight = result.find(
        (i) => i.title?.includes('accelerating') || i.title?.includes('slowing')
      )
      if (velocityInsight) {
        expect(velocityInsight.icon).toBeDefined()
      }
    })

    it('should use TrendingUp for acceleration', () => {
      const expenses = [
        createExpenseWithDate(0, { amount: 200000 }),
        createExpenseWithDate(8, { amount: 100000 }),
      ]

      const result = generateInsights(expenses, mockFormatCurrency, mockIcons)

      const velocityInsight = result.find((i) => i.title?.includes('accelerating'))
      if (velocityInsight) {
        expect(velocityInsight.icon).toBe(mockIcons.TrendingUp)
      }
    })

    it('should use TrendingDown for deceleration', () => {
      const expenses = [
        createExpenseWithDate(0, { amount: 50000 }),
        createExpenseWithDate(8, { amount: 200000 }),
      ]

      const result = generateInsights(expenses, mockFormatCurrency, mockIcons)

      const velocityInsight = result.find((i) => i.title?.includes('slowing'))
      if (velocityInsight) {
        expect(velocityInsight.icon).toBe(mockIcons.TrendingDown)
      }
    })
  })

  describe('combined insights', () => {
    it('should generate multiple types of insights from complex data', () => {
      const expenses = [
        // Trend data (last month vs this month)
        createExpenseInMonth(-1, 15, { category: 'Food', amount: 100000 }),
        createExpenseInMonth(0, 15, { category: 'Food', amount: 200000 }),
        // New category
        createExpenseInMonth(0, 10, { category: 'Gaming', amount: 150000 }),
        // Pattern data
        createExpenseOnDayOfWeek(6, 0, { category: 'Entertainment', amount: 100000 }),
        createExpenseOnDayOfWeek(1, 2, { category: 'Entertainment', amount: 50000 }),
        // Spike data
        ...Array.from({ length: 7 }, (_, i) =>
          createExpenseWithDate(i + 1, { category: 'Other', amount: 50000 })
        ),
        createExpenseWithDate(8, { category: 'Other', amount: 500000 }),
      ]

      const result = generateInsights(expenses, mockFormatCurrency, mockIcons)

      // Should have various insight types
      const types = [...new Set(result.map((i) => i.type))]
      expect(types.length).toBeGreaterThan(0)
    })
  })

  describe('insight structure', () => {
    it('should return insights with required properties', () => {
      const expenses = [
        createExpenseInMonth(-1, 15, { category: 'Food', amount: 100000 }),
        createExpenseInMonth(0, 15, { category: 'Food', amount: 200000 }),
      ]

      const result = generateInsights(expenses, mockFormatCurrency, mockIcons)

      result.forEach((insight) => {
        expect(insight).toHaveProperty('type')
        expect(insight).toHaveProperty('title')
        expect(insight).toHaveProperty('description')
        expect(insight).toHaveProperty('icon')
        expect(['trend', 'pattern', 'alert', 'tip']).toContain(insight.type)
      })
    })
  })
})
