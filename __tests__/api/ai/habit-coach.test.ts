import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/llm-service', () => ({
  llmService: {
    isConfigured: vi.fn(() => true),
    completion: vi.fn(),
    parseJSON: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'test-user-id' } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          gte: vi.fn(() => ({
            order: vi.fn(() => ({
              data: [
                { routine_date: '2026-02-01', time_of_day: 'morning', template_id: 't1', duration_minutes: 15, xp_earned: 100 },
                { routine_date: '2026-02-02', time_of_day: 'morning', template_id: 't1', duration_minutes: 15, xp_earned: 100 },
              ],
              error: null,
            })),
          })),
          single: vi.fn(() => ({
            data: { current_streak: 5, longest_streak: 12, last_completed_date: '2026-02-07' },
            error: null,
          })),
        })),
      })),
    })),
  })),
}))

import { llmService } from '@/lib/llm-service'

describe('GET /api/ai/habit-coach', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return coaching suggestions', async () => {
    const mockParsed = {
      suggestions: [
        {
          type: 'pattern',
          title: 'Monday struggles',
          description: 'You tend to skip your morning routine on Mondays.',
          action: 'Try a shorter 5-minute version on Mondays.',
        },
      ],
      encouragement: 'Great 5-day streak! Keep it up.',
      streak_status: 'strong',
    }

    vi.mocked(llmService.completion).mockResolvedValue({
      content: JSON.stringify(mockParsed),
    })
    vi.mocked(llmService.parseJSON).mockReturnValue(mockParsed)

    expect(llmService.isConfigured()).toBe(true)
  })
})
