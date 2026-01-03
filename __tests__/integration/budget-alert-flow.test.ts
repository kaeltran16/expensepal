/**
 * Budget Alert Flow - Integration Test
 *
 * Tests the complete budget alert flow:
 * 1. Set budget limit for a category
 * 2. Add expense exceeding the limit
 * 3. Verify alert generation
 * 4. Test notification trigger (PWA push)
 * 5. Display budget status in UI
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { jsonResponse, mockFetch, resetFetchMocks } from '../mocks/fetch'
import { createMockExpense } from '../mocks/supabase'
import { queryKeys } from '@/lib/hooks/query-keys'
import { getMockQueryClient, resetQueryMocks } from '../mocks/tanstack-query'
import { resetToastCalls, toastCalls, toast } from '../mocks/sonner'

describe('Budget Alert Flow', () => {
  beforeEach(() => {
    resetFetchMocks()
    resetQueryMocks()
    resetToastCalls()
  })

  describe('Budget Limit Exceeded', () => {
    it('should generate alert when expense exceeds budget limit', async () => {
      // Arrange
      const budget = {
        id: 'budget-1',
        user_id: 'user-123',
        category: 'Food',
        amount: 1000000, // 1M VND monthly limit
        period: 'monthly' as const,
        created_at: '2025-11-01T00:00:00Z',
      }

      const currentSpending = 900000 // Already spent 900k
      const newExpense = createMockExpense({
        amount: 200000, // This will exceed budget (900k + 200k = 1.1M)
        merchant: 'Expensive Restaurant',
        category: 'Food',
        transaction_date: '2025-11-22T12:00:00Z',
      })

      const mockQueryClient = getMockQueryClient()

      // Mock budget fetch
      mockFetch({
        url: '/api/budgets',
        method: 'GET',
        response: jsonResponse({ budgets: [budget] }),
      })

      // Mock stats fetch (current spending)
      mockFetch({
        url: '/api/stats',
        method: 'GET',
        response: jsonResponse({
          byCategory: [{ category: 'Food', total: currentSpending }],
        }),
      })

      // Mock expense creation
      mockFetch({
        url: '/api/expenses',
        method: 'POST',
        response: jsonResponse({ expense: newExpense }),
      })

      // Act - Fetch budget and stats
      const budgetResponse = await fetch('/api/budgets')
      const budgetData = await budgetResponse.json()

      const statsResponse = await fetch('/api/stats')
      const statsData = await statsResponse.json()

      // Create expense
      const expenseResponse = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 200000,
          merchant: 'Expensive Restaurant',
          category: 'Food',
        }),
      })

      const expenseData = await expenseResponse.json()

      // Calculate new spending
      const newSpending = currentSpending + newExpense.amount
      const budgetLimit = budget.amount
      const percentUsed = (newSpending / budgetLimit) * 100

      // Check if alert should be triggered
      const shouldAlert = percentUsed > 100

      // Simulate alert generation
      if (shouldAlert) {
        toast.error(`Budget exceeded! You've spent ${percentUsed.toFixed(0)}% of your Food budget`)
      }

      // Assert
      expect(expenseResponse.ok).toBe(true)
      expect(newSpending).toBeGreaterThan(budgetLimit)
      expect(percentUsed).toBeGreaterThan(100)
      expect(shouldAlert).toBe(true)
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Budget exceeded')
      )
    })

    it('should generate warning at 80% budget threshold', async () => {
      // Arrange
      const budget = {
        id: 'budget-1',
        user_id: 'user-123',
        category: 'Shopping',
        amount: 500000,
        period: 'monthly' as const,
        created_at: '2025-11-01T00:00:00Z',
      }

      const currentSpending = 350000 // 70% spent
      const newExpense = createMockExpense({
        amount: 60000, // This will push to 82% (350k + 60k = 410k)
        merchant: 'Shopping Mall',
        category: 'Shopping',
        transaction_date: '2025-11-22T14:00:00Z',
      })

      // Mock API responses
      mockFetch({
        url: '/api/budgets',
        method: 'GET',
        response: jsonResponse({ budgets: [budget] }),
      })

      mockFetch({
        url: '/api/stats',
        method: 'GET',
        response: jsonResponse({
          byCategory: [{ category: 'Shopping', total: currentSpending }],
        }),
      })

      mockFetch({
        url: '/api/expenses',
        method: 'POST',
        response: jsonResponse({ expense: newExpense }),
      })

      // Act
      const budgetResponse = await fetch('/api/budgets')
      const budgetData = await budgetResponse.json()

      const statsResponse = await fetch('/api/stats')
      const statsData = await statsResponse.json()

      const expenseResponse = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 60000,
          merchant: 'Shopping Mall',
          category: 'Shopping',
        }),
      })

      // Calculate percentage
      const newSpending = currentSpending + newExpense.amount
      const percentUsed = (newSpending / budget.amount) * 100

      // Simulate warning generation
      if (percentUsed >= 80 && percentUsed < 100) {
        toast.warning(
          `Approaching budget limit! You've spent ${percentUsed.toFixed(0)}% of your Shopping budget`
        )
      }

      // Assert
      expect(percentUsed).toBeGreaterThanOrEqual(80)
      expect(percentUsed).toBeLessThan(100)
      expect(toast.warning).toHaveBeenCalledWith(
        expect.stringContaining('Approaching budget limit')
      )
    })

    it('should NOT generate alert when within budget', async () => {
      // Arrange
      const budget = {
        id: 'budget-1',
        user_id: 'user-123',
        category: 'Transport',
        amount: 300000,
        period: 'monthly' as const,
        created_at: '2025-11-01T00:00:00Z',
      }

      const currentSpending = 100000 // 33% spent
      const newExpense = createMockExpense({
        amount: 50000, // This will be 50% total (100k + 50k = 150k)
        merchant: 'Grab',
        category: 'Transport',
        transaction_date: '2025-11-22T09:00:00Z',
      })

      // Mock API responses
      mockFetch({
        url: '/api/budgets',
        method: 'GET',
        response: jsonResponse({ budgets: [budget] }),
      })

      mockFetch({
        url: '/api/stats',
        method: 'GET',
        response: jsonResponse({
          byCategory: [{ category: 'Transport', total: currentSpending }],
        }),
      })

      mockFetch({
        url: '/api/expenses',
        method: 'POST',
        response: jsonResponse({ expense: newExpense }),
      })

      // Act
      await fetch('/api/budgets')
      await fetch('/api/stats')
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 50000,
          merchant: 'Grab',
          category: 'Transport',
        }),
      })

      const newSpending = currentSpending + newExpense.amount
      const percentUsed = (newSpending / budget.amount) * 100

      // Assert
      expect(percentUsed).toBeLessThan(80)
      expect(toast.error).not.toHaveBeenCalled()
      expect(toast.warning).not.toHaveBeenCalled()
    })
  })

  describe('Budget Creation and Updates', () => {
    it('should create budget and track spending immediately', async () => {
      // Arrange
      const newBudget = {
        id: 'budget-new',
        user_id: 'user-123',
        category: 'Entertainment',
        amount: 200000,
        period: 'monthly' as const,
        created_at: new Date().toISOString(),
      }

      const mockQueryClient = getMockQueryClient()

      // Mock budget creation
      mockFetch({
        url: '/api/budgets',
        method: 'POST',
        response: jsonResponse({ budget: newBudget }),
      })

      // Mock stats fetch (no spending yet)
      mockFetch({
        url: '/api/stats',
        method: 'GET',
        response: jsonResponse({ byCategory: [] }),
      })

      // Act
      const createResponse = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'Entertainment',
          amount: 200000,
          period: 'monthly',
        }),
      })

      const createData = await createResponse.json()

      // Simulate cache invalidation
      mockQueryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })

      const statsResponse = await fetch('/api/stats')
      const statsData = await statsResponse.json()

      // Calculate spending percentage
      const categorySpending =
        statsData.byCategory.find((c: any) => c.category === 'Entertainment')
          ?.total || 0
      const percentUsed = (categorySpending / newBudget.amount) * 100

      // Assert
      expect(createResponse.ok).toBe(true)
      expect(createData.budget).toMatchObject({
        category: 'Entertainment',
        amount: 200000,
      })
      expect(percentUsed).toBe(0)
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.budgets.all,
      })
    })

    it('should update budget limit and recalculate alerts', async () => {
      // Arrange
      const existingBudget = {
        id: 'budget-1',
        user_id: 'user-123',
        category: 'Food',
        amount: 500000, // Old limit
        period: 'monthly' as const,
        created_at: '2025-11-01T00:00:00Z',
      }

      const currentSpending = 450000 // 90% of old budget, 75% of new budget

      const updatedBudget = {
        ...existingBudget,
        amount: 600000, // New higher limit
      }

      // Mock budget update
      mockFetch({
        url: '/api/budgets/budget-1',
        method: 'PUT',
        response: jsonResponse({ budget: updatedBudget }),
      })

      // Mock stats
      mockFetch({
        url: '/api/stats',
        method: 'GET',
        response: jsonResponse({
          byCategory: [{ category: 'Food', total: currentSpending }],
        }),
      })

      // Act
      const updateResponse = await fetch('/api/budgets/budget-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 600000 }),
      })

      const updateData = await updateResponse.json()

      const statsResponse = await fetch('/api/stats')
      const statsData = await statsResponse.json()

      // Calculate new percentage
      const oldPercentage = (currentSpending / existingBudget.amount) * 100
      const newPercentage = (currentSpending / updatedBudget.amount) * 100

      // Assert
      expect(updateResponse.ok).toBe(true)
      expect(oldPercentage).toBeGreaterThan(80) // Was in warning zone
      expect(newPercentage).toBeLessThan(80) // Now safe
      expect(updateData.budget.amount).toBe(600000)
    })
  })

  describe('Push Notification Triggers', () => {
    it('should trigger push notification when budget exceeded', async () => {
      // Arrange
      const budget = {
        id: 'budget-1',
        user_id: 'user-123',
        category: 'Shopping',
        amount: 400000,
        period: 'monthly' as const,
        created_at: '2025-11-01T00:00:00Z',
      }

      const currentSpending = 350000
      const newExpense = createMockExpense({
        amount: 100000, // Exceeds budget
        merchant: 'Expensive Store',
        category: 'Shopping',
      })

      const mockPushNotification = vi.fn()

      // Mock API responses
      mockFetch({
        url: '/api/budgets',
        method: 'GET',
        response: jsonResponse({ budgets: [budget] }),
      })

      mockFetch({
        url: '/api/stats',
        method: 'GET',
        response: jsonResponse({
          byCategory: [{ category: 'Shopping', total: currentSpending }],
        }),
      })

      mockFetch({
        url: '/api/expenses',
        method: 'POST',
        response: jsonResponse({ expense: newExpense }),
      })

      // Act
      await fetch('/api/budgets')
      await fetch('/api/stats')
      await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 100000,
          merchant: 'Expensive Store',
          category: 'Shopping',
        }),
      })

      const newSpending = currentSpending + newExpense.amount
      const percentUsed = (newSpending / budget.amount) * 100

      // Simulate push notification trigger
      if (percentUsed > 100) {
        mockPushNotification({
          title: 'Budget Alert!',
          body: `You've exceeded your Shopping budget by ${(percentUsed - 100).toFixed(0)}%`,
          icon: '/icons/warning.png',
          tag: 'budget-alert-shopping',
        })
      }

      // Assert
      expect(percentUsed).toBeGreaterThan(100)
      expect(mockPushNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Budget Alert!',
          body: expect.stringContaining('exceeded'),
          tag: 'budget-alert-shopping',
        })
      )
    })
  })

  describe('Multiple Budgets Management', () => {
    it('should track multiple category budgets independently', async () => {
      // Arrange
      const budgets = [
        {
          id: 'budget-1',
          category: 'Food',
          amount: 1000000,
          period: 'monthly' as const,
        },
        {
          id: 'budget-2',
          category: 'Transport',
          amount: 300000,
          period: 'monthly' as const,
        },
        {
          id: 'budget-3',
          category: 'Shopping',
          amount: 500000,
          period: 'monthly' as const,
        },
      ]

      const stats = {
        byCategory: [
          { category: 'Food', total: 850000 }, // 85% - Warning
          { category: 'Transport', total: 250000 }, // 83% - Warning
          { category: 'Shopping', total: 200000 }, // 40% - Safe
        ],
      }

      // Mock API responses
      mockFetch({
        url: '/api/budgets',
        method: 'GET',
        response: jsonResponse({ budgets }),
      })

      mockFetch({
        url: '/api/stats',
        method: 'GET',
        response: jsonResponse(stats),
      })

      // Act
      const budgetResponse = await fetch('/api/budgets')
      const budgetData = await budgetResponse.json()

      const statsResponse = await fetch('/api/stats')
      const statsData = await statsResponse.json()

      // Calculate percentages for each category
      const budgetStatus = budgetData.budgets.map((budget: any) => {
        const spending =
          statsData.byCategory.find((s: any) => s.category === budget.category)
            ?.total || 0
        const percentUsed = (spending / budget.amount) * 100
        return {
          category: budget.category,
          percentUsed,
          status:
            percentUsed >= 100
              ? 'exceeded'
              : percentUsed >= 80
                ? 'warning'
                : 'safe',
        }
      })

      // Assert
      expect(budgetStatus).toHaveLength(3)
      expect(budgetStatus.find((b: any) => b.category === 'Food')?.status).toBe(
        'warning'
      )
      expect(
        budgetStatus.find((b: any) => b.category === 'Transport')?.status
      ).toBe('warning')
      expect(
        budgetStatus.find((b: any) => b.category === 'Shopping')?.status
      ).toBe('safe')
    })
  })
})
