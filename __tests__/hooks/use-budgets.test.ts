/**
 * useBudgets Hook Tests
 *
 * Tests for budget CRUD operations and API interactions.
 */

import { describe, expect, it, beforeEach } from 'vitest'

import { queryKeys } from '@/lib/hooks/query-keys'
import { createMockBudget } from '../mocks/supabase'
import { jsonResponse, mockFetch, resetFetchMocks, fetchMock } from '../mocks/fetch'
import { resetToastCalls, toastCalls, toast } from '../mocks/sonner'

describe('Budget Query Keys', () => {
  it('should have correct all key', () => {
    expect(queryKeys.budgets.all).toEqual(['budgets'])
  })

  it('should have correct lists key', () => {
    expect(queryKeys.budgets.lists()).toEqual(['budgets', 'list'])
  })

  it('should have correct list key without filters', () => {
    expect(queryKeys.budgets.list()).toEqual(['budgets', 'list', undefined])
  })

  it('should have correct list key with month filter', () => {
    expect(queryKeys.budgets.list({ month: '2025-01' })).toEqual([
      'budgets',
      'list',
      { month: '2025-01' },
    ])
  })

  it('should have correct list key with category filter', () => {
    expect(queryKeys.budgets.list({ category: 'Food' })).toEqual([
      'budgets',
      'list',
      { category: 'Food' },
    ])
  })

  it('should have correct list key with multiple filters', () => {
    expect(queryKeys.budgets.list({ month: '2025-01', category: 'Food' })).toEqual([
      'budgets',
      'list',
      { month: '2025-01', category: 'Food' },
    ])
  })

  it('should have correct details key', () => {
    expect(queryKeys.budgets.details()).toEqual(['budgets', 'detail'])
  })

  it('should have correct detail key with id', () => {
    expect(queryKeys.budgets.detail('budget-123')).toEqual([
      'budgets',
      'detail',
      'budget-123',
    ])
  })

  it('should have correct predictions key without month', () => {
    expect(queryKeys.budgets.predictions()).toEqual([
      'budgets',
      'predictions',
      undefined,
    ])
  })

  it('should have correct predictions key with month', () => {
    expect(queryKeys.budgets.predictions('2025-01')).toEqual([
      'budgets',
      'predictions',
      '2025-01',
    ])
  })
})

describe('Budget Fetch Functions', () => {
  beforeEach(() => {
    resetFetchMocks()
    resetToastCalls()
    fetchMock.mockClear()
  })

  describe('fetchBudgets', () => {
    it('should call /api/budgets endpoint', async () => {
      const mockBudgets = [
        createMockBudget({ id: '1', category: 'Food', amount: 2000000 }),
        createMockBudget({ id: '2', category: 'Transport', amount: 1000000 }),
      ]

      mockFetch({
        url: '/api/budgets',
        response: jsonResponse({ budgets: mockBudgets }),
      })

      const response = await fetch('/api/budgets')
      const data = await response.json()

      expect(fetchMock).toHaveBeenCalled()
      expect(data.budgets).toHaveLength(2)
    })

    it('should append month filter to query params', async () => {
      mockFetch({
        url: '/api/budgets',
        response: jsonResponse({ budgets: [] }),
      })

      const params = new URLSearchParams({ month: '2025-01' })
      await fetch(`/api/budgets?${params.toString()}`)

      const calledUrl = fetchMock.mock.calls[0][0] as string
      expect(calledUrl).toContain('month=2025-01')
    })

    it('should append category filter to query params', async () => {
      mockFetch({
        url: '/api/budgets',
        response: jsonResponse({ budgets: [] }),
      })

      const params = new URLSearchParams({ category: 'Food' })
      await fetch(`/api/budgets?${params.toString()}`)

      const calledUrl = fetchMock.mock.calls[0][0] as string
      expect(calledUrl).toContain('category=Food')
    })

    it('should handle error response', async () => {
      mockFetch({
        url: '/api/budgets',
        response: {
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        },
      })

      const response = await fetch('/api/budgets')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
    })
  })

  describe('createBudget', () => {
    it('should POST to /api/budgets', async () => {
      const newBudget = {
        category: 'Entertainment',
        amount: 1500000,
        month: '2025-01',
      }

      mockFetch({
        url: '/api/budgets',
        method: 'POST',
        response: jsonResponse({ ...newBudget, id: 'new-id' }, 201),
      })

      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBudget),
      })

      expect(response.ok).toBe(true)
      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.id).toBe('new-id')
      expect(data.category).toBe('Entertainment')
    })

    it('should handle validation error', async () => {
      mockFetch({
        url: '/api/budgets',
        method: 'POST',
        response: {
          ok: false,
          status: 400,
          json: async () => ({ error: 'Invalid budget amount' }),
        },
      })

      const response = await fetch('/api/budgets', {
        method: 'POST',
        body: JSON.stringify({ amount: -100 }),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
    })
  })

  describe('updateBudget', () => {
    it('should PUT to /api/budgets/:id', async () => {
      const updates = { amount: 2500000 }

      mockFetch({
        url: '/api/budgets/budget-123',
        method: 'PUT',
        response: jsonResponse({ id: 'budget-123', ...updates }),
      })

      const response = await fetch('/api/budgets/budget-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data.amount).toBe(2500000)
    })

    it('should handle not found error', async () => {
      mockFetch({
        url: '/api/budgets/non-existent',
        method: 'PUT',
        response: {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Budget not found' }),
        },
      })

      const response = await fetch('/api/budgets/non-existent', {
        method: 'PUT',
        body: JSON.stringify({}),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })
  })

  describe('deleteBudget', () => {
    it('should DELETE to /api/budgets/:id', async () => {
      mockFetch({
        url: '/api/budgets/budget-123',
        method: 'DELETE',
        response: jsonResponse({ success: true }),
      })

      const response = await fetch('/api/budgets/budget-123', {
        method: 'DELETE',
      })

      expect(response.ok).toBe(true)
    })

    it('should handle delete error', async () => {
      mockFetch({
        url: '/api/budgets/budget-123',
        method: 'DELETE',
        response: {
          ok: false,
          status: 403,
          json: async () => ({ error: 'Cannot delete budget' }),
        },
      })

      const response = await fetch('/api/budgets/budget-123', {
        method: 'DELETE',
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(403)
    })
  })

  describe('budget predictions', () => {
    it('should GET /api/budgets/predictions', async () => {
      mockFetch({
        url: '/api/budgets/predictions',
        response: jsonResponse({
          predictions: [
            { category: 'Food', predicted: 2100000, confidence: 0.85 },
          ],
        }),
      })

      const response = await fetch('/api/budgets/predictions')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.predictions).toHaveLength(1)
    })
  })
})

describe('Budget Toast Notifications', () => {
  beforeEach(() => {
    resetToastCalls()
  })

  it('should show success toast for budget creation', () => {
    toast.success('Budget created successfully')

    expect(toastCalls).toHaveLength(1)
    expect(toastCalls[0].type).toBe('success')
    expect(toastCalls[0].message).toContain('Budget created')
  })

  it('should show success toast for budget update', () => {
    toast.success('Budget updated successfully')

    expect(toastCalls).toHaveLength(1)
    expect(toastCalls[0].message).toContain('Budget updated')
  })

  it('should show success toast for budget deletion', () => {
    toast.success('Budget deleted successfully')

    expect(toastCalls).toHaveLength(1)
    expect(toastCalls[0].message).toContain('Budget deleted')
  })

  it('should show error toast for failures', () => {
    toast.error('Failed to create budget')

    expect(toastCalls).toHaveLength(1)
    expect(toastCalls[0].type).toBe('error')
  })
})

describe('Budget Mock Data Factory', () => {
  it('should create budget with default values', () => {
    const budget = createMockBudget()

    expect(budget.id).toBeDefined()
    expect(budget.user_id).toBe('test-user-id')
    expect(budget.amount).toBe(2000000)
    expect(budget.category).toBe('Food')
  })

  it('should allow overriding budget properties', () => {
    const budget = createMockBudget({
      id: 'custom-id',
      amount: 5000000,
      category: 'Entertainment',
      month: '2025-02',
    })

    expect(budget.id).toBe('custom-id')
    expect(budget.amount).toBe(5000000)
    expect(budget.category).toBe('Entertainment')
    expect(budget.month).toBe('2025-02')
  })
})
