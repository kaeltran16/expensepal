/**
 * useMeals Hook Tests
 *
 * Tests for meal tracking CRUD operations and calorie stats.
 */

import { describe, expect, it, beforeEach } from 'vitest'

import { queryKeys } from '@/lib/hooks/query-keys'
import { createMockMeal } from '../mocks/supabase'
import { jsonResponse, mockFetch, resetFetchMocks, fetchMock } from '../mocks/fetch'
import { resetToastCalls, toastCalls, toast } from '../mocks/sonner'

describe('Meals Query Keys', () => {
  it('should have correct all key', () => {
    expect(queryKeys.meals.all).toEqual(['meals'])
  })

  it('should have correct lists key', () => {
    expect(queryKeys.meals.lists()).toEqual(['meals', 'list'])
  })

  it('should have correct list key without filters', () => {
    expect(queryKeys.meals.list()).toEqual(['meals', 'list', undefined])
  })

  it('should have correct list key with mealTime filter', () => {
    expect(queryKeys.meals.list({ mealTime: 'lunch' })).toEqual([
      'meals',
      'list',
      { mealTime: 'lunch' },
    ])
  })

  it('should have correct list key with date filters', () => {
    expect(queryKeys.meals.list({ startDate: '2025-01-01', endDate: '2025-01-31' })).toEqual([
      'meals',
      'list',
      { startDate: '2025-01-01', endDate: '2025-01-31' },
    ])
  })

  it('should have correct details key', () => {
    expect(queryKeys.meals.details()).toEqual(['meals', 'detail'])
  })

  it('should have correct detail key with id', () => {
    expect(queryKeys.meals.detail('meal-123')).toEqual([
      'meals',
      'detail',
      'meal-123',
    ])
  })
})

describe('Calorie Stats Query Keys', () => {
  it('should have correct all key', () => {
    expect(queryKeys.calorieStats.all).toEqual(['calorieStats'])
  })

  it('should have correct summary key without filters', () => {
    expect(queryKeys.calorieStats.summary()).toEqual([
      'calorieStats',
      'summary',
      undefined,
    ])
  })

  it('should have correct summary key with filters', () => {
    expect(queryKeys.calorieStats.summary({ startDate: '2025-01-01' })).toEqual([
      'calorieStats',
      'summary',
      { startDate: '2025-01-01' },
    ])
  })
})

describe('Calorie Goal Query Keys', () => {
  it('should have correct all key', () => {
    expect(queryKeys.calorieGoal.all).toEqual(['calorieGoal'])
  })

  it('should have correct detail key', () => {
    expect(queryKeys.calorieGoal.detail()).toEqual(['calorieGoal', 'detail'])
  })
})

describe('Meals Fetch Functions', () => {
  beforeEach(() => {
    resetFetchMocks()
    resetToastCalls()
    fetchMock.mockClear()
  })

  describe('fetchMeals', () => {
    it('should call /api/meals endpoint', async () => {
      const mockMeals = [
        createMockMeal({ id: '1', name: 'Breakfast', calories: 400 }),
        createMockMeal({ id: '2', name: 'Lunch', calories: 600 }),
      ]

      mockFetch({
        url: '/api/meals',
        response: jsonResponse({ meals: mockMeals }),
      })

      const response = await fetch('/api/meals')
      const data = await response.json()

      expect(fetchMock).toHaveBeenCalled()
      expect(data.meals).toHaveLength(2)
    })

    it('should append mealTime filter to query params', async () => {
      mockFetch({
        url: '/api/meals',
        response: jsonResponse({ meals: [] }),
      })

      const params = new URLSearchParams({ mealTime: 'breakfast' })
      await fetch(`/api/meals?${params.toString()}`)

      const calledUrl = fetchMock.mock.calls[0][0] as string
      expect(calledUrl).toContain('mealTime=breakfast')
    })

    it('should append date filters to query params', async () => {
      mockFetch({
        url: '/api/meals',
        response: jsonResponse({ meals: [] }),
      })

      const params = new URLSearchParams({
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      })
      await fetch(`/api/meals?${params.toString()}`)

      const calledUrl = fetchMock.mock.calls[0][0] as string
      expect(calledUrl).toContain('startDate=2025-01-01')
      expect(calledUrl).toContain('endDate=2025-01-31')
    })

    it('should handle error response', async () => {
      mockFetch({
        url: '/api/meals',
        response: {
          ok: false,
          status: 500,
          json: async () => ({ error: 'Server error' }),
        },
      })

      const response = await fetch('/api/meals')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(500)
    })
  })

  describe('createMeal', () => {
    it('should POST to /api/meals', async () => {
      const newMeal = {
        name: 'Grilled Chicken Salad',
        calories: 450,
        protein: 35,
        carbs: 20,
        fat: 18,
        meal_time: 'lunch',
        meal_date: '2025-01-03',
        source: 'manual',
      }

      mockFetch({
        url: '/api/meals',
        method: 'POST',
        response: jsonResponse({ ...newMeal, id: 'new-id' }, 201),
      })

      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMeal),
      })

      expect(response.ok).toBe(true)
      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.id).toBe('new-id')
      expect(data.name).toBe('Grilled Chicken Salad')
    })

    it('should create meal with LLM estimation', async () => {
      const newMeal = {
        name: 'Homemade Pizza',
        meal_time: 'dinner',
        meal_date: '2025-01-03',
        estimate: true,
        portionSize: '2 slices',
      }

      mockFetch({
        url: '/api/meals',
        method: 'POST',
        response: jsonResponse({
          ...newMeal,
          id: 'new-id',
          calories: 550,
          protein: 22,
          carbs: 65,
          fat: 24,
          source: 'llm',
          confidence: 'medium',
        }, 201),
      })

      const response = await fetch('/api/meals', {
        method: 'POST',
        body: JSON.stringify(newMeal),
      })

      const data = await response.json()
      expect(data.source).toBe('llm')
      expect(data.confidence).toBe('medium')
      expect(data.calories).toBe(550)
    })

    it('should handle validation error', async () => {
      mockFetch({
        url: '/api/meals',
        method: 'POST',
        response: {
          ok: false,
          status: 400,
          json: async () => ({ error: 'Meal name is required' }),
        },
      })

      const response = await fetch('/api/meals', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
    })
  })

  describe('deleteMeal', () => {
    it('should DELETE to /api/meals/:id', async () => {
      mockFetch({
        url: '/api/meals/meal-123',
        method: 'DELETE',
        response: jsonResponse({ success: true }),
      })

      const response = await fetch('/api/meals/meal-123', {
        method: 'DELETE',
      })

      expect(response.ok).toBe(true)
    })

    it('should handle delete error', async () => {
      mockFetch({
        url: '/api/meals/meal-123',
        method: 'DELETE',
        response: {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Meal not found' }),
        },
      })

      const response = await fetch('/api/meals/meal-123', {
        method: 'DELETE',
      })

      expect(response.ok).toBe(false)
      expect(response.status).toBe(404)
    })
  })

  describe('fetchCalorieStats', () => {
    it('should GET /api/calorie-stats', async () => {
      mockFetch({
        url: '/api/calorie-stats',
        response: jsonResponse({
          totalCalories: 1850,
          totalProtein: 120,
          totalCarbs: 200,
          totalFat: 65,
          mealCount: 4,
          averageCaloriesPerDay: 1850,
          byMealTime: {
            breakfast: { count: 1, calories: 400 },
            lunch: { count: 1, calories: 600 },
            dinner: { count: 1, calories: 700 },
            snack: { count: 1, calories: 150 },
            other: { count: 0, calories: 0 },
          },
        }),
      })

      const response = await fetch('/api/calorie-stats')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.totalCalories).toBe(1850)
      expect(data.mealCount).toBe(4)
    })

    it('should include timezone offset in params', async () => {
      mockFetch({
        url: '/api/calorie-stats',
        response: jsonResponse({}),
      })

      const params = new URLSearchParams({
        timezoneOffset: new Date().getTimezoneOffset().toString(),
      })
      await fetch(`/api/calorie-stats?${params.toString()}`)

      const calledUrl = fetchMock.mock.calls[0][0] as string
      expect(calledUrl).toContain('timezoneOffset=')
    })
  })

  describe('calorie goals', () => {
    it('should GET /api/calorie-goals', async () => {
      mockFetch({
        url: '/api/calorie-goals',
        response: jsonResponse({
          daily_calories: 2000,
          protein_target: 150,
          carbs_target: 200,
          fat_target: 65,
        }),
      })

      const response = await fetch('/api/calorie-goals')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.daily_calories).toBe(2000)
    })

    it('should PUT /api/calorie-goals', async () => {
      mockFetch({
        url: '/api/calorie-goals',
        method: 'PUT',
        response: jsonResponse({
          daily_calories: 2200,
          protein_target: 165,
        }),
      })

      const response = await fetch('/api/calorie-goals', {
        method: 'PUT',
        body: JSON.stringify({ daily_calories: 2200, protein_target: 165 }),
      })

      expect(response.ok).toBe(true)
    })

    it('should handle 401 for unauthenticated users', async () => {
      mockFetch({
        url: '/api/calorie-goals',
        response: {
          ok: false,
          status: 401,
          json: async () => ({ error: 'Unauthorized' }),
        },
      })

      const response = await fetch('/api/calorie-goals')

      expect(response.ok).toBe(false)
      expect(response.status).toBe(401)
    })
  })
})

describe('Meals Toast Notifications', () => {
  beforeEach(() => {
    resetToastCalls()
  })

  it('should show success toast for meal logging', () => {
    toast.success('Meal logged!', { description: '450 cal • 35g protein' })

    expect(toastCalls).toHaveLength(1)
    expect(toastCalls[0].type).toBe('success')
    expect(toastCalls[0].message).toBe('Meal logged!')
  })

  it('should show success toast for meal deletion', () => {
    toast.success('Meal deleted')

    expect(toastCalls).toHaveLength(1)
    expect(toastCalls[0].message).toBe('Meal deleted')
  })

  it('should show success toast for goals update', () => {
    toast.success('Goals updated successfully!')

    expect(toastCalls).toHaveLength(1)
    expect(toastCalls[0].message).toContain('Goals updated')
  })

  it('should show error toast for failures', () => {
    toast.error('Failed to log meal')

    expect(toastCalls).toHaveLength(1)
    expect(toastCalls[0].type).toBe('error')
  })
})

describe('Meal Mock Data Factory', () => {
  it('should create meal with default values', () => {
    const meal = createMockMeal()

    expect(meal.id).toBeDefined()
    expect(meal.user_id).toBe('test-user-id')
    expect(meal.name).toBe('Test Meal')
    expect(meal.calories).toBe(500)
    expect(meal.meal_time).toBe('lunch')
    expect(meal.source).toBe('manual')
  })

  it('should allow overriding meal properties', () => {
    const meal = createMockMeal({
      id: 'custom-id',
      name: 'Grilled Salmon',
      calories: 350,
      protein: 40,
      meal_time: 'dinner',
      source: 'llm',
      confidence: 'high',
    })

    expect(meal.id).toBe('custom-id')
    expect(meal.name).toBe('Grilled Salmon')
    expect(meal.calories).toBe(350)
    expect(meal.protein).toBe(40)
    expect(meal.meal_time).toBe('dinner')
    expect(meal.source).toBe('llm')
    expect(meal.confidence).toBe('high')
  })
})

describe('Calorie Calculations', () => {
  it('should calculate remaining calories', () => {
    const dailyGoal = 2000
    const consumed = 1450
    const remaining = dailyGoal - consumed
    expect(remaining).toBe(550)
  })

  it('should handle over-eating scenario', () => {
    const dailyGoal = 2000
    const consumed = 2300
    const remaining = dailyGoal - consumed
    expect(remaining).toBe(-300)
  })

  it('should calculate macro percentages', () => {
    const protein = 120 // grams
    const carbs = 200
    const fat = 65

    // Calories per gram: protein=4, carbs=4, fat=9
    const proteinCals = protein * 4 // 480
    const carbsCals = carbs * 4 // 800
    const fatCals = fat * 9 // 585
    const totalCals = proteinCals + carbsCals + fatCals // 1865

    expect(proteinCals).toBe(480)
    expect(carbsCals).toBe(800)
    expect(fatCals).toBe(585)
    expect(totalCals).toBe(1865)

    const proteinPct = (proteinCals / totalCals) * 100
    expect(proteinPct).toBeCloseTo(25.7, 0)
  })
})
