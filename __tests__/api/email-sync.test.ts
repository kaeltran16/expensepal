import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Setup mocks
const mockExpenseInsert = vi.fn()
const mockMealInsert = vi.fn()
const mockCalorieEstimate = vi.fn()
const mockFetchUnreadExpenses = vi.fn()

// Mock modules before imports
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'expenses') {
        return {
          insert: mockExpenseInsert,
        }
      }
      if (table === 'meals') {
        return {
          insert: mockMealInsert,
        }
      }
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }
    }),
  },
}))

vi.mock('@/lib/email-service', () => ({
  getEmailServices: vi.fn(() => [{
    fetchUnreadExpenses: mockFetchUnreadExpenses,
  }]),
}))

const mockCalorieEstimateBatch = vi.fn()

vi.mock('@/lib/calorie-estimator', () => ({
  calorieEstimator: {
    estimate: mockCalorieEstimate,
    estimateBatch: mockCalorieEstimateBatch,
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
    },
  })),
}))

// Helper to create mock expenses
const createMockExpense = (overrides = {}) => ({
  transactionType: 'Purchase',
  amount: 120000,
  currency: 'VND',
  transactionDate: '2025-11-24T12:00:00+07:00',
  merchant: 'Test Merchant',
  category: 'Food',
  source: 'email',
  emailSubject: 'Test receipt',
  ...overrides,
})

describe('Email Sync - Auto-Calorie Tracking', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup default successful responses
    mockExpenseInsert.mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: 'expense-123' }],
        error: null,
      }),
    })
    
    mockMealInsert.mockReturnValue({
      data: [],
      error: null,
    })

    mockCalorieEstimate.mockResolvedValue({
      calories: 850,
      protein: 35.5,
      carbs: 95.0,
      fat: 28.5,
      confidence: 'high',
      reasoning: 'Mock estimate',
      source: 'llm',
    })

    mockCalorieEstimateBatch.mockResolvedValue([
      {
        calories: 850,
        protein: 35.5,
        carbs: 95.0,
        fat: 28.5,
        confidence: 'high',
        reasoning: 'Mock estimate 1',
        source: 'llm',
      },
      {
        calories: 600,
        protein: 25.0,
        carbs: 70.0,
        fat: 18.5,
        confidence: 'medium',
        reasoning: 'Mock estimate 2',
        source: 'llm',
      },
    ])

    mockFetchUnreadExpenses.mockResolvedValue([])
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('Food expense auto-tracking', () => {
    it('should create a meal entry when expense category is Food', async () => {
      // Arrange
      const foodExpense = createMockExpense({
        category: 'Food',
        merchant: 'Phở 24',
        amount: 85000,
      })

      mockFetchUnreadExpenses.mockResolvedValue([foodExpense])
      mockCalorieEstimateBatch.mockResolvedValue([
        {
          calories: 850,
          protein: 35.5,
          carbs: 95.0,
          fat: 28.5,
          confidence: 'high',
          reasoning: 'Mock estimate',
          source: 'llm',
        },
      ])
      mockMealInsert.mockReturnValue({
        data: [{ id: 'meal-1' }],
        error: null,
      })

      // Act
      const { POST } = await import('@/app/api/email/sync/route')
      const response = await POST()
      const data = await response.json()

      // Assert
      expect(data.newExpenses).toBe(1)
      expect(data.mealsCreated).toBe(1)
      expect(mockCalorieEstimateBatch).toHaveBeenCalledWith(
        ['Phở 24'],
        expect.objectContaining({
          additionalInfo: expect.stringContaining('Food orders'),
        })
      )
      expect(mockMealInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: 'test-user-id',
            name: 'Phở 24',
            calories: 850,
            meal_time: 'lunch',
            source: 'email',
          }),
        ])
      )
    })

    it('should NOT create a meal entry for non-Food expenses', async () => {
      // Arrange
      const transportExpense = createMockExpense({
        category: 'Transport',
        merchant: 'Grab',
        transactionType: 'GrabCar',
      })

      mockFetchUnreadExpenses.mockResolvedValue([transportExpense])

      // Act
      const { POST } = await import('@/app/api/email/sync/route')
      const response = await POST()
      const data = await response.json()

      // Assert
      expect(data.newExpenses).toBe(1)
      expect(data.mealsCreated).toBe(0)
      expect(mockCalorieEstimate).not.toHaveBeenCalled()
      expect(mockMealInsert).not.toHaveBeenCalled()
    })

    it('should NOT create meal entry for GrabFood if category is not Food', async () => {
      // Arrange
      const grabFoodExpense = createMockExpense({
        category: 'Other',
        transactionType: 'grabfood',
        merchant: 'KFC',
      })

      mockFetchUnreadExpenses.mockResolvedValue([grabFoodExpense])

      // Act
      const { POST } = await import('@/app/api/email/sync/route')
      const response = await POST()
      const data = await response.json()

      // Assert - Only Food category should create meals
      expect(data.mealsCreated).toBe(0)
      expect(mockCalorieEstimate).not.toHaveBeenCalled()
    })
  })

  describe('Meal time detection', () => {
    it('should detect breakfast (6am - 11am)', async () => {
      const breakfastExpense = createMockExpense({
        category: 'Food',
        transactionDate: '2025-11-24T08:30:00+07:00',
      })

      mockFetchUnreadExpenses.mockResolvedValue([breakfastExpense])
      mockCalorieEstimateBatch.mockResolvedValue([
        {
          calories: 400,
          protein: 15.0,
          carbs: 50.0,
          fat: 12.0,
          confidence: 'high',
          reasoning: 'Breakfast estimate',
          source: 'llm',
        },
      ])
      mockMealInsert.mockReturnValue({
        data: [{ id: 'meal-1' }],
        error: null,
      })

      const { POST } = await import('@/app/api/email/sync/route')
      await POST()

      expect(mockMealInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ meal_time: 'breakfast' })
        ])
      )
    })

    it('should detect lunch (11am - 4pm)', async () => {
      const lunchExpense = createMockExpense({
        category: 'Food',
        transactionDate: '2025-11-24T13:00:00+07:00',
      })

      mockFetchUnreadExpenses.mockResolvedValue([lunchExpense])
      mockCalorieEstimateBatch.mockResolvedValue([
        {
          calories: 650,
          protein: 30.0,
          carbs: 75.0,
          fat: 20.0,
          confidence: 'high',
          reasoning: 'Lunch estimate',
          source: 'llm',
        },
      ])
      mockMealInsert.mockReturnValue({
        data: [{ id: 'meal-1' }],
        error: null,
      })

      const { POST } = await import('@/app/api/email/sync/route')
      await POST()

      expect(mockMealInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ meal_time: 'lunch' })
        ])
      )
    })

    it('should detect dinner (4pm - 10pm)', async () => {
      const dinnerExpense = createMockExpense({
        category: 'Food',
        transactionDate: '2025-11-24T19:00:00+07:00',
      })

      mockFetchUnreadExpenses.mockResolvedValue([dinnerExpense])
      mockCalorieEstimateBatch.mockResolvedValue([
        {
          calories: 750,
          protein: 35.0,
          carbs: 80.0,
          fat: 25.0,
          confidence: 'high',
          reasoning: 'Dinner estimate',
          source: 'llm',
        },
      ])
      mockMealInsert.mockReturnValue({
        data: [{ id: 'meal-1' }],
        error: null,
      })

      const { POST } = await import('@/app/api/email/sync/route')
      await POST()

      expect(mockMealInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ meal_time: 'dinner' })
        ])
      )
    })

    it('should detect snack (late night)', async () => {
      const snackExpense = createMockExpense({
        category: 'Food',
        transactionDate: '2025-11-24T23:00:00+07:00',
      })

      mockFetchUnreadExpenses.mockResolvedValue([snackExpense])
      mockCalorieEstimateBatch.mockResolvedValue([
        {
          calories: 250,
          protein: 8.0,
          carbs: 30.0,
          fat: 10.0,
          confidence: 'medium',
          reasoning: 'Snack estimate',
          source: 'llm',
        },
      ])
      mockMealInsert.mockReturnValue({
        data: [{ id: 'meal-1' }],
        error: null,
      })

      const { POST } = await import('@/app/api/email/sync/route')
      await POST()

      expect(mockMealInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ meal_time: 'snack' })
        ])
      )
    })
  })

  describe('Error handling', () => {
    it('should continue syncing even if calorie estimation fails', async () => {
      const foodExpense = createMockExpense({ category: 'Food' })
      mockFetchUnreadExpenses.mockResolvedValue([foodExpense])
      mockCalorieEstimate.mockRejectedValue(new Error('API error'))

      const { POST } = await import('@/app/api/email/sync/route')
      const response = await POST()
      const data = await response.json()

      expect(data.newExpenses).toBe(1)
      expect(data.mealsCreated).toBe(0)
      expect(response.status).toBe(200)
    })

    it('should continue syncing even if meal insert fails', async () => {
      const foodExpense = createMockExpense({ category: 'Food' })
      mockFetchUnreadExpenses.mockResolvedValue([foodExpense])
      mockMealInsert.mockReturnValue({
        error: { message: 'Database error' },
      })

      const { POST } = await import('@/app/api/email/sync/route')
      const response = await POST()
      const data = await response.json()

      expect(data.newExpenses).toBe(1)
      expect(data.mealsCreated).toBe(0)
      expect(response.status).toBe(200)
    })
  })

  describe('Multiple expenses', () => {
    it('should create meals for all Food expenses', async () => {
      const expenses = [
        createMockExpense({ category: 'Food', merchant: 'Restaurant A' }),
        createMockExpense({ category: 'Food', merchant: 'Restaurant B' }),
        createMockExpense({ category: 'Transport', merchant: 'Grab' }),
      ]

      mockFetchUnreadExpenses.mockResolvedValue(expenses)
      mockCalorieEstimateBatch.mockResolvedValue([
        {
          calories: 750,
          protein: 30.0,
          carbs: 80.0,
          fat: 25.0,
          confidence: 'high',
          reasoning: 'Restaurant A estimate',
          source: 'llm',
        },
        {
          calories: 600,
          protein: 25.0,
          carbs: 70.0,
          fat: 18.5,
          confidence: 'medium',
          reasoning: 'Restaurant B estimate',
          source: 'llm',
        },
      ])
      mockMealInsert.mockReturnValue({
        data: [{ id: 'meal-1' }, { id: 'meal-2' }],
        error: null,
      })

      const { POST } = await import('@/app/api/email/sync/route')
      const response = await POST()
      const data = await response.json()

      expect(data.newExpenses).toBe(3)
      expect(data.mealsCreated).toBe(2)
      expect(mockCalorieEstimate).not.toHaveBeenCalled()
      expect(mockCalorieEstimateBatch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Batch meal estimation', () => {
    it('should use batch estimation for multiple Food expenses (single LLM call)', async () => {
      // Arrange
      const foodExpenses = [
        createMockExpense({
          category: 'Food',
          merchant: 'KFC',
          transactionDate: '2025-11-24T12:00:00+07:00',
        }),
        createMockExpense({
          category: 'Food',
          merchant: 'Starbucks',
          transactionDate: '2025-11-24T14:30:00+07:00',
        }),
        createMockExpense({
          category: 'Food',
          merchant: 'Phở 24',
          transactionDate: '2025-11-24T18:00:00+07:00',
        }),
      ]

      mockFetchUnreadExpenses.mockResolvedValue(foodExpenses)
      mockCalorieEstimateBatch.mockResolvedValue([
        {
          calories: 950,
          protein: 40.0,
          carbs: 100.0,
          fat: 35.0,
          confidence: 'high',
          reasoning: 'KFC fried chicken meal',
          source: 'llm',
        },
        {
          calories: 400,
          protein: 10.0,
          carbs: 60.0,
          fat: 15.0,
          confidence: 'medium',
          reasoning: 'Starbucks latte and pastry',
          source: 'llm',
        },
        {
          calories: 450,
          protein: 25.0,
          carbs: 65.0,
          fat: 8.0,
          confidence: 'high',
          reasoning: 'Vietnamese pho bowl',
          source: 'llm',
        },
      ])
      mockMealInsert.mockReturnValue({
        data: [{ id: 'meal-1' }, { id: 'meal-2' }, { id: 'meal-3' }],
        error: null,
      })

      // Act
      const { POST } = await import('@/app/api/email/sync/route')
      const response = await POST()
      const data = await response.json()

      // Assert - Should make ONLY ONE batch call instead of 3 individual calls
      expect(data.newExpenses).toBe(3)
      expect(data.mealsCreated).toBe(3)
      expect(mockCalorieEstimate).not.toHaveBeenCalled()
      expect(mockCalorieEstimateBatch).toHaveBeenCalledTimes(1)
      expect(mockCalorieEstimateBatch).toHaveBeenCalledWith(
        ['KFC', 'Starbucks', 'Phở 24'],
        expect.objectContaining({
          additionalInfo: expect.stringContaining('Food orders'),
        })
      )

      // Verify batch insert was called with all meals at once
      expect(mockMealInsert).toHaveBeenCalledTimes(1)
      expect(mockMealInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'KFC',
            calories: 950,
            meal_time: 'lunch',
          }),
          expect.objectContaining({
            name: 'Starbucks',
            calories: 400,
            meal_time: 'lunch',
          }),
          expect.objectContaining({
            name: 'Phở 24',
            calories: 450,
            meal_time: 'dinner',
          }),
        ])
      )
    })

    it('should handle batch estimation failure gracefully', async () => {
      // Arrange
      const foodExpenses = [
        createMockExpense({ category: 'Food', merchant: 'Restaurant A' }),
        createMockExpense({ category: 'Food', merchant: 'Restaurant B' }),
      ]

      mockFetchUnreadExpenses.mockResolvedValue(foodExpenses)
      mockCalorieEstimateBatch.mockRejectedValue(new Error('LLM API rate limit'))

      // Act
      const { POST } = await import('@/app/api/email/sync/route')
      const response = await POST()
      const data = await response.json()

      // Assert - Should still insert expenses, just fail meal creation
      expect(data.newExpenses).toBe(2)
      expect(data.mealsCreated).toBe(0)
      expect(response.status).toBe(200)
      expect(mockMealInsert).not.toHaveBeenCalled()
    })

    it('should use single call for 1 Food expense, batch for multiple', async () => {
      // Single food expense
      const singleExpense = [
        createMockExpense({ category: 'Food', merchant: 'Single Restaurant' }),
      ]

      mockFetchUnreadExpenses.mockResolvedValue(singleExpense)
      mockCalorieEstimateBatch.mockResolvedValue([
        {
          calories: 500,
          protein: 20.0,
          carbs: 60.0,
          fat: 15.0,
          confidence: 'high',
          reasoning: 'Single meal',
          source: 'llm',
        },
      ])
      mockMealInsert.mockReturnValue({
        data: [{ id: 'meal-1' }],
        error: null,
      })

      const { POST } = await import('@/app/api/email/sync/route')
      const response = await POST()
      const data = await response.json()

      expect(data.mealsCreated).toBe(1)
      expect(mockCalorieEstimateBatch).toHaveBeenCalledWith(
        ['Single Restaurant'],
        expect.any(Object)
      )
    })
  })
})
