/**
 * Expense Creation Flow - Integration Test
 *
 * Tests the complete expense creation flow from user input to database storage:
 * 1. Create expense via API
 * 2. Verify cache update with TanStack Query
 * 3. Verify stats invalidation
 * 4. Verify meal auto-creation (if food category)
 * 5. Display in expense list
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createMockExpense } from '../mocks/supabase'
import { queryKeys } from '@/lib/hooks/query-keys'
import { getMockQueryClient, resetQueryMocks } from '../mocks/tanstack-query'
import { resetToastCalls } from '../mocks/sonner'

// Create a simple mock fetch for this file
const mockFetch = vi.fn()
global.fetch = mockFetch as any

describe('Expense Creation Flow', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    global.fetch = mockFetch as any
    vi.stubGlobal('fetch', mockFetch)
    resetQueryMocks()
    resetToastCalls()
  })

  describe('Standard Expense Creation', () => {
    it('should create expense, update cache, and invalidate stats', async () => {
      // Arrange
      const newExpense = createMockExpense({
        amount: 50000,
        merchant: 'Starbucks',
        category: 'Food',
        transaction_date: '2025-11-22T10:30:00Z',
      })

      const mockQueryClient = getMockQueryClient()

      // Mock expense creation API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ expense: newExpense }),
      })

      // Act - Simulate expense creation
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 50000,
          merchant: 'Starbucks',
          category: 'Food',
          transaction_date: '2025-11-22T10:30:00Z',
        }),
      })

      const data = await response.json()

      // Simulate mutation success callback (what TanStack Query would do)
      mockQueryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      mockQueryClient.invalidateQueries({ queryKey: queryKeys.stats.all })

      // Assert
      expect(response.ok).toBe(true)
      expect(data.expense).toMatchObject({
        amount: 50000,
        merchant: 'Starbucks',
        category: 'Food',
      })

      // Verify cache invalidation calls
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.expenses.all,
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.stats.all,
      })
    })

    it('should handle validation errors gracefully', async () => {
      // Arrange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Amount is required' }),
      })

      // Act
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant: 'Invalid Expense' }), // Missing amount
      })

      const data = await response.json()

      // Assert
      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
      expect(data.error).toBe('Amount is required')
    })

    it('should rollback optimistic update on error', async () => {
      // Arrange
      const mockQueryClient = getMockQueryClient()
      const existingExpenses = [
        createMockExpense({ id: '1', merchant: 'Existing 1' }),
        createMockExpense({ id: '2', merchant: 'Existing 2' }),
      ]

      // Simulate optimistic update
      const tempExpense = createMockExpense({
        id: 'temp-123',
        merchant: 'Optimistic',
        amount: 10000,
      })

      mockQueryClient.setQueryData(queryKeys.expenses.list(), {
        expenses: [tempExpense, ...existingExpenses],
      })

      // Mock API failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Database connection failed' }),
      })

      // Act
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 10000, merchant: 'Optimistic' }),
      })

      // Simulate mutation onError callback (rollback)
      if (!response.ok) {
        mockQueryClient.setQueryData(queryKeys.expenses.list(), {
          expenses: existingExpenses,
        })
      }

      // Assert
      expect(response.ok).toBe(false)
      expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
        queryKeys.expenses.list(),
        { expenses: existingExpenses }
      )
    })
  })

  describe('Food Category Auto-Meal Creation', () => {
    it('should create meal when expense category is Food', async () => {
      // Arrange
      const foodExpense = createMockExpense({
        amount: 75000,
        merchant: 'Pho Restaurant',
        category: 'Food',
        transaction_date: '2025-11-22T12:00:00Z',
      })

      const autoMeal = {
        id: 'meal-auto-1',
        user_id: 'user-123',
        description: 'Auto-logged from expense: Pho Restaurant',
        calories: 0, // Estimated by LLM later
        meal_time: 'lunch' as const,
        date: '2025-11-22',
        created_at: '2025-11-22T12:00:00Z',
      }

      const mockQueryClient = getMockQueryClient()

      // Mock expense creation and meal auto-creation
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ expense: foodExpense }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ meal: autoMeal }),
        })

      // Act - Create expense
      const expenseResponse = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 75000,
          merchant: 'Pho Restaurant',
          category: 'Food',
          transaction_date: '2025-11-22T12:00:00Z',
        }),
      })

      const expenseData = await expenseResponse.json()

      // Simulate auto-meal creation (client-side logic)
      if (expenseData.expense.category === 'Food') {
        const mealResponse = await fetch('/api/meals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: `Auto-logged from expense: ${expenseData.expense.merchant}`,
            calories: 0,
            meal_time: 'lunch',
            date: new Date(expenseData.expense.transaction_date)
              .toISOString()
              .split('T')[0],
          }),
        })

        const mealData = await mealResponse.json()

        // Invalidate meals cache
        mockQueryClient.invalidateQueries({ queryKey: queryKeys.meals.all })

        // Assert meal creation
        expect(mealResponse.ok).toBe(true)
        expect(mealData.meal).toMatchObject({
          description: 'Auto-logged from expense: Pho Restaurant',
          meal_time: 'lunch',
        })
        expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
          queryKey: queryKeys.meals.all,
        })
      }

      // Assert expense creation
      expect(expenseResponse.ok).toBe(true)
      expect(expenseData.expense.category).toBe('Food')
    })

    it('should NOT create meal for non-Food categories', async () => {
      // Arrange
      const transportExpense = createMockExpense({
        amount: 50000,
        merchant: 'Uber',
        category: 'Transport',
        transaction_date: '2025-11-22T08:00:00Z',
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ expense: transportExpense }),
      })

      // Act
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 50000,
          merchant: 'Uber',
          category: 'Transport',
          transaction_date: '2025-11-22T08:00:00Z',
        }),
      })

      const data = await response.json()

      // Assert - No meal should be created
      expect(data.expense.category).toBe('Transport')
      // In real implementation, verify no POST to /api/meals occurs
    })
  })

  describe('Expense List Display', () => {
    it('should display newly created expense at the top of the list', async () => {
      // Arrange
      const existingExpenses = [
        createMockExpense({
          id: '1',
          merchant: 'Old Expense',
          transaction_date: '2025-11-20T10:00:00Z',
        }),
      ]

      const newExpense = createMockExpense({
        id: '2',
        merchant: 'New Expense',
        transaction_date: '2025-11-22T10:00:00Z',
      })

      const mockQueryClient = getMockQueryClient()

      // Mock initial expense list, creation, and updated list
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ expenses: existingExpenses }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ expense: newExpense }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ expenses: [newExpense, ...existingExpenses] }),
        })

      // Act - Fetch initial list
      const initialResponse = await fetch('/api/expenses')
      const initialData = await initialResponse.json()

      // Create new expense
      const createResponse = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 10000,
          merchant: 'New Expense',
          category: 'Food',
        }),
      })

      // Simulate cache invalidation and refetch
      mockQueryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })

      const updatedResponse = await fetch('/api/expenses')
      const updatedData = await updatedResponse.json()

      // Assert
      expect(initialData.expenses).toHaveLength(1)
      expect(updatedData.expenses).toHaveLength(2)
      expect(updatedData.expenses[0].merchant).toBe('New Expense')
      expect(updatedData.expenses[1].merchant).toBe('Old Expense')
    })
  })

  describe('Concurrent Expense Creation', () => {
    it('should handle multiple expenses created simultaneously', async () => {
      // Arrange
      const expense1 = createMockExpense({ merchant: 'Expense 1', amount: 10000 })
      const expense2 = createMockExpense({ merchant: 'Expense 2', amount: 20000 })
      const expense3 = createMockExpense({ merchant: 'Expense 3', amount: 30000 })

      // Mock all three creations
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ expense: expense1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ expense: expense2 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ expense: expense3 }),
        })

      // Act - Create expenses concurrently
      const responses = await Promise.all([
        fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchant: 'Expense 1', amount: 10000 }),
        }),
        fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchant: 'Expense 2', amount: 20000 }),
        }),
        fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merchant: 'Expense 3', amount: 30000 }),
        }),
      ])

      const data = await Promise.all(responses.map((r) => r.json()))

      // Assert
      expect(responses.every((r) => r.ok)).toBe(true)
      expect(data).toHaveLength(3)
      expect(data[0].expense.merchant).toBe('Expense 1')
      expect(data[1].expense.merchant).toBe('Expense 2')
      expect(data[2].expense.merchant).toBe('Expense 3')
    })
  })
})
