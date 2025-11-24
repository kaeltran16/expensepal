import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Supabase before importing calorie estimator
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockResolvedValue({ data: null }),
        limit: vi.fn().mockResolvedValue({ data: [] }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}))

// Import after mocking
import { CalorieEstimator } from '@/lib/calorie-estimator'

describe('Calorie Estimator', () => {
  let estimator: CalorieEstimator

  beforeEach(() => {
    estimator = new CalorieEstimator()
    vi.clearAllMocks()
  })

  describe('Fallback estimation', () => {
    it('should estimate phở calories', () => {
      const result = (estimator as any).fallbackEstimate('Phở bò')
      
      expect(result.calories).toBe(450)
      expect(result.confidence).toBe('low')
      expect(result.source).toBe('llm')
    })

    it('should estimate bánh mì calories', () => {
      const result = (estimator as any).fallbackEstimate('Bánh mì thịt')
      
      expect(result.calories).toBe(400)
      expect(result.confidence).toBe('low')
    })

    it('should estimate rice dish calories', () => {
      const result = (estimator as any).fallbackEstimate('Cơm tấm')
      
      expect(result.calories).toBe(550)
    })

    it('should estimate coffee calories', () => {
      const result = (estimator as any).fallbackEstimate('Cà phê sữa')
      
      expect(result.calories).toBe(150)
    })

    it('should provide default calories for unknown food', () => {
      const result = (estimator as any).fallbackEstimate('Unknown dish')
      
      expect(result.calories).toBe(400) // Default
      expect(result.confidence).toBe('low')
    })

    it('should calculate macros proportionally', () => {
      const result = (estimator as any).fallbackEstimate('Test food')
      
      // Verify macros are reasonable (allowing for rounding)
      const totalCalories = (result.protein * 4) + (result.carbs * 4) + (result.fat * 9)
      // Allow up to 10 calories difference due to rounding
      expect(Math.abs(totalCalories - result.calories)).toBeLessThan(10)
    })

    it('should be case insensitive', () => {
      const result1 = (estimator as any).fallbackEstimate('PHO BO')
      const result2 = (estimator as any).fallbackEstimate('pho bo')
      
      expect(result1.calories).toBe(result2.calories)
    })
  })

  describe('Response parsing', () => {
    it('should parse valid JSON response', () => {
      const content = JSON.stringify({
        calories: 750,
        protein: 30.0,
        carbs: 85.0,
        fat: 25.0,
        confidence: 'medium',
        reasoning: 'Typical Vietnamese meal'
      })

      const result = (estimator as any).parseResponse(content)

      expect(result.calories).toBe(750)
      expect(result.protein).toBe(30.0)
      expect(result.carbs).toBe(85.0)
      expect(result.fat).toBe(25.0)
      expect(result.confidence).toBe('medium')
    })

    it('should parse response with markdown code blocks', () => {
      const content = '```json\n{"calories": 600, "protein": 25, "carbs": 70, "fat": 20, "confidence": "high", "reasoning": "Test"}\n```'

      const result = (estimator as any).parseResponse(content)

      expect(result.calories).toBe(600)
      expect(result.protein).toBe(25)
    })

    it('should round calories to integer', () => {
      const content = JSON.stringify({
        calories: 847.6,
        protein: 35.3,
        carbs: 92.1,
        fat: 28.7,
        confidence: 'high',
        reasoning: 'Test'
      })

      const result = (estimator as any).parseResponse(content)

      expect(result.calories).toBe(848) // Rounded
      expect(result.protein).toBe(35.3) // Not rounded
    })

    it('should handle missing optional fields', () => {
      const content = JSON.stringify({
        calories: 500,
        protein: 20,
        carbs: 60,
        fat: 15
      })

      const result = (estimator as any).parseResponse(content)

      expect(result.confidence).toBe('medium') // Default
      expect(result.reasoning).toBe('LLM estimate') // Default
    })
  })
})
