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

vi.mock('@/lib/calorie-estimator', () => ({
  calorieEstimator: {
    estimate: mockCalorieEstimate,
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

      // Act
      const { POST } = await import('@/app/api/email/sync/route')
      const response = await POST()
      const data = await response.json()

      // Assert
      expect(data.newExpenses).toBe(1)
      expect(data.mealsCreated).toBe(1)
      expect(mockCalorieEstimate).toHaveBeenCalledWith(
        'Phở 24',
        expect.objectContaining({
          additionalInfo: expect.stringContaining('85000 VND'),
        })
      )
      expect(mockMealInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-id',
          name: 'Phở 24',
          calories: 850,
          meal_time: 'lunch',
          source: 'email',
        })
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

      const { POST } = await import('@/app/api/email/sync/route')
      await POST()

      expect(mockMealInsert).toHaveBeenCalledWith(
        expect.objectContaining({ meal_time: 'breakfast' })
      )
    })

    it('should detect lunch (11am - 4pm)', async () => {
      const lunchExpense = createMockExpense({
        category: 'Food',
        transactionDate: '2025-11-24T13:00:00+07:00',
      })

      mockFetchUnreadExpenses.mockResolvedValue([lunchExpense])

      const { POST } = await import('@/app/api/email/sync/route')
      await POST()

      expect(mockMealInsert).toHaveBeenCalledWith(
        expect.objectContaining({ meal_time: 'lunch' })
      )
    })

    it('should detect dinner (4pm - 10pm)', async () => {
      const dinnerExpense = createMockExpense({
        category: 'Food',
        transactionDate: '2025-11-24T19:00:00+07:00',
      })

      mockFetchUnreadExpenses.mockResolvedValue([dinnerExpense])

      const { POST } = await import('@/app/api/email/sync/route')
      await POST()

      expect(mockMealInsert).toHaveBeenCalledWith(
        expect.objectContaining({ meal_time: 'dinner' })
      )
    })

    it('should detect snack (late night)', async () => {
      const snackExpense = createMockExpense({
        category: 'Food',
        transactionDate: '2025-11-24T23:00:00+07:00',
      })

      mockFetchUnreadExpenses.mockResolvedValue([snackExpense])

      const { POST } = await import('@/app/api/email/sync/route')
      await POST()

      expect(mockMealInsert).toHaveBeenCalledWith(
        expect.objectContaining({ meal_time: 'snack' })
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

      const { POST } = await import('@/app/api/email/sync/route')
      const response = await POST()
      const data = await response.json()

      expect(data.newExpenses).toBe(3)
      expect(data.mealsCreated).toBe(2)
      expect(mockCalorieEstimate).toHaveBeenCalledTimes(2)
    })
  })
})
