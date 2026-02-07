import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock LLMService
vi.mock('@/lib/llm-service', () => ({
  llmService: {
    isConfigured: vi.fn(() => true),
    completion: vi.fn(),
    parseJSON: vi.fn(),
  },
}))

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'test-user-id' } },
      })),
    },
  })),
}))

import { llmService } from '@/lib/llm-service'

describe('POST /api/ai/parse-input', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should parse an expense input', async () => {
    const mockParsed = {
      intent: 'expense',
      confidence: 0.95,
      data: {
        amount: 45000,
        currency: 'VND',
        merchant: 'Coffee shop',
        category: 'Food',
      },
      display_text: 'Coffee shop — 45,000 VND',
    }

    vi.mocked(llmService.completion).mockResolvedValue({
      content: JSON.stringify(mockParsed),
    })
    vi.mocked(llmService.parseJSON).mockReturnValue(mockParsed)

    const { POST } = await import('@/app/api/ai/parse-input/route')
    const request = new Request('http://localhost/api/ai/parse-input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'coffee 45k' }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.intent).toBe('expense')
    expect(data.data.amount).toBe(45000)
  })

  it('should parse a meal input', async () => {
    const mockParsed = {
      intent: 'meal',
      confidence: 0.9,
      data: {
        name: 'Pho',
        meal_time: 'lunch',
        calories: 450,
      },
      display_text: 'Pho for lunch — ~450 cal',
    }

    vi.mocked(llmService.completion).mockResolvedValue({
      content: JSON.stringify(mockParsed),
    })
    vi.mocked(llmService.parseJSON).mockReturnValue(mockParsed)

    const { POST } = await import('@/app/api/ai/parse-input/route')
    const request = new Request('http://localhost/api/ai/parse-input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'had pho for lunch' }),
    })

    const response = await POST(request as any)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.intent).toBe('meal')
  })

  it('should return 400 for empty input', async () => {
    const { POST } = await import('@/app/api/ai/parse-input/route')
    const request = new Request('http://localhost/api/ai/parse-input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: '' }),
    })

    const response = await POST(request as any)
    expect(response.status).toBe(400)
  })
})
