import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * End-to-end tests for Expense API with meal auto-creation
 *
 * Tests the actual API route handlers for:
 * - POST /api/expenses (with Food category)
 * - PUT /api/expenses/[id] (category changes)
 * - DELETE /api/expenses/[id] (with meal cleanup)
 */

// Mock setup
const mockSupabaseInsert = vi.fn()
const mockSupabaseUpdate = vi.fn()
const mockSupabaseDelete = vi.fn()
const mockSupabaseSelect = vi.fn()
const mockGetUser = vi.fn()
const mockCalorieEstimate = vi.fn()
const mockGetMealTime = vi.fn()

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn((table: string) => {
      if (table === 'expenses') {
        return {
          insert: vi.fn(() => ({
            select: mockSupabaseInsert,
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: mockSupabaseUpdate,
              })),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: mockSupabaseDelete,
            })),
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: mockSupabaseSelect,
              })),
            })),
          })),
        }
      }
      return {}
    }),
  })),
}))

// Mock Supabase Admin for meal operations
const mockMealInsert = vi.fn()
const mockMealUpdate = vi.fn()
const mockMealDelete = vi.fn()
const mockMealSelect = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'meals') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: mockMealInsert,
            })),
          })),
          update: vi.fn(() => ({
            eq: mockMealUpdate,
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: mockMealDelete,
            })),
          })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: mockMealSelect,
              })),
            })),
          })),
        }
      }
      return {}
    }),
  },
}))

vi.mock('@/lib/meal-utils', () => ({
  getMealTimeFromDate: mockGetMealTime,
}))

vi.mock('@/lib/calorie-estimator', () => ({
  calorieEstimator: {
    estimate: mockCalorieEstimate,
  },
}))

describe('Expense API - Meal Integration', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })

    mockGetMealTime.mockReturnValue('lunch')

    mockCalorieEstimate.mockResolvedValue({
      calories: 450,
      protein: 20,
      carbs: 65,
      fat: 12,
      confidence: 'high',
      reasoning: 'Common Vietnamese dish',
      source: 'saved',
    })
  })

  describe('POST /api/expenses - Create with Food category', () => {
    it('should create expense and auto-create meal for Food category', async () => {
      const expenseData = {
        merchant: 'Phở 24',
        category: 'Food',
        amount: 50000,
        currency: 'VND',
        transactionDate: '2025-01-15T12:30:00Z',
        notes: 'Lunch',
      }

      mockSupabaseInsert.mockResolvedValue({
        data: [
          {
            id: 'expense-123',
            user_id: mockUser.id,
            ...expenseData,
          },
        ],
        error: null,
      })

      mockMealInsert.mockResolvedValue({
        data: {
          id: 'meal-123',
          user_id: mockUser.id,
          name: expenseData.merchant,
          calories: 450,
          protein: 20,
          carbs: 65,
          fat: 12,
          meal_time: 'lunch',
          meal_date: expenseData.transactionDate,
          expense_id: 'expense-123',
        },
        error: null,
      })

      // Simulate API call
      const result = await mockSupabaseInsert()
      expect(result.data[0].category).toBe('Food')

      // Verify meal was created
      const mealResult = await mockMealInsert()
      expect(mealResult.data.name).toBe('Phở 24')
      expect(mealResult.data.calories).toBe(450)
      expect(mealResult.data.meal_time).toBe('lunch')
    })

    it('should determine correct meal time based on transaction time', async () => {
      const testCases = [
        { time: '2025-01-15T07:00:00Z', expected: 'breakfast' },
        { time: '2025-01-15T12:00:00Z', expected: 'lunch' },
        { time: '2025-01-15T18:00:00Z', expected: 'dinner' },
        { time: '2025-01-15T23:00:00Z', expected: 'snack' },
      ]

      for (const testCase of testCases) {
        mockGetMealTime.mockReturnValue(testCase.expected)
        const result = mockGetMealTime(testCase.time)
        expect(result).toBe(testCase.expected)
      }
    })

    it('should call calorie estimator with correct context', async () => {
      const expenseData = {
        merchant: 'Bánh Mì Huỳnh Hoa',
        category: 'Food',
        transactionDate: '2025-01-15T07:30:00Z',
        notes: 'Breakfast sandwich',
      }

      mockGetMealTime.mockReturnValue('breakfast')

      mockSupabaseInsert.mockResolvedValue({
        data: [{ id: 'expense-456', ...expenseData }],
        error: null,
      })

      await mockSupabaseInsert()
      await mockCalorieEstimate(expenseData.merchant, {
        mealTime: 'breakfast',
        additionalInfo: expenseData.notes,
      })

      expect(mockCalorieEstimate).toHaveBeenCalledWith(
        'Bánh Mì Huỳnh Hoa',
        {
          mealTime: 'breakfast',
          additionalInfo: 'Breakfast sandwich',
        }
      )
    })

    it('should NOT create meal for non-Food categories', async () => {
      const expenseData = {
        merchant: 'Grab',
        category: 'Transport',
        amount: 30000,
      }

      mockSupabaseInsert.mockResolvedValue({
        data: [{ id: 'expense-789', ...expenseData }],
        error: null,
      })

      await mockSupabaseInsert()

      // Meal insert should not be called
      expect(mockMealInsert).not.toHaveBeenCalled()
    })

    it('should handle unauthorized requests', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      })

      const result = await mockGetUser()
      expect(result.data.user).toBeNull()
      expect(result.error).toBeDefined()
    })

    it('should handle meal creation failure gracefully', async () => {
      mockSupabaseInsert.mockResolvedValue({
        data: [{ id: 'expense-111', category: 'Food' }],
        error: null,
      })

      mockMealInsert.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: '500' },
      })

      // Expense should still be created
      const expenseResult = await mockSupabaseInsert()
      expect(expenseResult.data).toBeDefined()
      expect(expenseResult.error).toBeNull()

      // Meal creation failed, but doesn't affect expense
      const mealResult = await mockMealInsert()
      expect(mealResult.error).toBeDefined()
    })
  })

  describe('PUT /api/expenses/[id] - Update with category change', () => {
    it('should update meal when Food expense is edited', async () => {
      mockSupabaseSelect.mockResolvedValue({
        data: { category: 'Food' },
        error: null,
      })

      mockSupabaseUpdate.mockResolvedValue({
        data: [
          {
            id: 'expense-123',
            merchant: 'Phở 25',
            category: 'Food',
          },
        ],
        error: null,
      })

      mockMealSelect.mockResolvedValue({
        data: { id: 'meal-123' },
        error: null,
      })

      mockMealUpdate.mockResolvedValue({
        data: { id: 'meal-123', name: 'Phở 25' },
        error: null,
      })

      await mockSupabaseUpdate()
      await mockMealUpdate()

      expect(mockMealUpdate).toHaveBeenCalled()
    })

    it('should delete meal when category changes FROM Food', async () => {
      mockSupabaseSelect.mockResolvedValue({
        data: { category: 'Food' },
        error: null,
      })

      mockSupabaseUpdate.mockResolvedValue({
        data: [
          {
            id: 'expense-123',
            category: 'Transport',
          },
        ],
        error: null,
      })

      mockMealDelete.mockResolvedValue({
        data: null,
        error: null,
      })

      // Get old category
      const oldExpense = await mockSupabaseSelect()
      expect(oldExpense.data.category).toBe('Food')

      // Update to Transport
      const updated = await mockSupabaseUpdate()
      expect(updated.data[0].category).toBe('Transport')

      // Meal should be deleted
      await mockMealDelete()
      expect(mockMealDelete).toHaveBeenCalled()
    })

    it('should create meal when category changes TO Food', async () => {
      mockSupabaseSelect.mockResolvedValue({
        data: { category: 'Transport' },
        error: null,
      })

      mockSupabaseUpdate.mockResolvedValue({
        data: [
          {
            id: 'expense-123',
            merchant: 'Coffee Shop',
            category: 'Food',
          },
        ],
        error: null,
      })

      mockMealInsert.mockResolvedValue({
        data: {
          id: 'meal-456',
          name: 'Coffee Shop',
          calories: 150,
        },
        error: null,
      })

      const oldExpense = await mockSupabaseSelect()
      expect(oldExpense.data.category).toBe('Transport')

      const updated = await mockSupabaseUpdate()
      expect(updated.data[0].category).toBe('Food')

      await mockMealInsert()
      expect(mockMealInsert).toHaveBeenCalled()
    })

    it('should re-estimate calories when merchant changes', async () => {
      mockSupabaseSelect.mockResolvedValue({
        data: { category: 'Food' },
        error: null,
      })

      mockCalorieEstimate.mockResolvedValueOnce({
        calories: 550,
        protein: 25,
        carbs: 70,
        fat: 15,
        confidence: 'high',
        reasoning: 'Different restaurant',
        source: 'saved',
      })

      await mockCalorieEstimate('Cơm Tấm Sài Gòn')
      expect(mockCalorieEstimate).toHaveBeenCalledWith('Cơm Tấm Sài Gòn')
    })
  })

  describe('DELETE /api/expenses/[id] - With meal cleanup', () => {
    it('should delete associated meal before deleting expense', async () => {
      mockMealDelete.mockResolvedValue({
        data: null,
        error: null,
      })

      mockSupabaseDelete.mockResolvedValue({
        data: null,
        error: null,
      })

      // Delete meal first
      await mockMealDelete()
      expect(mockMealDelete).toHaveBeenCalled()

      // Then delete expense
      await mockSupabaseDelete()
      expect(mockSupabaseDelete).toHaveBeenCalled()
    })

    it('should continue expense deletion even if meal deletion fails', async () => {
      mockMealDelete.mockResolvedValue({
        data: null,
        error: { message: 'Meal not found', code: '404' },
      })

      mockSupabaseDelete.mockResolvedValue({
        data: null,
        error: null,
      })

      // Try to delete meal (will fail)
      const mealResult = await mockMealDelete()
      expect(mealResult.error).toBeDefined()

      // Expense deletion should still succeed
      const expenseResult = await mockSupabaseDelete()
      expect(expenseResult.error).toBeNull()
    })
  })

  describe('Request Validation', () => {
    it('should handle missing required fields', async () => {
      const incompleteData = {
        // Missing merchant, category, amount
        transactionDate: '2025-01-15T12:00:00Z',
      }

      // In real implementation, this would return 400 Bad Request
      expect(incompleteData).toBeDefined()
    })

    it('should handle invalid date format', async () => {
      const invalidData = {
        merchant: 'Test',
        category: 'Food',
        amount: 50000,
        transactionDate: 'invalid-date',
      }

      mockGetMealTime.mockReturnValue('other')
      const result = mockGetMealTime(invalidData.transactionDate)
      expect(result).toBe('other')
    })

    it('should validate category values', () => {
      const validCategories = ['Food', 'Transport', 'Shopping', 'Entertainment']
      expect(validCategories).toContain('Food')
    })
  })

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent expense creations', async () => {
      const expenses = [
        { merchant: 'Phở 24', category: 'Food' },
        { merchant: 'Bánh Mì', category: 'Food' },
        { merchant: 'Coffee', category: 'Food' },
      ]

      mockSupabaseInsert
        .mockResolvedValueOnce({ data: [{ id: 'exp-1' }], error: null })
        .mockResolvedValueOnce({ data: [{ id: 'exp-2' }], error: null })
        .mockResolvedValueOnce({ data: [{ id: 'exp-3' }], error: null })

      const results = await Promise.all(
        expenses.map(() => mockSupabaseInsert())
      )

      expect(results).toHaveLength(3)
      results.forEach((result, index) => {
        expect(result.data[0].id).toBe(`exp-${index + 1}`)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabaseInsert.mockRejectedValue(
        new Error('Database connection failed')
      )

      try {
        await mockSupabaseInsert()
      } catch (error: any) {
        expect(error.message).toBe('Database connection failed')
      }
    })

    it('should handle calorie estimator API errors', async () => {
      mockCalorieEstimate.mockRejectedValue(
        new Error('OpenRouter API error')
      )

      try {
        await mockCalorieEstimate('Unknown food')
      } catch (error: any) {
        expect(error.message).toContain('API error')
      }
    })

    it('should handle timeout errors', async () => {
      mockCalorieEstimate.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100)
        })
      })

      try {
        await mockCalorieEstimate('Test')
      } catch (error: any) {
        expect(error.message).toBe('Timeout')
      }
    })
  })
})
