import { GET } from '@/app/api/calorie-stats/route'
import { supabaseAdmin } from '@/lib/supabase'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}))

// Mock server auth
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
  })),
}))

describe('GET /api/calorie-stats Timezone Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // Mock "now" to be 2023-11-29T12:00:00Z
    vi.setSystemTime(new Date('2023-11-29T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should group meals correctly with UTC+7 timezone offset', async () => {
    // Setup mock data
    // Meal at 2023-11-28T23:00:00Z
    // In UTC+7, this is 2023-11-29T06:00:00+07:00 (Next day)
    const mockMeals = [
      {
        id: '1',
        user_id: 'test-user-id',
        calories: 500,
        meal_date: '2023-11-28T23:00:00Z',
        meal_time: 'breakfast',
      },
    ]

    const fromMock = supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockMeals, error: null }),
            }),
          }),
        }),
      }),
    })

    // Request with timezoneOffset = -420 (UTC+7)
    // Note: JS getTimezoneOffset() returns -420 for UTC+7
    const req = new Request('http://localhost:3000/api/calorie-stats?timezoneOffset=-420')

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    
    // Should be grouped under 2023-11-29 because 23:00 UTC + 7h = 06:00 next day
    expect(data.byDate['2023-11-29']).toBeDefined()
    expect(data.byDate['2023-11-29'].calories).toBe(500)
    expect(data.byDate['2023-11-28']).toBeUndefined()
  })

  it('should group meals correctly with UTC-5 timezone offset', async () => {
    // Setup mock data
    // Meal at 2023-11-29T01:00:00Z
    // In UTC-5, this is 2023-11-28T20:00:00-05:00 (Previous day)
    const mockMeals = [
      {
        id: '1',
        user_id: 'test-user-id',
        calories: 500,
        meal_date: '2023-11-29T01:00:00Z',
        meal_time: 'dinner',
      },
    ]

    const fromMock = supabaseAdmin.from as unknown as ReturnType<typeof vi.fn>
    fromMock.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockMeals, error: null }),
            }),
          }),
        }),
      }),
    })

    // Request with timezoneOffset = 300 (UTC-5)
    const req = new Request('http://localhost:3000/api/calorie-stats?timezoneOffset=300')

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    
    // Should be grouped under 2023-11-28 because 01:00 UTC - 5h = 20:00 previous day
    expect(data.byDate['2023-11-28']).toBeDefined()
    expect(data.byDate['2023-11-28'].calories).toBe(500)
    expect(data.byDate['2023-11-29']).toBeUndefined()
  })
})
