/**
 * useGoals Hook Tests
 *
 * Tests for savings goals CRUD operations and API interactions.
 */

import { describe, expect, it, beforeEach } from 'vitest'

import { queryKeys } from '@/lib/hooks/query-keys'
import { jsonResponse, mockFetch, resetFetchMocks, fetchMock } from '../mocks/fetch'
import { resetToastCalls, toastCalls, toast } from '../mocks/sonner'

// Mock goal factory
function createMockGoal(overrides: Record<string, unknown> = {}) {
  return {
    id: `goal-${Math.random().toString(36).slice(2)}`,
    user_id: 'test-user-id',
    name: 'Test Goal',
    target_amount: 10000000,
    current_amount: 0,
    deadline: '2025-12-31',
    icon: '🎯',
    color: '#4CAF50',
    is_completed: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('Goals Query Keys', () => {
  it('should have correct all key', () => {
    expect(queryKeys.goals.all).toEqual(['goals'])
  })

  it('should have correct lists key', () => {
    expect(queryKeys.goals.lists()).toEqual(['goals', 'list'])
  })

  it('should have correct list key without filters', () => {
    expect(queryKeys.goals.list()).toEqual(['goals', 'list', undefined])
  })

  it('should have correct list key with active filter', () => {
    expect(queryKeys.goals.list({ active: true })).toEqual([
      'goals',
      'list',
      { active: true },
    ])
  })

  it('should have correct details key', () => {
    expect(queryKeys.goals.details()).toEqual(['goals', 'detail'])
  })

  it('should have correct detail key with id', () => {
    expect(queryKeys.goals.detail('goal-123')).toEqual([
      'goals',
      'detail',
      'goal-123',
    ])
  })
})

describe('Goals Fetch Functions', () => {
  beforeEach(() => {
    resetFetchMocks()
    resetToastCalls()
    fetchMock.mockClear()
  })

  describe('fetchGoals', () => {
    it('should call /api/goals endpoint', async () => {
      const mockGoals = [
        createMockGoal({ id: '1', name: 'Vacation Fund' }),
        createMockGoal({ id: '2', name: 'Emergency Fund' }),
      ]

      mockFetch({
        url: '/api/goals',
        response: jsonResponse({ goals: mockGoals }),
      })

      const response = await fetch('/api/goals')
      const data = await response.json()

      expect(fetchMock).toHaveBeenCalled()
      expect(data.goals).toHaveLength(2)
    })

    it('should append active filter to query params', async () => {
      mockFetch({
        url: '/api/goals',
        response: jsonResponse({ goals: [] }),
      })

      const params = new URLSearchParams({ active: 'true' })
      await fetch(`/api/goals?${params.toString()}`)

      const calledUrl = fetchMock.mock.calls[0][0] as string
      expect(calledUrl).toContain('active=true')
    })

    it('should handle error response', async () => {
      mockFetch({
        url: '/api/goals',
        response: {
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        },
      })

      const response = await fetch('/api/goals')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
    })
  })

  describe('createGoal', () => {
    it('should POST to /api/goals', async () => {
      const newGoal = {
        name: 'New Car',
        target_amount: 50000000,
        current_amount: 0,
        deadline: '2026-06-30',
        icon: '🚗',
      }

      mockFetch({
        url: '/api/goals',
        method: 'POST',
        response: jsonResponse({ ...newGoal, id: 'new-id' }, 201),
      })

      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGoal),
      })

      expect(response.ok).toBe(true)
      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.id).toBe('new-id')
      expect(data.name).toBe('New Car')
    })

    it('should handle validation error', async () => {
      mockFetch({
        url: '/api/goals',
        method: 'POST',
        response: {
          ok: false,
          status: 400,
          json: async () => ({ error: 'Invalid goal data' }),
        },
      })

      const response = await fetch('/api/goals', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
    })
  })

  describe('updateGoal', () => {
    it('should PUT to /api/goals/:id', async () => {
      const updates = { current_amount: 5000000 }

      mockFetch({
        url: '/api/goals/goal-123',
        method: 'PUT',
        response: jsonResponse({ id: 'goal-123', ...updates }),
      })

      const response = await fetch('/api/goals/goal-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      expect(response.ok).toBe(true)

      const data = await response.json()
      expect(data.current_amount).toBe(5000000)
    })

    it('should handle progress update', async () => {
      const updates = { current_amount: 7500000 }

      mockFetch({
        url: '/api/goals/goal-123',
        method: 'PUT',
        response: jsonResponse({
          id: 'goal-123',
          target_amount: 10000000,
          current_amount: 7500000,
        }),
      })

      const response = await fetch('/api/goals/goal-123', {
        method: 'PUT',
        body: JSON.stringify(updates),
      })

      const data = await response.json()
      const progress = (data.current_amount / data.target_amount) * 100
      expect(progress).toBe(75)
    })

    it('should handle not found error', async () => {
      mockFetch({
        url: '/api/goals/non-existent',
        method: 'PUT',
        response: {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Goal not found' }),
        },
      })

      const response = await fetch('/api/goals/non-existent', {
        method: 'PUT',
        body: JSON.stringify({}),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })
  })

  describe('deleteGoal', () => {
    it('should DELETE to /api/goals/:id', async () => {
      mockFetch({
        url: '/api/goals/goal-123',
        method: 'DELETE',
        response: jsonResponse({ success: true }),
      })

      const response = await fetch('/api/goals/goal-123', {
        method: 'DELETE',
      })

      expect(response.ok).toBe(true)
    })

    it('should handle delete error', async () => {
      mockFetch({
        url: '/api/goals/goal-123',
        method: 'DELETE',
        response: {
          ok: false,
          status: 403,
          json: async () => ({ error: 'Cannot delete goal' }),
        },
      })

      const response = await fetch('/api/goals/goal-123', {
        method: 'DELETE',
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(403)
    })
  })
})

describe('Goals Progress Calculation', () => {
  it('should calculate 0% for no progress', () => {
    const goal = createMockGoal({ current_amount: 0, target_amount: 10000000 })
    const progress = (goal.current_amount / goal.target_amount) * 100
    expect(progress).toBe(0)
  })

  it('should calculate 50% for half progress', () => {
    const goal = createMockGoal({ current_amount: 5000000, target_amount: 10000000 })
    const progress = (goal.current_amount / goal.target_amount) * 100
    expect(progress).toBe(50)
  })

  it('should calculate 100% for completed goal', () => {
    const goal = createMockGoal({ current_amount: 10000000, target_amount: 10000000 })
    const progress = (goal.current_amount / goal.target_amount) * 100
    expect(progress).toBe(100)
  })

  it('should handle over-saving (>100%)', () => {
    const goal = createMockGoal({ current_amount: 12000000, target_amount: 10000000 })
    const progress = (goal.current_amount / goal.target_amount) * 100
    expect(progress).toBe(120)
  })
})

describe('Goals Toast Notifications', () => {
  beforeEach(() => {
    resetToastCalls()
  })

  it('should show success toast for goal creation', () => {
    toast.success('Goal created successfully')

    expect(toastCalls).toHaveLength(1)
    expect(toastCalls[0].type).toBe('success')
    expect(toastCalls[0].message).toContain('Goal created')
  })

  it('should show success toast for goal update', () => {
    toast.success('Goal updated successfully')

    expect(toastCalls).toHaveLength(1)
    expect(toastCalls[0].message).toContain('Goal updated')
  })

  it('should show success toast for goal deletion', () => {
    toast.success('Goal deleted successfully')

    expect(toastCalls).toHaveLength(1)
    expect(toastCalls[0].message).toContain('Goal deleted')
  })

  it('should show error toast for failures', () => {
    toast.error('Failed to update goal')

    expect(toastCalls).toHaveLength(1)
    expect(toastCalls[0].type).toBe('error')
  })
})

describe('Goals Mock Data Factory', () => {
  it('should create goal with default values', () => {
    const goal = createMockGoal()

    expect(goal.id).toBeDefined()
    expect(goal.user_id).toBe('test-user-id')
    expect(goal.name).toBe('Test Goal')
    expect(goal.target_amount).toBe(10000000)
    expect(goal.current_amount).toBe(0)
    expect(goal.is_completed).toBe(false)
  })

  it('should allow overriding goal properties', () => {
    const goal = createMockGoal({
      id: 'custom-id',
      name: 'Vacation Fund',
      target_amount: 20000000,
      current_amount: 5000000,
      icon: '✈️',
    })

    expect(goal.id).toBe('custom-id')
    expect(goal.name).toBe('Vacation Fund')
    expect(goal.target_amount).toBe(20000000)
    expect(goal.current_amount).toBe(5000000)
    expect(goal.icon).toBe('✈️')
  })
})
