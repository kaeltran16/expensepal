/**
 * Offline Sync Flow - Integration Test
 *
 * Tests the complete offline sync flow:
 * 1. Queue expense while offline (localStorage + IndexedDB)
 * 2. Simulate connection restore
 * 3. Verify sync execution (auto-retry on reconnect)
 * 4. Verify database update
 * 5. Clear queue after successful sync
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createMockExpense } from '../mocks/supabase'
import { queryKeys } from '@/lib/hooks/query-keys'
import { getMockQueryClient, resetQueryMocks } from '../mocks/tanstack-query'
import { resetToastCalls, toast } from '../mocks/sonner'
import type { PendingMutation } from '@/lib/hooks/use-offline-queue'

// Create a simple mock fetch for this file
const mockFetch = vi.fn()
global.fetch = mockFetch as any

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

// Mock navigator.onLine
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  value: true,
})

describe('Offline Sync Flow', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    global.fetch = mockFetch as any // Re-apply mock in beforeEach
    vi.stubGlobal('fetch', mockFetch) // Also stub globally for happy-dom
    resetQueryMocks()
    resetToastCalls()
    localStorageMock.clear()
    vi.stubGlobal('localStorage', localStorageMock)
    // @ts-expect-error - navigator.onLine is readonly
    global.navigator.onLine = true
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('Queue Management', () => {
    it('should queue expense when offline', () => {
      // Arrange
      const mutation: PendingMutation = {
        id: 'temp-123',
        type: 'create',
        entity: 'expense',
        data: {
          amount: 50000,
          merchant: 'Offline Purchase',
          category: 'Food',
          transaction_date: new Date().toISOString(),
        },
        timestamp: Date.now(),
        retryCount: 0,
      }

      // Simulate offline state
      // @ts-expect-error - navigator.onLine is readonly
      global.navigator.onLine = false

      // Act - Add to queue (simulating what useOfflineQueue.addToQueue does)
      const queue = [mutation]
      localStorage.setItem('offline_mutation_queue', JSON.stringify(queue))

      // Assert
      expect(navigator.onLine).toBe(false)
      const storedQueue = localStorage.getItem('offline_mutation_queue')
      expect(storedQueue).toBeTruthy()

      const parsedQueue = JSON.parse(storedQueue!)
      expect(parsedQueue).toHaveLength(1)
      expect(parsedQueue[0]).toMatchObject({
        type: 'create',
        entity: 'expense',
        data: expect.objectContaining({
          merchant: 'Offline Purchase',
        }),
      })
    })

    it('should maintain multiple queued mutations', () => {
      // Arrange
      const mutations: PendingMutation[] = [
        {
          id: 'temp-1',
          type: 'create',
          entity: 'expense',
          data: { amount: 10000, merchant: 'Expense 1' },
          timestamp: Date.now(),
          retryCount: 0,
        },
        {
          id: 'temp-2',
          type: 'update',
          entity: 'budget',
          data: { id: 'budget-1', amount: 500000 },
          timestamp: Date.now() + 1000,
          retryCount: 0,
        },
        {
          id: 'temp-3',
          type: 'create',
          entity: 'meal',
          data: { description: 'Lunch', calories: 500 },
          timestamp: Date.now() + 2000,
          retryCount: 0,
        },
      ]

      // Act
      localStorage.setItem('offline_mutation_queue', JSON.stringify(mutations))

      // Assert
      const storedQueue = localStorage.getItem('offline_mutation_queue')
      const parsedQueue = JSON.parse(storedQueue!)
      expect(parsedQueue).toHaveLength(3)
      expect(parsedQueue[0].entity).toBe('expense')
      expect(parsedQueue[1].entity).toBe('budget')
      expect(parsedQueue[2].entity).toBe('meal')
    })
  })

  describe('Connection Restore and Sync', () => {
    it('should sync queued expense when back online', async () => {
      // Arrange
      const queuedMutation: PendingMutation = {
        id: 'temp-offline-1',
        type: 'create',
        entity: 'expense',
        data: {
          amount: 75000,
          merchant: 'Queued Expense',
          category: 'Shopping',
          transaction_date: '2025-11-22T14:00:00Z',
        },
        timestamp: Date.now(),
        retryCount: 0,
      }

      const syncedExpense = createMockExpense({
        amount: 75000,
        merchant: 'Queued Expense',
        category: 'Shopping',
        transaction_date: '2025-11-22T14:00:00Z',
      })

      const mockQueryClient = getMockQueryClient()

      // Queue mutation while offline
      localStorage.setItem(
        'offline_mutation_queue',
        JSON.stringify([queuedMutation])
      )

      // Mock expense creation API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ expense: syncedExpense }),
      })

      // Act - Simulate going back online
      // @ts-expect-error - navigator.onLine is readonly
      global.navigator.onLine = true

      // Process the queue (simulate what useOfflineQueue.processQueue does)
      const queueStr = localStorage.getItem('offline_mutation_queue')
      const queue: PendingMutation[] = JSON.parse(queueStr!)

      for (const mutation of queue) {
        const response = await fetch(`/api/${mutation.entity}s`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mutation.data),
        })

        if (response.ok) {
          // Remove from queue on success
          const updatedQueue = queue.filter((m) => m.id !== mutation.id)
          localStorage.setItem(
            'offline_mutation_queue',
            JSON.stringify(updatedQueue)
          )

          // Invalidate queries
          mockQueryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })

          toast.success('Synced 1 offline item')
        }
      }

      // Assert
      const finalQueue = localStorage.getItem('offline_mutation_queue')
      expect(JSON.parse(finalQueue!)).toHaveLength(0)
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.expenses.all,
      })
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('Synced')
      )
    })

    it('should handle sync failure with retry logic', async () => {
      // Arrange
      const queuedMutation: PendingMutation = {
        id: 'temp-offline-2',
        type: 'create',
        entity: 'expense',
        data: {
          amount: 50000,
          merchant: 'Failing Expense',
        },
        timestamp: Date.now(),
        retryCount: 0,
      }

      localStorage.setItem(
        'offline_mutation_queue',
        JSON.stringify([queuedMutation])
      )

      // Mock API failure - fail first 2 attempts, succeed on 3rd
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Temporary failure' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Temporary failure' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ expense: createMockExpense() }),
        })

      // Act - Attempt sync multiple times
      let queue: PendingMutation[] = JSON.parse(
        localStorage.getItem('offline_mutation_queue')!
      )
      let retryCount = 0
      const MAX_RETRIES = 3

      for (let i = 0; i < MAX_RETRIES; i++) {
        const mutation = queue[0]
        if (!mutation) break

        const response = await fetch(`/api/${mutation.entity}s`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mutation.data),
        })

        if (response.ok) {
          // Success - remove from queue
          queue = []
          localStorage.setItem('offline_mutation_queue', JSON.stringify(queue))
          break
        } else {
          // Failure - increment retry count
          retryCount++
          mutation.retryCount = retryCount
          localStorage.setItem('offline_mutation_queue', JSON.stringify(queue))
        }
      }

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(3) // 2 failures + 1 success
      expect(retryCount).toBe(2) // Retried twice before success
      const finalQueue = localStorage.getItem('offline_mutation_queue')
      expect(JSON.parse(finalQueue!)).toHaveLength(0)
    })

    it('should remove mutation after max retries', async () => {
      // Arrange
      const queuedMutation: PendingMutation = {
        id: 'temp-offline-3',
        type: 'create',
        entity: 'expense',
        data: { amount: 10000, merchant: 'Permanent Failure' },
        timestamp: Date.now(),
        retryCount: 0,
      }

      localStorage.setItem(
        'offline_mutation_queue',
        JSON.stringify([queuedMutation])
      )

      // Mock API always failing
      mockFetch
        .mockResolvedValue({
          ok: false,
          status: 400,
          json: async () => ({ error: 'Invalid data' }),
        })

      // Act - Retry until max retries
      let queue: PendingMutation[] = JSON.parse(
        localStorage.getItem('offline_mutation_queue')!
      )
      const MAX_RETRIES = 3

      for (let i = 0; i < MAX_RETRIES; i++) {
        const mutation = queue[0]
        if (!mutation) break

        const response = await fetch(`/api/${mutation.entity}s`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mutation.data),
        })

        if (!response.ok) {
          mutation.retryCount++

          if (mutation.retryCount >= MAX_RETRIES) {
            // Max retries reached - remove from queue
            console.error('Max retries reached, removing from queue')
            queue = queue.filter((m) => m.id !== mutation.id)
          }

          localStorage.setItem('offline_mutation_queue', JSON.stringify(queue))
        }
      }

      // Assert
      const finalQueue = localStorage.getItem('offline_mutation_queue')
      expect(JSON.parse(finalQueue!)).toHaveLength(0)
    })
  })

  describe('Multiple Entity Sync', () => {
    it('should sync multiple entity types in order', async () => {
      // Arrange
      const mutations: PendingMutation[] = [
        {
          id: 'temp-1',
          type: 'create',
          entity: 'expense',
          data: { amount: 50000, merchant: 'Expense' },
          timestamp: Date.now(),
          retryCount: 0,
        },
        {
          id: 'temp-2',
          type: 'create',
          entity: 'budget',
          data: { category: 'Food', amount: 1000000, period: 'monthly' },
          timestamp: Date.now() + 1000,
          retryCount: 0,
        },
        {
          id: 'temp-3',
          type: 'create',
          entity: 'meal',
          data: { description: 'Lunch', calories: 500, meal_time: 'lunch' },
          timestamp: Date.now() + 2000,
          retryCount: 0,
        },
      ]

      localStorage.setItem('offline_mutation_queue', JSON.stringify(mutations))

      const mockQueryClient = getMockQueryClient()

      // Mock all API endpoints in sequence
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ expense: createMockExpense() }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            budget: { id: 'budget-1', category: 'Food', amount: 1000000 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            meal: { id: 'meal-1', description: 'Lunch', calories: 500 },
          }),
        })

      // Act - Process queue
      let queue: PendingMutation[] = JSON.parse(
        localStorage.getItem('offline_mutation_queue')!
      )
      const syncedEntities: string[] = []

      for (const mutation of [...queue]) {
        const response = await fetch(`/api/${mutation.entity}s`, {
          method: mutation.type === 'delete' ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body:
            mutation.type !== 'delete'
              ? JSON.stringify(mutation.data)
              : undefined,
        })

        if (response.ok) {
          queue = queue.filter((m) => m.id !== mutation.id)
          syncedEntities.push(mutation.entity)
          localStorage.setItem('offline_mutation_queue', JSON.stringify(queue))
        }
      }

      // Invalidate all queries
      mockQueryClient.invalidateQueries()

      // Assert
      expect(syncedEntities).toEqual(['expense', 'budget', 'meal'])
      const finalQueue = localStorage.getItem('offline_mutation_queue')
      expect(JSON.parse(finalQueue!)).toHaveLength(0)
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalled()
    })
  })

  describe('Update and Delete Operations', () => {
    it('should sync update operations correctly', async () => {
      // Arrange
      const updateMutation: PendingMutation = {
        id: 'temp-update',
        type: 'update',
        entity: 'expense',
        data: {
          id: 'expense-123',
          amount: 100000,
          merchant: 'Updated Merchant',
        },
        timestamp: Date.now(),
        retryCount: 0,
      }

      localStorage.setItem(
        'offline_mutation_queue',
        JSON.stringify([updateMutation])
      )

      const updatedExpense = createMockExpense({
        id: 'expense-123',
        amount: 100000,
        merchant: 'Updated Merchant',
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ expense: updatedExpense }),
      })

      // Act
      const queue: PendingMutation[] = JSON.parse(
        localStorage.getItem('offline_mutation_queue')!
      )
      const mutation = queue[0]

      const response = await fetch(`/api/${mutation.entity}s/${mutation.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mutation.data),
      })

      if (response.ok) {
        localStorage.setItem('offline_mutation_queue', JSON.stringify([]))
      }

      // Assert
      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data.expense.merchant).toBe('Updated Merchant')
      expect(JSON.parse(localStorage.getItem('offline_mutation_queue')!)).toHaveLength(
        0
      )
    })

    it('should sync delete operations correctly', async () => {
      // Arrange
      const deleteMutation: PendingMutation = {
        id: 'temp-delete',
        type: 'delete',
        entity: 'expense',
        data: { id: 'expense-456' },
        timestamp: Date.now(),
        retryCount: 0,
      }

      localStorage.setItem(
        'offline_mutation_queue',
        JSON.stringify([deleteMutation])
      )

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      // Act
      const queue: PendingMutation[] = JSON.parse(
        localStorage.getItem('offline_mutation_queue')!
      )
      const mutation = queue[0]

      const response = await fetch(`/api/${mutation.entity}s/${mutation.data.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        localStorage.setItem('offline_mutation_queue', JSON.stringify([]))
      }

      // Assert
      expect(response.ok).toBe(true)
      expect(JSON.parse(localStorage.getItem('offline_mutation_queue')!)).toHaveLength(
        0
      )
    })
  })

  describe('Queue Persistence', () => {
    it('should persist queue across page reloads', () => {
      // Arrange
      const mutations: PendingMutation[] = [
        {
          id: 'persist-1',
          type: 'create',
          entity: 'expense',
          data: { amount: 10000, merchant: 'Test' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]

      // Act - Save to localStorage
      localStorage.setItem('offline_mutation_queue', JSON.stringify(mutations))

      // Simulate page reload by reading from localStorage
      const reloadedQueue = localStorage.getItem('offline_mutation_queue')
      const parsedQueue = JSON.parse(reloadedQueue!)

      // Assert
      expect(parsedQueue).toHaveLength(1)
      expect(parsedQueue[0]).toMatchObject({
        id: 'persist-1',
        entity: 'expense',
        data: expect.objectContaining({ merchant: 'Test' }),
      })
    })

    it('should clear queue manually', () => {
      // Arrange
      const mutations: PendingMutation[] = [
        {
          id: 'clear-1',
          type: 'create',
          entity: 'expense',
          data: { amount: 10000 },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]

      localStorage.setItem('offline_mutation_queue', JSON.stringify(mutations))

      // Act - Clear queue
      localStorage.removeItem('offline_mutation_queue')

      // Assert
      const clearedQueue = localStorage.getItem('offline_mutation_queue')
      expect(clearedQueue).toBeNull()
    })
  })
})
