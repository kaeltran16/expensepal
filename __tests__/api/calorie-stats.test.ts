import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Supabase
const mockMealsSelect = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'meals') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  order: mockMealsSelect,
                }),
              }),
            }),
          }),
        }
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

describe('Calorie Stats API - Timezone Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('should correctly group early morning meals (GMT+7) into the correct day', async () => {
    // Arrange
    // Meal at 1:00 AM GMT+7 on 2025-11-28
    // In UTC, this is 2025-11-27T18:00:00Z (previous day)
    const earlyMorningMeal = {
      id: 'meal-1',
      calories: 500,
      protein: 20,
      carbs: 50,
      fat: 15,
      meal_time: 'snack',
      meal_date: '2025-11-27T18:00:00+00:00', // UTC time
    }

    mockMealsSelect.mockResolvedValue({
      data: [earlyMorningMeal],
      error: null,
    })

    // Act
    // We request stats for 2025-11-28
    const request = new Request('http://localhost:3000/api/calorie-stats?startDate=2025-11-28T00:00:00%2B07:00&endDate=2025-11-28T23:59:59%2B07:00')
    const { GET } = await import('@/app/api/calorie-stats/route')
    const response = await GET(request)
    const data = await response.json()

    // Assert
    // The meal should be grouped under 2025-11-28 (local date), NOT 2025-11-27 (UTC date)
    expect(data.byDate['2025-11-28']).toBeDefined()
    expect(data.byDate['2025-11-28'].calories).toBe(500)
    expect(data.byDate['2025-11-27']).toBeUndefined()
  })

  it('should correctly group late night meals (GMT+7)', async () => {
    // Arrange
    // Meal at 11:00 PM GMT+7 on 2025-11-28
    // In UTC, this is 2025-11-28T16:00:00Z (same day)
    const lateNightMeal = {
      id: 'meal-2',
      calories: 600,
      protein: 30,
      carbs: 60,
      fat: 20,
      meal_time: 'dinner',
      meal_date: '2025-11-28T16:00:00+00:00', // UTC time
    }

    mockMealsSelect.mockResolvedValue({
      data: [lateNightMeal],
      error: null,
    })

    // Act
    const request = new Request('http://localhost:3000/api/calorie-stats?startDate=2025-11-28T00:00:00%2B07:00&endDate=2025-11-28T23:59:59%2B07:00')
    const { GET } = await import('@/app/api/calorie-stats/route')
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(data.byDate['2025-11-28']).toBeDefined()
    expect(data.byDate['2025-11-28'].calories).toBe(600)
  })
})
