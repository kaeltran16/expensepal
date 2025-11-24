import { vi } from 'vitest'

export const mockCalorieEstimator = {
  estimate: vi.fn().mockResolvedValue({
    calories: 850,
    protein: 35.5,
    carbs: 95.0,
    fat: 28.5,
    confidence: 'high',
    reasoning: 'Mock estimate for testing',
    source: 'llm',
  }),
}

// Mock the calorie estimator module
vi.mock('@/lib/calorie-estimator', () => ({
  calorieEstimator: mockCalorieEstimator,
}))
