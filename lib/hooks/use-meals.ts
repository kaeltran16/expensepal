'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Meal } from '../supabase'
import { queryKeys, type MealFilters } from './query-keys'

// Re-export Meal type for use in components
export type { Meal }

// Meal insert type for creating new meals
export interface MealInsert {
  name: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  meal_time: string
  meal_date: string
  source?: 'manual' | 'llm' | 'usda' | 'saved' | 'email'
  confidence?: 'high' | 'medium' | 'low' | null
  expense_id?: string | null
  notes?: string | null
  llm_reasoning?: string | null
  estimate?: boolean // If true, use LLM to estimate calories
  portionSize?: string // For LLM estimation context
}

export interface CalorieStats {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  mealCount: number
  averageCaloriesPerDay: number
  byMealTime: {
    breakfast: { count: number; calories: number }
    lunch: { count: number; calories: number }
    dinner: { count: number; calories: number }
    snack: { count: number; calories: number }
    other: { count: number; calories: number }
  }
  byDate: Record<string, { calories: number; protein: number; carbs: number; fat: number; meals: number }>
}

export interface CalorieGoal {
  daily_calories: number
  protein_target?: number
  carbs_target?: number
  fat_target?: number
}

/**
 * Fetch meals with optional filters
 */
async function fetchMeals(filters?: MealFilters): Promise<Meal[]> {
  const params = new URLSearchParams()

  if (filters?.limit) params.append('limit', filters.limit.toString())
  if (filters?.offset) params.append('offset', filters.offset.toString())
  if (filters?.startDate) params.append('startDate', filters.startDate)
  if (filters?.endDate) params.append('endDate', filters.endDate)
  if (filters?.mealTime) params.append('mealTime', filters.mealTime)

  const response = await fetch(`/api/meals?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch meals')
  }

  const data = await response.json()
  return data.meals || []
}

/**
 * Hook to fetch meals with optional filters
 */
export function useMeals(
  filters?: MealFilters,
  options?: {
    enabled?: boolean
    refetchInterval?: number
  }
) {
  return useQuery({
    queryKey: queryKeys.meals.list(filters),
    queryFn: () => fetchMeals(filters),
    // Cache for 12 hours - meals rarely change
    staleTime: 12 * 60 * 60 * 1000,
    // Keep previous data while fetching new data (prevents loading flicker)
    placeholderData: (previousData) => previousData,
    ...options,
  })
}

/**
 * Fetch calorie stats
 */
async function fetchCalorieStats(filters?: MealFilters): Promise<CalorieStats> {
  const params = new URLSearchParams()

  if (filters?.startDate) params.append('startDate', filters.startDate)
  if (filters?.endDate) params.append('endDate', filters.endDate)
  
  // Pass local timezone offset in minutes
  params.append('timezoneOffset', new Date().getTimezoneOffset().toString())

  const response = await fetch(`/api/calorie-stats?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch calorie stats')
  }

  return response.json()
}

/**
 * Hook to fetch calorie stats
 */
export function useCalorieStats(
  filters?: MealFilters,
  options?: {
    enabled?: boolean
    refetchInterval?: number
    refetchOnWindowFocus?: boolean
    refetchOnMount?: boolean
    staleTime?: number
  }
) {
  return useQuery({
    queryKey: queryKeys.calorieStats.summary(filters),
    queryFn: () => fetchCalorieStats(filters),
    // Cache for 12 hours - stats only change when meals are added/removed
    staleTime: 12 * 60 * 60 * 1000,
    // Keep previous data while fetching (prevents loading flicker)
    placeholderData: (previousData) => previousData,
    // Still refetch in background on mount to ensure eventual consistency
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    ...options,
  })
}

/**
 * Create meal mutation
 */
async function createMeal(meal: MealInsert): Promise<Meal> {
  const response = await fetch('/api/meals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(meal),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create meal')
  }

  return response.json()
}

/**
 * Hook with optimistic update for creating meals
 */
export function useCreateMealOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createMeal,
    onMutate: async (newMeal) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.meals.all })

      // Snapshot previous value
      const previousMeals = queryClient.getQueryData(queryKeys.meals.lists())

      // Create optimistic meal with temporary ID
      const optimisticMeal: Meal = {
        id: `temp-${Date.now()}`,
        name: newMeal.name,
        calories: newMeal.calories || 0, // Will be estimated by AI
        protein: newMeal.protein || 0,
        carbs: newMeal.carbs || 0,
        fat: newMeal.fat || 0,
        meal_time: newMeal.meal_time as 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other',
        meal_date: newMeal.meal_date,
        source: newMeal.source || 'manual',
        confidence: null,
        expense_id: null,
        llm_reasoning: null,
        notes: newMeal.notes || null,
        user_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Optimistically update all meal lists
      queryClient.setQueriesData({ queryKey: queryKeys.meals.lists() }, (old: Meal[] | undefined) => {
        if (!old) return [optimisticMeal]
        return [optimisticMeal, ...old]
      })

      return { previousMeals }
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousMeals) {
        queryClient.setQueryData(queryKeys.meals.lists(), context.previousMeals)
      }
      toast.error(error.message || 'Failed to log meal')
    },
    onSuccess: (data) => {
      toast.success('Meal logged!', {
        description: `${data.calories} cal • ${data.protein}g protein`,
      })
    },
    onSettled: async () => {
      // Always refetch after error or success to sync with server (gets actual AI estimates)
      console.log('🔄 Invalidating queries after meal creation...')

      // Invalidate and refetch all related queries
      await queryClient.invalidateQueries({
        queryKey: queryKeys.meals.all,
        refetchType: 'all'
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calorieStats.all,
        refetchType: 'all'
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calorieGoal.all,
        refetchType: 'all'
      })

      console.log('✅ Queries invalidated successfully')

      // Also force refetch calorie stats to ensure immediate update
      await queryClient.refetchQueries({
        queryKey: queryKeys.calorieStats.all,
        type: 'all'
      })

      console.log('✅ Calorie stats refetched')
    },
  })
}

/**
 * Delete meal mutation
 */
async function deleteMeal(id: string): Promise<void> {
  const response = await fetch(`/api/meals/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete meal')
  }
}

/**
 * Hook with optimistic update for deleting meals
 */
export function useDeleteMealOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteMeal,
    onMutate: async (mealId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.meals.all })

      // Snapshot previous value
      const previousMeals = queryClient.getQueryData(queryKeys.meals.lists())

      // Optimistically update all meal lists
      queryClient.setQueriesData({ queryKey: queryKeys.meals.lists() }, (old: Meal[] | undefined) => {
        if (!old) return []
        return old.filter((meal) => meal.id !== mealId)
      })

      return { previousMeals }
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousMeals) {
        queryClient.setQueryData(queryKeys.meals.lists(), context.previousMeals)
      }
      toast.error('Failed to delete meal')
    },
    onSuccess: () => {
      toast.success('Meal deleted')
    },
    onSettled: async () => {
      // Always refetch after error or success
      await queryClient.invalidateQueries({
        queryKey: queryKeys.meals.all,
        refetchType: 'all'
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calorieStats.all,
        refetchType: 'all'
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calorieGoal.all,
        refetchType: 'all'
      })

      // Force refetch calorie stats
      await queryClient.refetchQueries({
        queryKey: queryKeys.calorieStats.all,
        type: 'all'
      })
    },
  })
}

/**
 * Fetch calorie goal
 */
async function fetchCalorieGoal(): Promise<CalorieGoal | null> {
  const response = await fetch('/api/calorie-goals')

  // Handle auth errors gracefully
  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error('Failed to fetch calorie goal')
  }

  return response.json()
}

/**
 * Hook to fetch calorie goal
 */
export function useCalorieGoal() {
  return useQuery({
    queryKey: queryKeys.calorieGoal.detail(),
    queryFn: fetchCalorieGoal,
    // Goals rarely change - cache for 12 hours
    staleTime: 12 * 60 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Update calorie goal mutation
 */
async function updateCalorieGoal(goal: Partial<CalorieGoal>): Promise<CalorieGoal> {
  const response = await fetch('/api/calorie-goals', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goal),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update calorie goal')
  }

  return response.json()
}

/**
 * Hook to update calorie goal
 */
export function useUpdateCalorieGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateCalorieGoal,
    onSuccess: () => {
      toast.success('Goals updated successfully!')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update goals')
    },
    onSettled: async () => {
      // Invalidate calorie goal queries
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calorieGoal.all,
        refetchType: 'all'
      })
    },
  })
}

/**
 * Hook with optimistic update for calorie goal
 */
export function useUpdateCalorieGoalOptimistic() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateCalorieGoal,
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.calorieGoal.all })

      const previousGoal = queryClient.getQueryData<CalorieGoal | null>(
        queryKeys.calorieGoal.detail()
      )

      if (previousGoal) {
        queryClient.setQueryData<CalorieGoal>(
          queryKeys.calorieGoal.detail(),
          { ...previousGoal, ...updates }
        )
      } else {
        queryClient.setQueryData<CalorieGoal>(
          queryKeys.calorieGoal.detail(),
          {
            daily_calories: updates.daily_calories || 2000,
            protein_target: updates.protein_target,
            carbs_target: updates.carbs_target,
            fat_target: updates.fat_target,
          }
        )
      }

      return { previousGoal }
    },
    onError: (error, _, context) => {
      if (context?.previousGoal !== undefined) {
        queryClient.setQueryData(queryKeys.calorieGoal.detail(), context.previousGoal)
      }
      toast.error(error.message || 'Failed to update goals')
    },
    onSuccess: () => {
      toast.success('Goals updated successfully!')
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.calorieGoal.all,
        refetchType: 'all',
      })
    },
  })
}
