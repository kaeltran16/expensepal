import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Supabase
const mockMealsSelect = vi.fn()
const mockMealsInsert = vi.fn()
const mockMealsDelete = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'meals') {
        const queryBuilder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          range: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: mockMealsInsert,
            })),
          })),
          delete: vi.fn(() => ({
            eq: mockMealsDelete,
          })),
          then: (resolve: any) => resolve(mockMealsSelect()),
        }
        return queryBuilder
      }
      return {}
    }),
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

vi.mock('@/lib/calorie-estimator', () => ({
  calorieEstimator: {
    estimate: vi.fn().mockResolvedValue({
      calories: 500,
      protein: 20,
      carbs: 50,
      fat: 20,
      confidence: 'medium',
      source: 'llm',
      reasoning: 'Mocked estimate',
    }),
  },
}))

describe('Meals API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  describe('GET /api/meals', () => {
    it('should fetch meals for a given date range', async () => {
      // Arrange
      const mockMeals = [
        { id: 'meal-1', name: 'Breakfast', calories: 400 },
        { id: 'meal-2', name: 'Lunch', calories: 600 },
      ]

      mockMealsSelect.mockResolvedValue({
        data: mockMeals,
        error: null,
      })

      // Act
      const request = new Request('http://localhost:3000/api/meals?startDate=2025-01-01T00:00:00&endDate=2025-01-01T23:59:59')
      const { GET } = await import('@/app/api/meals/route')
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.meals).toEqual(mockMeals)
      expect(mockMealsSelect).toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      mockMealsSelect.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      const request = new Request('http://localhost:3000/api/meals?startDate=2025-01-01')
      const { GET } = await import('@/app/api/meals/route')
      const response = await GET(request)
      
      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/meals', () => {
    it('should create a new meal', async () => {
      const newMeal = {
        name: 'Dinner',
        calories: 700,
        protein: 30,
        carbs: 60,
        fat: 20,
        meal_time: 'dinner',
        meal_date: '2025-01-01T19:00:00+07:00',
      }

      mockMealsInsert.mockResolvedValue({
        data: { id: 'meal-3', ...newMeal },
        error: null,
      })

      const request = new Request('http://localhost:3000/api/meals', {
        method: 'POST',
        body: JSON.stringify(newMeal),
      })

      const { POST } = await import('@/app/api/meals/route')
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('Dinner')
      expect(mockMealsInsert).toHaveBeenCalled()
    })

    it('should validate required fields', async () => {
      const invalidMeal = {
        // Missing name and calories
        meal_time: 'dinner',
      }

      const request = new Request('http://localhost:3000/api/meals', {
        method: 'POST',
        body: JSON.stringify(invalidMeal),
      })

      const { POST } = await import('@/app/api/meals/route')
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })


})
